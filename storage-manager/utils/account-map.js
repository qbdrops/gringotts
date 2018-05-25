let EthUtils = require('ethereumjs-util');
let assert = require('assert');

class AccountMap {
  constructor (storage) {
    this.storage = storage;
    this.storage.setAccountMap(this);
    this.accounts = {};
  }

  async initialize() {
    this.accounts = await this.storage.loadAccounts();
  }

  getAddresses () {
    return Object.keys(this.accounts);
  }

  getAccounts () {
    return this.accounts;
  }

  getAccount (address) {
    return this.accounts[address];
  }

  getBalance (address) {
    if (this.accounts[address]) {
      return this.accounts[address].balance;
    } else {
      return '0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  hashes () {
    return Object.values(this.accounts).map(account => account.accountHash);
  }

  isNewAddress (address) {
    if (address && address !== '0000000000000000000000000000000000000000000000000000000000000000') {
      return !(this.accounts[address]);
    } else {
      return false;
    }
  }

  setBalance (address, balance) {
    assert((typeof address === 'string') && (address.toString().length === 64), 'Invalid address.');
    assert((typeof balance === 'string') && (balance.toString().length === 64), 'Invalid balance.');

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
    }
  }

  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }
}

module.exports = AccountMap;
