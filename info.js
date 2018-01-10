let EthUtils = require('ethereumjs-util');
let env = require('./env');

const privatekey = env.privateKey;
const publickey = '0x' + EthUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + EthUtils.pubToAddress(publickey).toString('hex');

console.log('Private key: ' + privatekey);
console.log('Public key: ' + publickey);
console.log('address: ' + account);
