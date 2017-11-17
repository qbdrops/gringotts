let Web3 = require('web3');
let ethUtils = require('ethereumjs-util');
let env = require('./env');

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));

function unlockCoinbase() {
	web3.personal.unlockAccount(web3.eth.coinbase, env.coinbasePassword);
}

unlockCoinbase();

const privatekey = env.coinbasePrivateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const coinbase = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

module.exports = {
    networks: {
        development: {
            host: env.web3Url,
            port: 8545,
            network_id: '*',
            from: coinbase
        }
    }
};
