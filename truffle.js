var Web3 = require('web3');
let env = require('./env');
let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));

function unlockCoinbase() {
	web3.personal.unlockAccount(web3.eth.coinbase, env.coinbasePassword);
}

unlockCoinbase();

module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*' // Match any network id
        }
    }
};
