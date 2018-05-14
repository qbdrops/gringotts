let level = require('level');
let chain = level('./sidechaindata', { valueEncoding: 'json' });

class DB {
  constructor () {
    this.chain = chain;
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
      accounts = await chain.get('accounts');
      return accounts;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        accounts = {};
        await chain.put('accounts', accounts);
        return accounts;
      } else {
        throw e;
      }
    }
  }

  async dumpAccounts (accounts) {
    await chain.put('accounts', accounts);
  }

  async batch (accounts, GSN, offchainReceipts, receipt) {
    await chain.batch().
      put('accounts', accounts).
      put('GSN', GSN).
      put('offchain_receipts', offchainReceipts).
      put('receipt::' + receipt.lightTxHash, receipt.toJson()).
      write();
  }
}

module.exports = DB;
