const Initial = require('./initial');
const env = require('../../env');

class Postgres extends Initial {
  constructor() {
    super();
    this.init = this.init.bind(this);
    this.getBasicInfo = this.getBasicInfo.bind(this);
    this.getAssetList = this.getAssetList.bind(this);
    this.getTokenInfo = this.getTokenInfo.bind(this);
    this.getLatestReceipts = this.getLatestReceipts.bind(this);
    this.getLTxDetail = this.getLTxDetail.bind(this);
    this.getAddressLTxList = this.getAddressLTxList.bind(this);
    this.getAddressBalance = this.getAddressBalance.bind(this);
  }

  init() {
    return Promise.resolve(this);
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

  // can use assets table
  getTokenInfo(req, res) {
    const id = req.params.assetId.padStart(64, 0);
    let balance = 0;
    let withdraw = 0;

    this.pool.query(`SELECT data FROM receipts WHERE "from" = '${this.outside.padStart(64, 0)}' OR "to" = '${this.outside.padStart(64, 0)}'`, (err, result) => {
      if (err) console.log(err);
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
          const { from, to } = data.lightTxData;
          return {
            lTxHash: v.light_tx_hash,
            timestamp: Date.parse(v.createdAt),
            type: this.getType(from.substr(-40), to.substr(-40)),
            value: data.lightTxData.value
          };
        });
      res.json(final);
    });
  }

  getLTxDetail(req, res) {
    const { hash } = req.params;
    this.pool.query(`SELECT * FROM receipts WHERE light_tx_hash = '${hash}'`, (err, result) => {
      if (err || receipt.rows.length < 1) {
        console.log(err);
        return res.json({
          error: 'light_tx_hash not exit.'
        });
      }
      const receipt = result.rows[0];
      const { lightTxData } = receipt.data;
      const { from, to } = lightTxData;

      res.json({
        receipt: lightTxData,
        type: this.getType(from.substr(-40), to.substr(-40)),
        timestamp: Date.parse(receipt.createdAt)
      });
    });
  }

  getAddressLTxList(req, res) {
    const { address, amount, lTxType, tokenType, sort  } = req.body;
    const longAddr = address.padStart(64, 0);
    const lontOutside = this.outside.padStart(64, 0);
    const order = sort ? sort : 'DESC';

    let whereCondition = '';

    switch (lTxType) {
    case 'deposit':
      whereCondition = `AND ("from" = '${lontOutside}' AND "to" = '${longAddr}')`;
      break;
    case 'withdraw':
      whereCondition = `AND "from" = '${longAddr}' AND "to" = '${lontOutside}'`;
      break;
    case 'remittance':
      whereCondition = `AND ("from" = '${longAddr}' AND "to" != '${lontOutside}') OR ("from" != '${lontOutside}' AND "to" = '${longAddr}')`;
      break;
    default:
      break;
    }

    this.pool.query(`SELECT * FROM receipts WHERE asset_id = '${tokenType.padStart(64, 0)}' ${whereCondition} ORDER BY id ${order} LIMIT ${amount}`, (err, result) => {
      if (err || result.rows.length < 1) { 
        console.log(err);
        return res.json({
          error: 'not found'
        });
      }

      const list = result.rows.map((d) => {
        const timestamp = Date.parse(d.createdAt);
        const { lightTxData, receiptData } = d.data;
        const { from, to, value } = lightTxData;

        return {
          timestamp,
          stage: receiptData.stageHeight,
          from,
          to,
          value,
          type: this.getType(from, to)
        };

      });
      res.json({
        amount: list.length,
        lTxList: list
      });
    });
  }

  getAddressBalance(req, res) {
    const { address } = req.params;
    const longAddr = address.padStart(64, 0);
    this.pool.query(`SELECT * FROM assets WHERE address = '${longAddr}'`, (err, result) => {
      if (err || result.rows.length < 1) {
        return res.json({
          error: 'address not exit in booster'
        });
      }
      /*eslint-disable camelcase*/
      const list = result.rows.map(d => ({ value: d.balance, assetId: d.asset_id }));
      
      res.json(list);
    });
  }

}

module.exports = Postgres;