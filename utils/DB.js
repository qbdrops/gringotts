let level = require('level');
let chain = level('./sidechaindata', { valueEncoding: 'json' });

class DB {
  constructor () {
    this.chain = chain;
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

  async updateOffchainRecepts (offchainReceipts) {
    await chain.put('offchain_receipts', offchainReceipts);
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
