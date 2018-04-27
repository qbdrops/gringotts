let assert = require('assert');

class BalanceSet {
  constructor (db) {
    this.db = db;
    this.balanceSet = {};
    this.lock = false;
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

  setBalance (address, balance) {
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');
    this.lock = true;
    this.balanceSet[address] = balance;
    this.lock = false;
  }
}

module.exports = BalanceSet;
