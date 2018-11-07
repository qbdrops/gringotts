const Initial = require('./initial');

class Stage extends Initial {
  constructor() {
    super();

    this.getStageInfo = this.getStageInfo.bind(this);
    this.getStageList = this.getStageList.bind(this);
  }

  init() {
    console.log('stage init');
  }

  getStage(height) {
    return new Promise((resolve, reject) => {
      this.booster.methods.stages(height).call().then((result) => {
        // console.log(result);
        resolve(result);
      });
    });
  }

  getStageInfo(req, res) {
    const { stageHeight } = req.params;
    const height = (+stageHeight).toString(16).padStart(64, 0);
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
          console.log(stage);
          res.json({
            txAmount: receipt_tree.leafElements.length,
            receiptRootHash: stage.receiptRootHash,
            accountRootHash: stage.accountRootHash
          });
        });
    });
  }

  getStageList(req, res) {
    const { amount } = req.params;

    this.pool.query(`SELECT * FROM trees LIMIT ${amount}`, (err, result) => {
      if (err || result.rows.length < 1) {
        console.log(err);
        return res.json({
          error: 'eror error error'
        });
      }

      result.rows.reduce((prev, curr) => {
        return prev.then((arr) => {
          return new Promise((resolve) => {
            this.getStage(curr['stage_height'])
              .then((data) => {
                arr.push({
                  txAmount: curr['receipt_tree'].leafElements.length,
                  receiptRootHash: data.receiptRootHash,
                  accountRootHash: data.accountRootHash,
                  stageHeight: +`0x${curr['stage_height']}`
                });
                resolve(arr);
              });
          });
        });
        
      }, Promise.resolve([])).then((finalData) => {
        res.json(finalData);
      });
      
    });
  }

}

module.exports = Stage;