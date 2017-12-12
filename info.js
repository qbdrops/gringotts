let ethUtils = require('ethereumjs-util');
let env = require('./env');

const privatekey = env.coinbasePrivateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const coinbase = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

console.log('Private key: ' + privatekey);
console.log('Public key: ' + publickey);
console.log('address: ' + coinbase);
