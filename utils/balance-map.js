let assert = require('assert');

class BalanceMap {
  constructor (chain) {
    this.chain = chain;
    this.balanceMap = {};
    this.lock = false;

    this.chain.get('balances', (err, balanceMapJson) => {
      let balanceMap = {};
      if (err) {
        if (err.type == 'NotFoundError') {
          this.chain.put('balances', balanceMap);
        } else {
          throw new Error('Can not fetch balances from db.');
        }
      } else {
        balanceMap = balanceMapJson;
      }
      this.balanceMap = balanceMap;
    });
  }

  balances () {
    return this.balanceMap;
  }

  _getBalance (address) {
    if (!this.lock) {
      return this.balanceMap[address];
    } else {
      return false;
    }
  }

  getBalance (address) {
    return new Promise ((resolve) => {
      if (this.balanceMap.hasOwnProperty(address)) {
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

  async setBalance (address, balance) {
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');
    this.lock = true;
    try {
      let balances = this.balanceMap;
      balances[address] = balance;
      this.balanceMap[address] = balance;
    } catch(e) {
      console.error(e);
      throw new Error('Fail to update balances.');
    } finally {
      this.lock = false;
    }
  }
}

module.exports = BalanceMap;
