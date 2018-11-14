const Web3 = require('web3');
const BN = Web3.utils.BN;

exports.bnHex = (hex) => new BN(hex, 16);