let Web3 = require('web3');
let EthUtils = require('ethereumjs-util');
let env = require('./env');

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const privatekey = env.privateKey;
const publickey = '0x' + EthUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + EthUtils.pubToAddress(publickey).toString('hex');

web3.personal.unlockAccount(account, env.password);

module.exports = {
    networks: {
        development: {
            host: env.web3Host,
            port: env.web3Port,
            network_id: '*',
            from: account
        },
        staging: {
            host: 'dev.infinitechain.io',
            port: '8545',
            network_id: '*',
            from: '0x50afb1b4c52c64daed49ab8c3aa82b0609b75db0'
        }
    }
}
