const Socket = require('socket.io'); 
const Initial = require('./initial');
const readConfig = require('../lib/readConfig');

class Gazer extends Initial {
  constructor(app) {
    super();
    const server = require('http').Server(app);
    this.io = Socket(server);
    // this.io.set('transports', ['websocket']);
    this.io.set('origins', '*:*');
    this.amount = 10;
  }

  async init() {
    let receiptTotal = 0;
    let treeTotal = 0;
    const config = await readConfig();
    const port = config.socketPort;
    this.io.listen(port);
    this.io.on('connection', async (socket) => {
      console.log('connected');

      const transactions = await this.latestLtx();
      const stages = await this.latestStage();
      socket.emit('lTxs', transactions);
      socket.emit('stages', stages);
    });

    setInterval(async () => {
      const receiptRes = await this.pool.query('SELECT COUNT(id) FROM receipts');
      // const treeRes = await this.pool.query('SELECT COUNT(id) FROM trees');
      const receiptAmount = +receiptRes.rows[0].count;
      // const treeAmount = +treeRes.rows[0].count;

      if (receiptTotal < receiptAmount) {
        receiptTotal = receiptAmount;
        const transactions = await this.latestLtx();
        this.io.emit('lTxs', transactions);
      }

      // if (treeTotal < treeAmount) {
      //   treeTotal = treeAmount;
      //   const stages = await this.latestStage();
      //   this.io.emit('stages', stages);
      // }
      const stages = await this.latestStage();
      this.io.emit('stages', stages);
    }, 5000);

    console.log(`gazer init, socket running on port ${port}`);

    return Promise.resolve();
  }

  latestLtx() {
    return new Promise(async (resolve, reject) => {
      const result = await this.pool.query(`SELECT * FROM receipts ORDER BY ID DESC LIMIT ${this.amount}`);
      if (!result.rows) reject([]);
      const final = result.rows
        .map((v) => {
          const { data } = v;
          const { from, to, assetID } = data.lightTxData;
          return {
            lTxHash: v.light_tx_hash,
            timestamp: Date.parse(v.createdAt),
            type: this.getType(from, to),
            value: data.lightTxData.value,
            assetId: `0x${assetID.substr(-40)}`
          };
        });
      resolve(final);
    });
  }

  latestStage() {
    return new Promise(async (resolve, reject) => {
      const result = await this.pool.query(`SELECT * FROM trees ORDER BY ID DESC LIMIT ${this.amount}`);
      const period = await this.booster.methods.stagePeriod().call();

      if (!result.rows) reject([]);
      result.rows.reduce((prev, curr) => {
        return prev.then((arr) => {
          return new Promise((rslv) => {
            this.getStage(curr['stage_height'])
              .then((data) => {
                arr.push({
                  txAmount: curr['receipt_tree'].leafElements.length,
                  receiptRootHash: data.receiptRootHash,
                  accountRootHash: data.accountRootHash,
                  attachTimestamp: data.attachTimestamp * 1000,
                  finalizeTimestamp: data.finalizeTimeStamp * 1000,
                  stageHeight: +`0x${curr['stage_height']}`,
                  challengePeriod: period * 1000
                });
                rslv(arr);
              });
          });
        });
        
      }, Promise.resolve([])).then(async(finalData) => {
        let total = 0;
        finalData.forEach((el) => {
          total += el.txAmount;
        });
        const gsnRes = await this.pool.query('SELECT gsn FROM gsn_number');
        const gsn = gsnRes.rows[0].gsn;
        if (finalData[0].finalizeTimestamp) {
          finalData.unshift({
            txAmount: gsn - total,
            receiptRootHash: '',
            accountRootHash: '',
            attachTimestamp: '0',
            finalizeTimestamp: '0',
            stageHeight: parseInt(finalData[0].stage_height, 16) + 1,
            challengePeriod: period * 1000
          });
        }
        
        resolve(finalData);
      });
    });
  }
}

module.exports = Gazer;
