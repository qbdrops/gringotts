const pg = require('pg');
const Web3 = require('web3');
const env = require('../../env');
let Booster = require('../../abi/Booster.json');

const db = env.production;

class Initial {
  constructor() {
    this.outside = ''.padStart(40, 0);
    this.web3 = new Web3(env.web3Url);
    this.booster = new this.web3.eth.Contract(Booster.abi, env.contractAddress);
    this.pool = new pg.Pool({
      database: db.database,
      user: db.username,
      password: db.password,
      host: db.host,
      port: db.port,
    });
      
    this.address = env.serverAddress.toLowerCase().replace('0x', '');
  }

  init() {
    return Promise.resolve();
  }

  getType(from, to) {
    const address = this.address.padStart(64, 0);
    const outside = this.outside.padStart(64, 0);
    if (from === address && to === outside) {
      return 'withdraw';
    }
    else if (from === outside && to === address) {
      return 'deposit';
    } else {
      return 'remittance';
    }
    
  }
}

module.exports = Initial;