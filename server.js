let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let ethUtils = require('ethereumjs-util');
let RSA = require('./crypto/RSAencrypt.js');
let MerkleTree = require('./indexMerkleTree/MerkleTree.js');
let DB = require('./db');
let buildStage = require('./makeTree');
let faker = require('faker');
let exonerate = require('./exonerate');
let SideChain = require('./utils/SideChain');

let db;

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

var server = require('http').createServer(app);
var io = require('socket.io')(server);
let cached = [];

const privatekey = env.privateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

io.on('connection', async function (socket) {
    console.log('connected');
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
});

async function fakeRecords(numberOfData) {
    try {
        let stageHeight = await SideChain.getContractStageHeight();
        stageHeight = parseInt(stageHeight) + 1;
        let recordsLength = numberOfData;
        let records = [];

        let keys = await db.getPublicKeys();
        let userAddress = await db.getUserAddress();
        let userPublicKey = keys.userPublicKey.publickey;
        let cpsPublicKey = keys.cpsPublicKey.publickey;
        let userRecords = [];
        for (let i = 0; i < recordsLength; i++) {
            let tid = faker.random.uuid();
            let fromPrivateKey = ethUtils.sha3(faker.company.companyName()).toString('hex');
            let fromPublickey = '0x' + ethUtils.privateToPublic('0x' + fromPrivateKey).toString('hex');
            let fromAccount = '0x' + ethUtils.pubToAddress(fromPublickey).toString('hex');
        
            let toPrivateKey = ethUtils.sha3(faker.company.companyName()).toString('hex');
            let toPublickey = '0x' + ethUtils.privateToPublic('0x' + toPrivateKey).toString('hex');
            let toAccount = '0x' + ethUtils.pubToAddress(toPublickey).toString('hex');
        
            let order = {
                'tid': tid,
                'from': fromAccount,
                'to': toAccount,
                'value': faker.commerce.price(),
                'stageHeight': stageHeight
            };

            if (i == (recordsLength - 1) || 
                i == (recordsLength - 2) ||
                i == (recordsLength - 3)) {
                order = {
                    'tid': tid,
                    'from': userAddress,
                    'to': toAccount,
                    'value': faker.commerce.price(),
                    'stageHeight': stageHeight
                };
            }

            let txHash = ethUtils.sha3(tid).toString('hex');
            let stageHash = ethUtils.sha3(stageHeight.toString()).toString('hex');
            let content = Buffer.from(JSON.stringify(order)).toString('hex');

            let cipherUser = await RSA.encrypt(content, userPublicKey);
            let cipherCP = await RSA.encrypt(content, cpsPublicKey);

            let contentHash = ethUtils.sha3(cipherUser + cipherCP).toString('hex');
            let msg = txHash + stageHash + contentHash;
            let msgHash = ethUtils.sha3(msg);
            let prefix = new Buffer('\x19Ethereum Signed Message:\n');
            let ethMsgHash = ethUtils.sha3(Buffer.concat([prefix, new Buffer(String(msgHash.length)), msgHash]));
            let signature = ethUtils.ecsign(ethMsgHash, Buffer.from(privatekey, 'hex'));

            let res = {
                tid: tid,
                tidHash: '0x' + txHash,
                stageHeight: stageHeight,
                stageHash: '0x' + stageHash,
                content: content,
                contentHash: '0x' + contentHash.toString('hex'),
                digest: '0x' + msgHash.toString('hex'),
                r: '0x' + signature.r.toString('hex'),
                s: '0x' + signature.s.toString('hex'),
                v: signature.v,
            };

            if (i == (recordsLength - 1) || 
                i == (recordsLength - 2) ||
                i == (recordsLength - 3)) {
                userRecords.push(res);
            }

            records.push(res);
        }

        await db.saveTransactions(records);
        io.sockets.emit('transaction', userRecords);
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
        let tid = query.tid;

        let cachedTree = null;

        for (let key in cached) {
            let tree = cached[key];
            if (tree.stageHeight == stageHeight) {
                cachedTree = tree;
            }
        }

        if (cachedTree) {
            let slice = cachedTree.extractSlice(tid);
            let leafNodeHashSet = cachedTree.getTransactionHashSet(tid);
            
            res.send({
                slice: slice,
                leafNodeHashSet: leafNodeHashSet
            });
        } else {
            let txCiphers = await db.getStage(stageHeight);
            if (txCiphers.length > 0) {
                let height = parseInt(Math.log2(txCiphers.length)) + 1;
                let tree = new MerkleTree(height);
                tree.setStageHeight(stageHeight);

                txCiphers.forEach((tx) => {
                    tree.putTransactionInTree(tx);
                });

                let slice = tree.extractSlice(tid);
                let leafNodeHashSet = tree.getTransactionHashSet(tid);
                
                if (cached.length >= 3) {
                    cached.push(tree);
                    cached.shift();
                } else {
                    cached.push(tree);
                }
                
                res.send({
                    slice: slice,
                    leafNodeHashSet: leafNodeHashSet
                });
            } else {
                res.send({
                    slice: null,
                    leafNodeHashSet: null
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
        let stageHeight = req.body.stage_id;
        let tid = req.body.tid;
        exonerate(stageHeight, tid);
        res.send({ok: true});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.put('/finalize', async function (req, res) {
    try {
        let stageHeight = req.body.stage_id;
        let result = SideChain.finalize(stageHeight);
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

app.get('/latest/objections/count', async function (req, res) {
    try {
        let objections = SideChain.getLatestObjections();
        console.log(objections);
        res.send({objectionCount: objections.length});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/latest/stage/height', async function (req, res) {
    try {
        let height = SideChain.getLatestStageHeight();
        res.send({height: height});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/balance', async function (req, res) {
    try {
        let address = req.query.address;
        let balance = SideChain.getBalance(address);
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

app.get('/txs', async function (req, res) {
    try {
        let stageHeight = req.query.stage_id;
        console.log(stageHeight);
        let result = await db.getTransactions(stageHeight);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/latest/txs', async function (req, res) {
    try {
        let size = req.query.size;
        size = parseInt(size);
        let stageHeight = await SideChain.getLatestStageHeight();
        let result = await db.getTransactions(stageHeight, size);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/pending/stages', async function (req, res) {
    try {
        let pendingStages = await SideChain.pendingStages();
        res.send(pendingStages);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/finalized/time', async function (req, res) {
    try {
        let finalizedTime = SideChain.getFinalizedTime();
        console.log(finalizedTime);
        res.send({
            finalizedTime: finalizedTime
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/send/transactions', async function (req, res) {
    try {
        let txs = req.body;
        if (txs.length > 0) {
            // validate signatures of transactions

            // save transactions into transaction pool
            let result = await db.saveTransactions(txs);
            res.send({ok: true, result: result});
        } else {
            res.send({ok: false});
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/commit/transactions', async function (req, res) {
    try {
        let txs = await db.pendingTransactions();
        if (txs.length > 0) {
            let stageHeight = await SideChain.getContractStageHeight();
            stageHeight = parseInt(stageHeight) + 1;
            let makeTreeTime = parseInt(Date.now() / 1000);
            buildStage(makeTreeTime, stageHeight, txs).then((tree) => {
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
        let txCiphers = await db.getStage(stageHeight);
        if (txCiphers.length > 0) {
            let height = parseInt(Math.log2(txCiphers.length)) + 1;
            let tree = new MerkleTree(height);
            tree.setStageHeight(stageHeight);

            txCiphers.forEach((tx) => {
                tree.putTransactionInTree(tx);
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

app.get('/pending/transactions', async function (req, res) {
    try {
        let pendingTransactions = await SideChain.pendingTransactions();
        res.send(pendingTransactions);
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

async function connectDB() {
    let instance = await DB();
    return instance;
}

server.listen(3000, async function () {
    db = await connectDB();
    let stageHeight = await db.getOrNewStageHeight();
    console.log(stageHeight);
    console.log(privatekey);
    console.log(publickey);
    console.log(account);
    console.log('App listening on port 3000!');
});
