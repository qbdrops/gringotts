let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let ethUtils = require('ethereumjs-util');
let RSAencrypt = require('./indexMerkleTree/RSAencrypt.js');
let MerkleTree = require('./indexMerkleTree/MerkleTree.js');
let connect = require('./db');
let buildSideChainTree = require('./makeTree');
let faker = require('faker');

let db;

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

var server = require('http').createServer(app);
var io = require('socket.io')(server);
let scid = 10000;

const privatekey = env.coinbasePrivateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

io.on('connection', async function (socket) {
    let recordsLength = 5;
    let records = [];
    for (let i = 0; i < recordsLength; i++) {
        let tid = faker.random.uuid();
        let order = {
            'tid': tid,
            'uid': faker.random.number(),
            'cp': faker.company.companyName(),
            'from': faker.date.past(),
            'to': faker.date.recent(),
            'price': faker.commerce.price(),
            'scid': scid
        };

        let txHash = ethUtils.sha3(tid).toString('hex');
        let scidHash = ethUtils.sha3(scid.toString()).toString('hex');
        let content = Buffer.from(JSON.stringify(order)).toString('hex');
        let contentHash = ethUtils.sha3(content).toString('hex');
        let msgHash = ethUtils.sha3(txHash + scidHash + contentHash);
        let prefix = new Buffer('\x19Ethereum Signed Message:\n');
        let ethMsgHash = ethUtils.sha3(Buffer.concat([prefix, new Buffer(String(msgHash.length)), msgHash]));
        let signature = ethUtils.ecsign(ethMsgHash, Buffer.from(privatekey, 'hex'));

        let res = {
            tid: tid,
            tidHash: '0x' + txHash,
            scid: scid,
            scidHash: '0x' + scidHash,
            content: content,
            contentHash: '0x' + contentHash,
            digest: '0x' + msgHash.toString('hex'),
            r: '0x' + signature.r.toString('hex'),
            s: '0x' + signature.s.toString('hex'),
            v: signature.v,
        };

        socket.emit('transaction', res);
        records.push(res);
    }

    let result = await buildSideChainTree(scid, records);
    scid++;
    console.log(result);
});

async function connectDB() {
    db = await connect();
}

function queryStringToJSON(bill) {
    var pairs = bill.split('&');

    var result = {};
    pairs.forEach(function(pair) {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1].replace(/\+/g, '%20') || '');
    });

    return JSON.parse(JSON.stringify(result));
}

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

/**
 * XPA Http Server
 * 觀影暫停或停止上傳建立一小段收費資料
 * 並回傳相關稽核資料
 */
app.post('/finish', function (req, res) {
    try {
        let message = req.body;
        let messageString = message.content;
        let messageDetail = queryStringToJSON(message.content);
        console.log(messageDetail);

        let msgHash = ethUtils.sha3(messageString);
        console.log(msgHash);
    
        let signature = ethUtils.ecsign(msgHash, Buffer.from(privatekey, 'hex'));
        console.log(signature);

        res.send({
            digest: msgHash.toString('hex'),
            r: '0x' + signature.r.toString('hex'),
            s: '0x' + signature.s.toString('hex'),
            v: signature.v,
            content: messageString,
            detail: messageDetail
        });
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

        let treeJson = await db.getSideChainTree(scid);
        let tree = await MerkleTree.import(treeJson.tree);
        let slice = tree.extractSlice(tid);
        let leafNodeHashSet = tree.getTransactionHashSet(tid);

        res.send({
            slice: slice,
            leafNodeHashSet: leafNodeHashSet
        });
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

app.post('/tree', async function (req, res) {
    try {
        let body = req.body;
        let scid = body.scid;
        let records = body.records;
        let result = await buildSideChainTree(scid, records);
        res.send({ok: result});
    } catch (e) {
        console.log(e);
        res.status(500).send({errors: e.message});
    }
});

let saveKeys = async function () {
    let publicUser = await RSAencrypt.readPublic('./indexMerkleTree/keypair/userPublicKey.json');
    let publicCp = await RSAencrypt.readPublic('./indexMerkleTree/keypair/cpPublicKey.json');
    let response = await db.insertPublicKeys(publicUser, publicCp);
    return response;
};

server.listen(3000, function () {
    connectDB();
    console.log(privatekey);
    console.log(publickey);
    console.log(account);
    console.log('App listening on port 3000!');
});
