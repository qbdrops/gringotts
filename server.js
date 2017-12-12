let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let ethUtils = require('ethereumjs-util');
let RSA = require('./crypto/RSAencrypt.js');
let MerkleTree = require('./indexMerkleTree/MerkleTree.js');
let DB = require('./db');
let buildSideChainTree = require('./makeTree');
let faker = require('faker');
let exonerate = require('./exonerate');

let db;

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

var server = require('http').createServer(app);
var io = require('socket.io')(server);
let scid;
let cached = [];

const privatekey = env.coinbasePrivateKey;
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
        if (!scid && scid !== 0) {
            throw new Error('Block hash has not been initialized.');
        }
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
                'scid': scid
            };

            if (i == (recordsLength - 1) || 
                i == (recordsLength - 2) ||
                i == (recordsLength - 3)) {
                order = {
                    'tid': tid,
                    'from': userAddress,
                    'to': toAccount,
                    'value': faker.commerce.price(),
                    'scid': scid
                };
            }

            let txHash = ethUtils.sha3(tid).toString('hex');
            let scidHash = ethUtils.sha3(scid.toString()).toString('hex');
            let content = Buffer.from(JSON.stringify(order)).toString('hex');

            let cipherUser = await RSA.encrypt(content, userPublicKey);
            let cipherCP = await RSA.encrypt(content, cpsPublicKey);

            let contentHash = ethUtils.sha3(cipherUser + cipherCP).toString('hex');
            let msg = txHash + scidHash + contentHash;
            let msgHash = ethUtils.sha3(msg);
            let prefix = new Buffer('\x19Ethereum Signed Message:\n');
            let ethMsgHash = ethUtils.sha3(Buffer.concat([prefix, new Buffer(String(msgHash.length)), msgHash]));
            let signature = ethUtils.ecsign(ethMsgHash, Buffer.from(privatekey, 'hex'));

            let res = {
                tid: tid,
                tidHash: '0x' + txHash,
                scid: scid,
                scidHash: '0x' + scidHash,
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
        scid = await db.increaseBlockHeight();
        return scid;
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
        let scid = query.scid;
        let tid = query.tid;

        let cachedTree = null;

        for (let key in cached) {
            let tree = cached[key];
            if (tree.scid == scid) {
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
            let txCiphers = await db.getSideChainTree(scid);
            if (txCiphers.length > 0) {
                let height = parseInt(Math.log2(txCiphers.length)) + 1;
                let tree = new MerkleTree(height);
                tree.setSCID(scid);

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
        let scid = req.body.scid;
        exonerate(scid);
        res.send({ok: true});
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

app.get('/txs', async function (req, res) {
    try {
        let scid = req.query.scid;
        console.log(scid);
        let result = await db.getTransactions(scid);
        res.send(result);
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.post('/tree', async function (req, res) {
    try {
        let scid = req.body.scid;
        let makeTreeTime = parseInt(Date.now() / 1000);
        let records = await db.getTransactions(scid);
        if (records.length > 0) {
            buildSideChainTree(makeTreeTime, scid, records).then((tree) => {
                if (cached.length >= 3) {
                    cached.push(tree);
                    cached.shift();
                } else {
                    cached.push(tree);
                }
            });
        }
        res.send({ok: true});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

// Content Provider API
app.get('/tree', async function (req, res) {
    try {
        let query = req.query;
        let scid = query.scid;
        let txCiphers = await db.getSideChainTree(scid);
        if (txCiphers.length > 0) {
            let height = parseInt(Math.log2(txCiphers.length)) + 1;
            let tree = new MerkleTree(height);
            tree.setSCID(scid);

            txCiphers.forEach((tx) => {
                tree.putTransactionInTree(tx);
            });

            res.send(tree.export());
        } else {
            res.send({
                nodes: [],
                time: null,
                scid: null,
                height: null
            });
        }
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

app.get('/trees', async function (req, res) {
    try {
        let time = req.query.timeDiff;
        let trees = await db.getSideChainTrees(time);
        let allTreeLeaves = trees.map((ele) => {
            trees = [];
            return ele.tree;
        }).map(MerkleTree.import).
            reduce((cur, next) => {
                let leaves = next.getAllTransactionCiperCp();
                return cur.concat(leaves);
            }, []);

        console.log(allTreeLeaves);
        res.send({
            cipherSet: allTreeLeaves
        });
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
    scid = await db.getOrNewBlockHeight();
    console.log(scid);
    console.log(privatekey);
    console.log(publickey);
    console.log(account);
    console.log('App listening on port 3000!');
});
