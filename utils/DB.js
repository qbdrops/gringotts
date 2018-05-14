let level = require('level');
let chain = level('./sidechaindata', { valueEncoding: 'json' });

class DB {
  constructor () {
    this.chain = chain;
    this.treeManager = null;
    this.accountMap = null;
    this.gsnGenerator = null;
  }

  setTreeManager (treeManager) {
    this.treeManager = treeManager;
  }

  setGSNGenerator (gsnGenerator) {
    this.gsnGenerator = gsnGenerator;
  }

  setAccountMap (accountMap) {
    this.accountMap = accountMap;
  }

  async loadStageHeight () {
    let stageHeight;
    try {
      stageHeight = await chain.get('stageHeight');
      return parseInt(stageHeight);
    } catch (e) {
      if (e.type == 'NotFoundError') {
        stageHeight = 0;
        await chain.put('stageHeight', stageHeight);
        return stageHeight;
      } else {
        throw e;
      }
    }
  }

  async dumpStageHeight (stageHeight) {
    await chain.put('stageHeight', stageHeight.toString());
  }

  async pendingReceipts (stageHeight = null) {
    let receipts;
    try {
      receipts = await chain.get('offchain_receipts');
      if (stageHeight) {
        receipts = receipts.filter((receipt) => {
          return parseInt(receipt.receiptData.stageHeight, 16) == stageHeight;
        });
      }
      return receipts;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        receipts = [];
        await chain.put('offchain_receipts', receipts);
        return receipts;
      } else {
        throw e;
      }
    }
  }

  async updateOffchainRecepts (offchainReceipts) {
    await chain.put('offchain_receipts', offchainReceipts);
  }

  async getReceiptByLightTxHash (lightTxHash) {
    let receipt;
    try {
      receipt = await chain.get('receipt::' + lightTxHash);
      return receipt;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        receipt = null;
        return receipt;
      } else {
        throw e;
      }
    }
  }

  async loadTrees (stageHeight) {
    let trees;
    try {
      trees = await chain.get('trees::' + stageHeight.toString());
      return trees;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        trees = {};
        await chain.put('trees::' + stageHeight.toString(), trees);
        return trees;
      } else {
        throw e;
      }
    }
  }

  async dumpTrees (trees, stageHeight) {
    await chain.put('trees::' + stageHeight.toString(), trees);
  }

  async loadGSN () {
    let GSN;
    try {
      GSN = await chain.get('GSN');
      return parseInt(GSN);
    } catch (e) {
      if (e.type == 'NotFoundError') {
        GSN = 0;
        await chain.put('GSN', GSN);
        return GSN;
      } else {
        throw e;
      }
    }
  }

  async dumpGSN (GSN) {
    await chain.put('GSN', GSN);
  }

  async loadAccounts () {
    let accounts;
    try {
      let addresses = await chain.get('addresses');
      accounts = {};
      for (let i = 0 ; i < addresses.length; i++) {
        let address = addresses[i];
        let account = await chain.get('account::' + address);
        accounts[address] = account;
      }
      return accounts;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        accounts = {};
        await chain.put('addresses', []);
        return accounts;
      } else {
        throw e;
      }
    }
  }

  async batch (newAddresses, GSN, offchainReceipts, receipt) {
    let tx = chain.batch().
      put('GSN', GSN).
      put('offchain_receipts', offchainReceipts).
      put('receipt::' + receipt.lightTxHash, receipt.toJson());

    if (newAddresses.length > 0) {
      let addresses = await chain.get('addresses');
      addresses = addresses.concat(newAddresses);
      tx = tx.put('addresses', addresses);
      newAddresses.forEach(newAddress => {
        let newAccount = this.accountMap.getAccount(newAddress);
        tx = tx.put('account::' + newAddress, newAccount);
      });
    }

    await tx.write();
  }
}

module.exports = DB;
