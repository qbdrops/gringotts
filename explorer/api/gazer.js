const Socket = require('socket.io'); 
const Initial = require('./initial');

class Gazer extends Initial {
  constructor(app) {
    super();
    const server = require('http').Server(app);
    this.io = Socket(server);
    this.amount = 10;

    // this.init = this.init.bind(this);
  }

  init() {
    let total = 0;
    setInterval(async () => {
      const res = await this.pool.query('SELECT COUNT(id) FROM receipts');
      const amount = +res.rows[0].count;

      if (total < amount) {
        total = amount;
        const transactions = await this.latestLtx();
        // console.log(transactions);
      }
    }, 5000);

    console.log('gazer init');

    return Promise.resolve();
  }

  latestLtx() {
    return new Promise(async (resolve, reject) => {
      const result = await this.pool.query(`SELECT * FROM receipts ORDER BY ID DESC LIMIT ${this.amount}`);
      if (!result.rows) reject([]);
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
      resolve(final);
    });
  }

  latestStage() {
    return new Promise(async (resolve, reject) => {
      const result = await this.pool.query('SELECT * FROM receipts ORDER BY ID DESC');
      if (!result.rows) reject([]);
            
    });
  }
}

module.exports = Gazer;
