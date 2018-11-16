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
    const outside = this.outside.padStart(64, 0);
    if (to === outside) {
      return 'withdraw';
    }
    else if (from === outside) {
      return 'deposit';
    } else {
      return 'remittance';
    }
  }

  typeQuery({ type, address }) {
    const longAddr = address && address.padStart(64, 0);
    const lontOutside = this.outside.padStart(64, 0);

    if (address) {
      switch (type) {
      case 'deposit':
        return `AND ("from" = '${lontOutside}' AND "to" = '${longAddr}')`;
      case 'withdraw':
        return `AND "from" = '${longAddr}' AND "to" = '${lontOutside}'`;
      case 'remittance':
        return `AND (("from" = '${longAddr}' AND "to" != '${lontOutside}') OR ("from" != '${lontOutside}' AND "to" = '${longAddr}'))`;
      default:
        return '';
      }
    } else {
      switch (type) {
      case 'deposit':
        return `AND ("from" = '${lontOutside}' AND "to" != '${lontOutside}')`;
      case 'withdraw':
        return `AND "from" != '${lontOutside}' AND "to" = '${lontOutside}'`;
      case 'remittance':
        return `AND ("from" != '${lontOutside}' AND "to" != '${lontOutside}')`;
      default:
        return '';
      }
    } 

  }

  getStage(height) {
    return new Promise((resolve, reject) => {
      height = parseInt(height, 16);
      this.booster.methods.stages(height).call().then((result) => {
        // console.log(result);
        resolve(result);
      });
    });
  }
}

module.exports = Initial;