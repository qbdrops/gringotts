const NodeRSA = require('node-rsa');
const fs = require('fs');
var constants = require('constants');

let readPublic = function(path){   
    return new Promise((resolve) => {
        fs.readFile(path.toString(), 'utf-8', (err, data)=> {// encrypt
            let readPublicKey = JSON.parse(data);
            resolve(readPublicKey);
        });
    });
};

let encrypt = function(message, readPublicKey) {
    return new Promise((resolve) => {
        let key = new NodeRSA(readPublicKey, {encryptionScheme:{scheme:'pkcs1', padding: constants.RSA_NO_PADDING}});
        let encrypted = key.encrypt(message, 'base64');
        resolve(encrypted);
    });  
};

module.exports = {
    readPublic : readPublic,
    encrypt : encrypt
};