const env = require('../../env');
const pg = require('pg');
const web3 = require('web3');
const BN = web3.utils.BN;

const db = env.production;

class Postgres {
  constructor() {
    this.outside = ''.padStart(40, 0);

    this.init = this.init.bind(this);
    this.getBasicInfo = this.getBasicInfo.bind(this);
    this.getAssetList = this.getAssetList.bind(this);
    this.getTokenInfo = this.getTokenInfo.bind(this);
    this.getLatestReceipts = this.getLatestReceipts.bind(this);
    this.getLTxDetail = this.getLTxDetail.bind(this);
  }

  init() {
    this.pool = new pg.Pool({
      database: db.database,
      user: db.username,
      password: db.password,
      host: db.host,
      port: db.port,
    });

    this.address = env.serverAddress.toLowerCase().replace('0x', '');
  }

  getBasicInfo(req, res) {
    res.json({
      contractAddress: env.contractAddress,
      serverAddress: env.serverAddress,
      boosterName: 'No One'
    });
  }

  getAssetList(ree, res) {
    this.pool.query('SELECT * FROM asset_lists', (err, result) => {
      res.json(result.rows);
    });
  }

  getTokenInfo(req, res) {
    const id = req.params.assetId;
    let balance = 0;
    let withdraw = 0;

    this.pool.query('SELECT data FROM receipts', (err, result) => {
      const receipts = result.rows
        .map(receipt => receipt.data)
        .filter(d => d.lightTxData.assetID === id)
        .map((rcpt) => {
          const lTx = rcpt.lightTxData;
          const from = lTx.from.toLowerCase().substr(-40);
          const to = lTx.to.toLowerCase().substr(-40);

          if (to === this.address && from === this.outside) {
            balance += parseInt(lTx.value, 16);
          } else if (from === this.address && to === this.outside) {
            balance -= parseInt(lTx.value, 16);
            withdraw++;
          }
        });

      res.json({
        balance,
        withdraw,
        totalLTx: receipts.length
      });
    });
  }

  getLatestReceipts(req, res) {
    const { number } = req.params;

    this.pool.query(`SELECT * FROM receipts ORDER BY ID DESC LIMIT ${number}`, (err, result) => {
      if (err) {
        console.log(err);
      }
      const final = result.rows
        .map((v) => {
          const { data } = v;
          return {
            lTxHash: v.light_tx_hash,
            timestamp: Date.parse(v.createdAt),
            type: 'later',
            value: data.lightTxData.value
          };
        });
      res.json(final);
    });
  }

  getLTxDetail(req, res) {
    const { hash } = req.params;
    this.pool.query(`SELECT * FROM receipts WHERE light_tx_hash = '${hash}'`, (err, result) => {
      if (err) {
        console.log(err);
      }
      const receipt = result.rows[0];

      res.json({
        receipt: receipt.data.lightTxData,
        type: 'later',
        timestamp: Date.parse(receipt.createdAt)
      });
    });
  }
}

module.exports = Postgres;