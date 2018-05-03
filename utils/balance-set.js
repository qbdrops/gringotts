let assert = require('assert');

class BalanceSet {
  constructor (chain) {
    this.chain = chain;
    this.balanceSet = {};
    this.lock = false;

    this.chain.get('balances', (err, balanceSetJson) => {
      let balanceSet = {};
      if (err) {
        if (err.type == 'NotFoundError') {
          this.chain.put('balances', balanceSet);
        } else {
          throw new Error('Can not fetch balances from db.');
        }
      } else {
        balanceSet = balanceSetJson;
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

  async setBalance (address, balance, leveldbTransaction) {
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');
    this.lock = true;
    try {
      let balances = this.balanceSet;
      balances[address] = balance;
      if (leveldbTransaction) {
        await leveldbTransaction.put('balances', balances);
      }
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
