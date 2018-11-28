const Initial = require('./initial');
const env = require('../../env');
const { bnHex } = require('../lib/math');
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
      const data = result.rows.map(token => ({
        assetName: token.asset_name,
        assetDecimal: token.asset_decimals,
        assetAddress: token.asset_address
      }));
      res.json(data);
    });
  }

  // can use assets table
  getTokenInfo(req, res) {
    let id = req.params.assetId;
    try {
      id = id.replace('0x', '').padStart(64, 0);
    } catch(e) {
      return res.json({
        error: 'Please attach assetId'
      });
    }
    let balance = bnHex(0);
    let withdraw = 0;

    this.pool.query(`SELECT data FROM receipts WHERE asset_id = '${id}' ORDER BY id ASC`, (err, result) => {
      if (err) res.json({ error: 'asset_id not found' });
      const receipts = result.rows
        .map(receipt => receipt.data)
        .map((rcpt) => {
          const lTx = rcpt.lightTxData;
          const from = lTx.from.toLowerCase().substr(-40);
          const to = lTx.to.toLowerCase().substr(-40);
          if (from === this.outside) {
            balance = balance.add(bnHex(lTx.value));
          } else if (to === this.outside) {
            balance = balance.sub(bnHex(lTx.value));
            withdraw++;
          }
        });

      res.json({
        balance: balance.toString(),
        totalWithdraw: withdraw,
        totalLTx: receipts.length,
        address: id.substr(-40)
      });
    });

    // this.pool.query(`SELECT balance FROM asset_lists WHERE asset_id = '${id}'`, (err, result) => {
    //   if (err) console.log(err);
    //   const txAmount = result.rows.length;
    // })
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
            type: this.getType(from, to),
            value: data.lightTxData.value
          };
        });
      res.json(final);
    });
  }

  getLTxDetail(req, res) {
    const { hash } = req.params;
    this.pool.query(`SELECT * FROM receipts LEFT OUTER JOIN trees ON receipts.stage_height = trees.stage_height WHERE receipts.light_tx_hash = '${hash}' `, (err, result) => {
      if (err || result.rows.length < 1) {
        console.log(err);
        return res.json({
          error: 'light_tx_hash not exit.'
        });
      }
      const receipt = result.rows[0];
      const { lightTxData, receiptData } = receipt.data;
      const { from, to } = lightTxData;
      /*eslint-disable camelcase*/
      const { finalizeTxHash, stage_height } = receipt;
      let status = 'Waiting';
      if (stage_height && finalizeTxHash) {
        status = 'Finalized';
      }
      else if (stage_height && !finalizeTxHash) {
        status = 'Challenge Period';
      }

      res.json({
        receipt: lightTxData,
        gsn: parseInt(receipt.gsn, 16),
        type: this.getType(from, to),
        timestamp: Date.parse(receipt.createdAt),
        stage: parseInt(receiptData.stageHeight, 16),
        status,
        serverMetadataHash: receiptData.serverMetadataHash
      });
    });
  }

  getAddressLTxList(req, res) {
    const { address, amount, lTxType, tokenType, sort  } = req.body;
    const { start } = req.query;
    const addressPad = address.replace('0x', '').padStart(64, 0);

    const order = sort ? sort : 'DESC';
    
    const typeCondition = lTxType && lTxType.length > 0 ? `AND (${lTxType.map(d => this.typeQuery({ type: d })).join(' OR ')})` : '';
    
    const tokenCondition = tokenType && tokenType.length > 0 ? `AND asset_id in (${tokenType.map(t => `'${t.padStart(64, 0)}'`).join(', ')})` : '';

    const whereCondition = `Where ("from" = '${addressPad}' OR "to"= '${addressPad}')`;
    
    const startCondition = start ? `AND id <= ${start}` : '';

    const query = `SELECT * FROM receipts ${whereCondition} ${tokenCondition} ${typeCondition} ${startCondition} ORDER BY id ${order} LIMIT ${amount || 10}`;
    console.log(query);
    this.pool.query(query, (err, result) => {
      if (err || result.rows.length < 1) { 
        return res.json({
          error: 'transaction not found'
        });
      }

      const list = result.rows.map((d) => {
        const timestamp = Date.parse(d.createdAt);
        const { lightTxData, receiptData } = d.data;
        const { from, to, value } = lightTxData;
        return {
          timestamp,
          stage: parseInt(receiptData.stageHeight, 16),
          from: `0x${from.substr(-40)}`,
          to: `0x${to.substr(-40)}`,
          value,
          gsn: d.gsn,
          type: this.getType(from, to),
          lTxHash: d.light_tx_hash,
          assetId: `0x${d.asset_id.substr(-40)}`
        };

      });
      res.json(list);
    });
  }

  getAddressBalance(req, res) {
    const { address } = req.params;
    if (!address) return res.json({ error: 'address not exit' });
    const longAddr = address.replace('0x', '').padStart(64, 0);
    this.pool.query(`SELECT * FROM assets WHERE address = '${longAddr}'`, async (err, result) => {
      if (err || result.rows.length < 1) {
        return res.json({
          error: 'address not exit'
        });
      }

      const amountRes = await this.pool.query(`SELECT COUNT(*), asset_id FROM receipts WHERE "from" = '${longAddr}' OR "to" = '${longAddr}' GROUP BY asset_id`);
      /*eslint-disable camelcase*/
      const list = result.rows.map(d => ({
        value: d.balance,
        assetId: `0x${d.asset_id.substr(-40)}`,
        amount: +(amountRes.rows.find(tk => tk.asset_id === d.asset_id).count)
      }));
      
      res.json(list);
    });
  }

}

module.exports = Postgres;