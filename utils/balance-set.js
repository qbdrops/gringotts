let assert = require('assert');

class BalanceSet {
  constructor (chain) {
    this.chain = chain;
    this.balanceSet = {};
    this.lock = false;

    this.chain.get('balances', (err, balanceSetJson) => {
      let balanceSet = {};
      if (err) {
        // First start
        this.chain.put('balances', JSON.stringify(balanceSet));
      } else {
        balanceSet = JSON.parse(balanceSetJson);
      }
      this.balanceSet = balanceSet;
    });
  }

  _getBalance (address) {
    if (!this.lock) {
      return this.balanceSet[address];
    } else {
      return false;
    }
  }

  getBalance (address) {
    return new Promise ((resolve) => {
      if (this.balanceSet.hasOwnProperty(address)) {
        if (!this.lock) {
          resolve(this._getBalance(address));
        } else {
          let timerId = setInterval(() => {
            let balance = this._getBalance(address);
            if (balance !== false) {
              resolve(balance);
              clearInterval(timerId);
            }
          }, 50);
        }
      } else {
        resolve('0000000000000000000000000000000000000000000000000000000000000000');
      }
    });
  }

  async setBalance (address, balance, dbTx) {
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');
    this.lock = true;
    try {
      let balances = this.balanceSet;
      balances[address] = balance;
      await dbTx.put('balances', JSON.stringify(balances));
      this.balanceSet[address] = balance;
    } catch(e) {
      console.error(e);
      throw new Error('Fail to update balances.');
    } finally {
      this.lock = false;
    }
  }
}

module.exports = BalanceSet;
