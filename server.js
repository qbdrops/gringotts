let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let EthUtils = require('ethereumjs-util');
let RSA = require('./crypto/RSAencrypt.js');
let MerkleTree = require('./indexMerkleTree/MerkleTree.js');
let db = require('./db');
let buildStage = require('./makeTree');
let faker = require('faker');
let exonerate = require('./exonerate');
let Sidechain = require('./utils/Sidechain');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

var server = require('http').createServer(app);
var io = require('socket.io')(server);
let cached = [];

const privatekey = env.privateKey;
const publickey = '0x' + EthUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + EthUtils.pubToAddress(publickey).toString('hex');

io.on('connection', async function (socket) {
    console.log('connected');
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
});

async function fakeRecords(paymentSize) {
    try {
        let stageHeight = await Sidechain.getContractStageHeight();
        let nextStageHeight = parseInt(stageHeight) + 1;
        let payments = [];

        let keys = await db.getPublicKeys();
        let userAddress = await db.getUserAddress();
        let userPublicKey = keys.userPublicKey.publickey;
        let cpsPublicKey = keys.cpsPublicKey.publickey;
        let userPayments = [];
        for (let i = 0; i < paymentSize; i++) {
            let fromPrivateKey = EthUtils.sha3(faker.company.companyName()).toString('hex');
            let fromPublickey = '0x' + EthUtils.privateToPublic('0x' + fromPrivateKey).toString('hex');
            let fromAccount = '0x' + EthUtils.pubToAddress(fromPublickey).toString('hex');

            let toPrivateKey = EthUtils.sha3(faker.company.companyName()).toString('hex');
            let toPublickey = '0x' + EthUtils.privateToPublic('0x' + toPrivateKey).toString('hex');
            let toAccount = '0x' + EthUtils.pubToAddress(toPublickey).toString('hex');

            let rawPayment = {
                'from': fromAccount,
                'to': toAccount,
                'value': faker.commerce.price(),
                'stageHeight': nextStageHeight,
                'localSequenceNumber': 0,
                'data': {
                    pkUser: userPublicKey,
                    pkStakeholder: cpsPublicKey
                }
            };

            if (i == (paymentSize - 1) ||
                i == (paymentSize - 2) ||
                i == (paymentSize - 3)) {
                rawPayment = {
                    'from': userAddress,
                    'to': toAccount,
                    'value': faker.commerce.price(),
                    'stageHeight': nextStageHeight
                };
            }

            rawPayment = Buffer.from(JSON.stringify(rawPayment)).toString('hex');
            let cipherUser = await RSA.encrypt(rawPayment, userPublicKey);
            let cipherCP = await RSA.encrypt(rawPayment, cpsPublicKey);
            let paymentHash = EthUtils.sha3(cipherUser + cipherCP).toString('hex');
            let stageHash = EthUtils.sha3(nextStageHeight.toString()).toString('hex');

            let msg = stageHash + paymentHash;
            let msgHash = EthUtils.sha3(msg);
            let prefix = new Buffer('\x19Ethereum Signed Message:\n');
            let ethMsgHash = EthUtils.sha3(Buffer.concat([prefix, new Buffer(String(msgHash.length)), msgHash]));

            let signature = EthUtils.ecsign(ethMsgHash, Buffer.from(privatekey, 'hex'));

            let payment = {
                stageHeight: nextStageHeight,
                stageHash: stageHash,
                paymentHash: paymentHash,
                cipherUser: cipherUser,
                cipherCP: cipherCP,
                v: signature.v,
                r: '0x' + signature.r.toString('hex'),
                s: '0x' + signature.s.toString('hex'),
                onChain: false
            };

            if (i == (paymentSize - 1) || 
                i == (paymentSize - 2) ||
                i == (paymentSize - 3)) {
                userPayments.push(payment);
            }

            payments.push(payment);
        }

        await db.savePayments(payments);
        io.sockets.emit('payment', userPayments);
    } catch(e) {
        console.log(e);
    }
}

app.post('/fake', async function (req, res) {
    try {
        let size = req.body.size;
        fakeRecords(parseInt(size));
        res.send({ok: true});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.put('/rsa/publickey', async function (req, res) {
    try {
        let publickey = req.body.publickey;
        let command = await db.insertRSAPublickey(publickey);
        res.send({result: command.result.ok});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.put('/ecc/publickey', async function (req, res) {
    try {
        let publickey = req.body.publickey;
        let command = await db.insertECCPublickey(publickey);
        res.send({result: command.result.ok});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/slice', async function (req, res) {
    try {
        let query = req.query;
        let stageHeight = query.stage_height;
        let paymentHash = query.payment_hash;

        let cachedTree = null;

        for (let key in cached) {
            let tree = cached[key];
            if (tree.stageHeight == stageHeight) {
                cachedTree = tree;
            }
        }

        if (cachedTree) {
            let slice = cachedTree.extractSlice(paymentHash);
            let paymentHashArray = cachedTree.getPaymentHashArray(paymentHash);
            
            res.send({
                slice: slice,
                paymentHashArray: paymentHashArray
            });
        } else {
            let paymentCiphers = await db.getStage(stageHeight);
            if (paymentCiphers.length > 0) {
                let height = parseInt(Math.log2(paymentCiphers.length)) + 1;
                let tree = new MerkleTree(height);
                tree.setStageHeight(stageHeight);

                paymentCiphers.forEach((payment) => {
                    tree.putPaymentInTree(payment);
                });

                let slice = tree.extractSlice(paymentHash);
                let paymentHashArray = tree.getPaymentHashArray(paymentHash);
                
                if (cached.length >= 3) {
                    cached.push(tree);
                    cached.shift();
                } else {
                    cached.push(tree);
                }
                
                res.send({
                    slice: slice,
                    paymentHashArray: paymentHashArray
                });
            } else {
                res.send({
                    slice: null,
                    paymentHashArray: null
                });
            }
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/save/keys', async function (req, res) {
    try {
        saveKeys();
        let keys = await db.getPublicKeys();
        res.send(keys);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/exonerate', async function (req, res) {
    try {
        let stageHeight = req.body.stage_height;
        let paymentHash = req.body.payment_hash;
        exonerate(stageHeight, paymentHash);
        res.send({ok: true});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.put('/finalize', async function (req, res) {
    try {
        let stageHash = req.body.stage_hash;
        let result = Sidechain.finalize(stageHash);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.put('/cp/publickey', async function (req, res) {
    try {
        let publicCp = req.body.publicKey;
        console.log(publicCp);
        let result = await db.insertCpPublicKey(publicCp);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/contract/address/ifc', async function (req, res) {
    try {
        res.send({address: env.IFCContractAddress});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/latest/objections/count', async function (req, res) {
    try {
        let objections = Sidechain.getLatestObjections();
        console.log(objections);
        res.send({objectionCount: objections.length});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/latest/stage/height', async function (req, res) {
    try {
        let height = await Sidechain.getLatestStageHeight();
        res.send({height: height});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/balance', async function (req, res) {
    try {
        let address = req.query.address;
        let balance = Sidechain.getBalance(address);
        res.send({balance: balance});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/agent/address', async function (req, res) {
    try {
        let address = env.account;
        res.send({address: address});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/payments', async function (req, res) {
    try {
        let stageHeight = req.query.stage_id;
        console.log(stageHeight);
        let result = await db.getPayments(stageHeight);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/latest/payments', async function (req, res) {
    try {
        let size = req.query.size;
        size = parseInt(size);
        let stageHeight = await Sidechain.getLatestStageHeight();
        let result = await db.getPayments(stageHeight, size);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/pending/stages', async function (req, res) {
    try {
        let pendingStages = await Sidechain.pendingStages();
        res.send(pendingStages);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/finalized/time', async function (req, res) {
    try {
        let finalizedTime = await Sidechain.getFinalizedTime();
        console.log(finalizedTime);
        res.send({
            finalizedTime: finalizedTime
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/send/payments', async function (req, res) {
    try {
        let payments = req.body.payments;
        if (payments.length > 0) {
            // validate signatures of payments
            let validPayments = payments.filter((payment) => {
                let message = payment.stageHash + payment.paymentHash;
                let msgHash = EthUtils.sha3(message);
                let prefix = new Buffer('\x19Ethereum Signed Message:\n');
                let ethMsgHash = EthUtils.sha3(Buffer.concat([prefix, new Buffer(String(msgHash.length)), msgHash]));

                let publicKey = EthUtils.ecrecover(ethMsgHash, payment.v, payment.r, payment.s);
                let address = '0x' + EthUtils.pubToAddress(publicKey).toString('hex');

                return account == address;
            });

            let paymentCiphers = validPayments.map((paymentCipher) => {
                paymentCipher.onChain = false;
                return paymentCipher;
            });

            if (paymentCiphers.length > 0) {
                db.savePayments(paymentCiphers);
                res.send({ ok: true });
            } else {
                res.send({ ok: false });
            }
        } else {
            res.send({ ok: false });
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/commit/payments', async function (req, res) {
    try {
        let stageHeight = await Sidechain.getContractStageHeight();
        let nextStageHeight = parseInt(stageHeight) + 1;
        let nextStageHash = EthUtils.sha3(nextStageHeight.toString()).toString('hex');

        let paymentCiphers = await Sidechain.pendingPayments();
        paymentCiphers = paymentCiphers.filter((payment) => {
            return payment.stageHash == nextStageHash;
        });

        if (paymentCiphers.length > 0) {
            let makeTreeTime = parseInt(Date.now() / 1000);
            buildStage(makeTreeTime, nextStageHeight, paymentCiphers).then((tree) => {
                if (cached.length >= 3) {
                    cached.push(tree);
                    cached.shift();
                } else {
                    cached.push(tree);
                }
            });

            res.send({ok: true});
        } else {
            res.send({ok: false});
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

// Content Provider API
app.get('/stage', async function (req, res) {
    try {
        let query = req.query;
        let stageHeight = query.stage_height;
        let paymentCiphers = await db.getStage(stageHeight);
        if (paymentCiphers.length > 0) {
            let height = parseInt(Math.log2(paymentCiphers.length)) + 1;
            let tree = new MerkleTree(height);
            tree.setStageHeight(stageHeight);

            paymentCiphers.forEach((payment) => {
                tree.putPaymentInTree(payment);
            });

            res.send(tree.export());
        } else {
            res.send({
                nodes: [],
                time: null,
                stageHeight: null,
                height: null
            });
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/pending/payments', async function (req, res) {
    try {
        let pendingPayments = await Sidechain.pendingPayments();
        res.send(pendingPayments);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

let saveKeys = async function () {
    let publicUser = await RSA.readPublic('./indexMerkleTree/keypair/userPublicKey.json');
    let publicCp = await RSA.readPublic('./indexMerkleTree/keypair/cpPublicKey.json');
    let response = await db.insertPublicKeys(publicUser, publicCp);
    return response;
};

server.listen(3000, async function () {
    try {
        console.log(privatekey);
        console.log(publickey);
        console.log(account);
        console.log('App listening on port 3000!');
    } catch (e) {
        console.error(e.message);
    }
});
