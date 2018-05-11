let level = require('level');
let chain = level('./sidechaindata', { valueEncoding: 'json' });

let DB = function () {
  this.chain = chain;
  this.getSidechain = () => {
    return this.chain;
  },
  this.pendingReceipts = async (stageHeight = null) => {
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
  };

  this.updateOffchainRecepts = async (offchainReceipts) => {
    await chain.put('offchain_receipts', offchainReceipts);
  };
};

let dbSingleton = new DB();

module.exports = dbSingleton;
