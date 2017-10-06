var express = require('express');
var bodyParser = require('body-parser');
var ethUtils = require('ethereumjs-util');

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

const privatekey = '2058a2d1b99d534dc0ec3e71876e4bcb0843fd55637211627087d53985ab04aa';
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x49aabbbe9141fe7a80804bdf01473e250a3414cb';

function queryStringToJSON(bill) {           
    var pairs = bill.split('&');

    var result = {};
    pairs.forEach(function(pair) {
        pair = pair.split('=');
        result[pair[0]] = decodeURIComponent(pair[1].replace(/\+/g, '%20') || '');
    });

    return JSON.parse(JSON.stringify(result));
}

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
    console.log('0x' + ethUtils.pubToAddress(publickey).toString('hex'));
    console.log(account);
    console.log('Example app listening on port 3000!');
});