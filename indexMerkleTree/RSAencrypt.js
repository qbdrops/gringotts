const NodeRSA = require('node-rsa');
const fs = require('fs');
var constants = require('constants');


let encrypt = function(order, path){

    return new Promise((resolve) => {
        fs.readFile(path.toString(), 'utf-8', (err, data)=> {// encrypt
            let readPublic = JSON.parse(data);
            let key = new NodeRSA(readPublic.publicKey, {encryptionScheme:{scheme:'pkcs1', padding: constants.RSA_NO_PADDING}});
            let encrypted = key.encrypt(order, 'base64');
            resolve(encrypted);
        });  
    });
};

module.exports = {
    encrypt : encrypt
};