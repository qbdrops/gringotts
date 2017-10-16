let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let ethUtils = require('ethereumjs-util');
let db = require('./db');

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors());

const privatekey = env.coinbasePrivateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

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
        res.status(500, e.message);
    }
});

app.put('/ecc/publickey', async function (req, res) {
    try {
        let publickey = req.body.publickey;
        let command = await db.insertECCPublickey(publickey);
        res.send({result: command.result.ok});
    } catch (e) {
        console.log(e);
        res.status(500, e.message);
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
        res.status(500, e.message);
    }
});

app.post('/slice', function (req, res) {
    try {
        res.send({sliceHashes: []});
    } catch (e) {
        console.log(e);
        res.status(500, e.message);
    }
});

app.listen(3000, function () {
    console.log(privatekey);
    console.log(publickey);
    console.log(account);
    console.log('App listening on port 3000!');
});