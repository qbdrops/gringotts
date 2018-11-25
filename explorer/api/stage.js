const Initial = require('./initial');

class Stage extends Initial {
  constructor() {
    super();

    this.getStageInfo = this.getStageInfo.bind(this);
    this.getStageList = this.getStageList.bind(this);
    this.getStageLTxList = this.getStageLTxList.bind(this);
  }

  init() {
    console.log('stage init');
  }


  async getStageInfo(req, res) {
    const { stageHeight } = req.params;
    const height = (+stageHeight).toString(16).padStart(64, 0);
    const next = (+stageHeight + 1).toString(16).padStart(64, 0);
    const period = await this.booster.methods.stagePeriod().call();
    
    const resFinal = await this.pool.query('SELECT * FROM trees ORDER BY id DESC LIMIT 1');
    if (!resFinal.rows || resFinal.rows.length < 1) {
      return res.json({
        error: 'stage not found'
      });
    }
    const finalStage = resFinal.rows[0];

    /*eslint-disable camelcase*/
    if (stageHeight - parseInt(finalStage.stage_height, 16) === 1) {
      return res.json({
        txAmount: '',
        receiptRootHash: '',
        accountRootHash: '',
        attachTimestamp: '',
        challengePeriod: period * 1000,
        attachTxHash: '',
        finalizeTxHash: '',
        nextStage: ''
      });
    }

    this.pool.query(`SELECT * FROM trees WHERE stage_height = '${height}' OR stage_height = '${next}'`, async (err, result) => {
      if (err || result.rows.length < 1) {
        console.log(err);
        return res.json({
          error: 'stage not found'
        });
      }

      const tree = result.rows[0];
      const { receipt_tree } = tree;

      this.getStage(height)
        .then((stage) => {
          res.json({
            txAmount: receipt_tree.leafElements.length,
            receiptRootHash: stage.receiptRootHash,
            accountRootHash: stage.accountRootHash,
            attachTimestamp: stage.attachTimestamp * 1000,
            challengePeriod: period * 1000,
            attachTxHash: tree.attach_tx_hash,
            finalizeTxHash: tree.finalizeTxHash,
            finalizeTimestamp: stage.finalizeTimeStamp * 1000,
            nextStage: (result.rows.length > 1 || finalStage.stage_height === height) ? +stageHeight + 1 : ''
          });
        });
    });
  }

  getStageList(req, res) {
    const { amount, start } = req.params;
    let startWith = '';
    if (+start > 0) {
      startWith = `WHERE id < ${+start}`;
    }
    this.pool.query(`SELECT * FROM trees ${startWith} ORDER BY id DESC LIMIT ${amount || 0}`, async (err, result) => {
      const totalAmount = await this.pool.query('SELECT COUNT(*) FROM trees ');
      if (err || result.rows.length < 1) {
        console.log(err);
        return res.json({
          error: 'tages not found'
        });
      }

      result.rows.reduce((prev, curr) => {
        return prev.then((arr) => {
          return new Promise((resolve) => {
            this.getStage(curr['stage_height'])
              .then((data) => {
                arr.push({
                  txAmount: curr['receipt_tree'].leafElements.length,
                  attachTxHash: data.attachTxHash,
                  stageHeight: +`0x${curr['stage_height']}`,
                  timestamp: data.attachTimestamp * 1000,
                  status: +data.finalizeTimeStamp > 0 ? 'Finalized' : 'Challenge'
                });
                resolve(arr);
              });
          });
        });
        
      }, Promise.resolve([])).then((finalData) => {
        res.json({
          stages: finalData,
          totalAmount: +totalAmount.rows[0].count
        });
      });
      
    });
  }

  async getStageLTxList(req, res) {
    const { stageHeight, amount, lTxType, tokenType, sort  } = req.body;
    const { start } = req.query;
    const height = stageHeight ? (+stageHeight).toString(16).padStart(64, 0) : '';
    const order = sort ? sort : 'DESC';
    
    const typeCondition = lTxType && lTxType.length > 0 ? `AND (${lTxType.map(d => this.typeQuery({ type: d })).join(' OR ')})` : '';
    
    const startCondition = start ? `AND id < ${start}` : '';

    const tokenCondition = tokenType && tokenType.length > 0 ? `AND asset_id in (${tokenType.map(t => `'${t.padStart(64, 0)}'`).join(', ')})` : '';
    
    const query = `SELECT * FROM receipts WHERE stage_height = '${height}' ${tokenCondition} ${typeCondition} ${startCondition} ORDER BY id ${order} LIMIT ${amount || 10}`;
    // console.log(query);
    const receiptRes = await this.pool.query(query);
    
    if (!receiptRes.rows || receiptRes.rows.length < 1) return res.json({ error: 'transaction not found' });
    const results = receiptRes.rows.map((receipt) => {
      const { data, createdAt, value, gsn, from, to, asset_id } = receipt;
      return {
        timestamp: Date.parse(createdAt) * 1000,
        lTxType: this.getType(from, to),
        lTxHash: data.lightTxHash,
        from,
        to,
        value,
        gsn,
        assetAddress: asset_id.substr(-40)
      };
    });
    res.json(results);
  }

}

module.exports = Stage;