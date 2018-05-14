let EthUtils = require('ethereumjs-util');
let assert = require('assert');

class AccountMap {
  constructor (db) {
    this.db = db;
    this.accounts = {};
    this.lock = false;
    this.acconuts = null;
  }

  async initialize() {
    this.accounts = await this.db.loadAccounts();
  }

  async dump() {
    await this.db.dumpAccounts(this.accounts);
  }

  getAccounts () {
    return this.accounts;
  }

  _getBalance (address) {
    if (!this.lock) {
      return this.accounts[address].balance;
    } else {
      return false;
    }
  }

  getBalance (address) {
    return new Promise ((resolve) => {
      if (this.accounts.hasOwnProperty(address)) {
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

  hashes () {
    return Object.values(this.accounts).map(account => account.accountHash);
  }

  async setBalance (address, balance) {
    assert((typeof address === 'string') && (address.toString().length === 64), 'Invalid address.');
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');
    this.lock = true;

    let accountData = {
      address: address,
      balance: balance
    };

    let accountHash = this._sha3(Object.values(accountData).reduce((acc, curr) => acc + curr, ''));
    accountData.accountHash = accountHash;

    try {
      this.accounts[address] = accountData;
    } catch(e) {
      console.error(e);
      throw new Error('Fail to update account.');
    } finally {
      this.lock = false;
    }
  }

  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }
}

module.exports = AccountMap;
