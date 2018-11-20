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
    const period = await this.booster.methods.stagePeriod().call();

    this.pool.query(`SELECT * FROM trees WHERE stage_height = '${height}'`, (err, result) => {
      if (err || result.rows.lenght < 1) {
        console.log(err);
        res.json({
          error: 'stage not found'
        });
      }

      const tree = result.rows[0];
      /*eslint-disable camelcase*/
      const { receipt_tree } = tree;

      this.getStage(height)
        .then((stage) => {
          res.json({
            txAmount: receipt_tree.leafElements.length,
            receiptRootHash: stage.receiptRootHash,
            accountRootHash: stage.accountRootHash,
            attachTimestamp: stage.attachTimestamp,
            challengePeriod: period * 1000,
            attachHash: '000',
            finalizeHash: '000'
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
    this.pool.query(`SELECT * FROM trees ${startWith} ORDER BY id DESC LIMIT ${amount}`, async (err, result) => {
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
    const height = stageHeight.toString(16).padStart(64, 0);
    const order = sort ? sort : 'DESC';
    const whereCondition = this.typeQuery({ type: lTxType });

    const receiptRes = await this.pool.query(`SELECT * FROM receipts WHERE asset_id = '${tokenType.padStart(64, 0)}' AND data -> 'receiptData' ->> 'stageHeight' = '${height}' ${whereCondition} ORDER BY id ${order} LIMIT ${amount}`);
    if (!receiptRes.rows) return res.json({ error: 'transaction not found' });
    const results = receiptRes.rows.map((receipt) => {
      const { data, createdAt, value, gsn } = receipt;
      const { from , to } = data.receiptData;
      return {
        timestamp: Date.parse(createdAt),
        lTxType: this.getType(from, to),
        from,
        to,
        value,
        gsn
      };
    });
    res.json(results);
  }

}

module.exports = Stage;