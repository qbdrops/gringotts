let Web3 = require('web3');
let ethUtils = require('ethereumjs-util');
let env = require('./env');

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const privatekey = env.privateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

web3.personal.unlockAccount(account, env.password);

module.exports = {
    networks: {
        development: {
            host: env.web3Host,
            port: env.web3Port,
            network_id: '*',
            from: account
        }
    }
}
