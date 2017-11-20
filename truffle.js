let Web3 = require('web3');
let ethUtils = require('ethereumjs-util');
let env = require('./env');

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const privatekey = env.coinbasePrivateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const coinbase = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

function unlockCoinbase() {
    if (coinbase !== web3.eth.coinbase) {
        throw new Error('Coinbase address did not match with private key.');
    }
	web3.personal.unlockAccount(web3.eth.coinbase, env.coinbasePassword);
}

unlockCoinbase();

module.exports = {
    networks: {
        development: {
            host: env.web3Host,
            port: env.web3Port,
            network_id: '*',
            from: coinbase
        }
    }
};
