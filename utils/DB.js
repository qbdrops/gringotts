let env = require('../env');
let database = null;
if (env.database == 'level') {
  database = 'level';
} else if (env.database == 'rocksdb') {
  database = 'level-rocksdb';
} else {
  throw new Error('Not supported database.');
}
let level = require(database);
let chain = level('./sidechaindata', { valueEncoding: 'json' });

class DB {
  constructor () {
    this.chain = chain;
    this.treeManager = null;
    this.accountMap = null;
    this.gsnGenerator = null;
    this.offchainReceiptHashes = null;
    this.offchainReceipts = {};
  }

  async getContractAddress () {
    try {
      let contractAddress = await chain.get('contract_address');
      return contractAddress;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        await chain.put('contract_address', null);
        return null;
      } else {
        throw e;
      }
    }
  }

  async saveContractAddress (contractAddress) {
    await chain.put('contract_address', contractAddress);
  }

  addOffchainReceipt(receipt) {
    let offchainLightTxHash = receipt.lightTxHash;
    this.offchainReceipts[offchainLightTxHash] = receipt;
    this.offchainReceiptHashes.push(offchainLightTxHash);
  }

  async getOffchainReceipts (targetStageHeight) {
    targetStageHeight = parseInt(targetStageHeight, 16);
    let receipts = [];
    for (let i = 0; i < this.offchainReceiptHashes.length; i++) {
      let lightTxHash = this.offchainReceiptHashes[i];
      let receipt = await chain.get('receipt::' + lightTxHash);
      receipts.push(receipt);
    }

    return receipts.filter((receipt) => {
      let stageHeight = parseInt(receipt.receiptData.stageHeight, 16);
      return stageHeight === targetStageHeight;
    }).map((receipt) => {
      return receipt.lightTxHash;
    });
  }

  removeOffchainReceipt (lightTxHash) {
    this.offchainReceiptHashes.splice(this.offchainReceiptHashes.indexOf(lightTxHash), 1);
  }

  async removeOffchainReceipts (targetLightTxHashes) {
    for (let i = 0; i < targetLightTxHashes.length; i++) {
      let targetLightTxHash = targetLightTxHashes[i];
      delete this.offchainReceipts[targetLightTxHash];
      this.offchainReceiptHashes.splice(this.offchainReceiptHashes.indexOf(targetLightTxHash), 1);
    }

    await this.updateOffchainReceptHashes();
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

  async loadExpectedStageHeight () {
    let stageHeight = null;
    try {
      stageHeight = await chain.get('stageHeight');
      return parseInt(stageHeight);
    } catch (e) {
      if (e.type == 'NotFoundError') {
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

  async initPendingReceipts () {
    let offchainLightTxHashes = [];
    try {
      offchainLightTxHashes = await chain.get('offchain_receipts');
      offchainLightTxHashes.forEach(async (offchainLightTxHash) => {
        let receipt = await chain.get('receipt::' + offchainLightTxHash);
        this.offchainReceipts[offchainLightTxHash] = receipt;
      });
    } catch (e) {
      if (e.type == 'NotFoundError') {
        await chain.put('offchain_receipts', offchainLightTxHashes);
      } else {
        throw e;
      }
    }

    this.offchainReceiptHashes = offchainLightTxHashes;
    return offchainLightTxHashes;
  }

  pendingLightTxHashesOfReceipts () {
    return this.offchainReceiptHashes;
  }

  async hasPendingReceipts (stageHeight) {
    let receipts = await this.pendingReceipts(stageHeight);
    return (receipts.length > 0);
  }

  async pendingReceipts (stageHeight = null) {
    let receipts = [];
    for (let i = 0; i < this.offchainReceiptHashes.length; i++) {
      let offchainLightTxHash = this.offchainReceiptHashes[i];
      let receipt = this.offchainReceipts[offchainLightTxHash];
      receipts.push(receipt);
    }
    if (stageHeight) {
      receipts = receipts.filter((receipt) => {
        return parseInt(receipt.receiptData.stageHeight, 16) == stageHeight;
      });
    }
    return receipts;
  }

  async updateOffchainReceptHashes () {
    await chain.put('offchain_receipts', this.offchainReceiptHashes);
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

  async batch (newAddresses, GSN, receipt) {
    let fromAddress = receipt.lightTxData.from;
    let toAddress = receipt.lightTxData.to;
    let tx = chain.batch().
      put('GSN', GSN).
      put('receipt::' + receipt.lightTxHash, receipt.toJson());

    if (Array.isArray(this.offchainReceiptHashes) && this.offchainReceiptHashes.length > 0) {
      tx = tx.put('offchain_receipts', this.offchainReceiptHashes);
    }

    if (newAddresses.length > 0) {
      let addresses = this.accountMap.getAddresses();
      tx = tx.put('addresses', addresses);
    }

    if (fromAddress && (fromAddress !== '0000000000000000000000000000000000000000000000000000000000000000')) {
      let fromAccount = this.accountMap.getAccount(fromAddress);
      tx = tx.put('account::' + fromAddress, fromAccount);
    }

    if (toAddress && (toAddress !== '0000000000000000000000000000000000000000000000000000000000000000')) {
      let toAccount = this.accountMap.getAccount(toAddress);
      tx = tx.put('account::' + toAddress, toAccount);
    }

    await tx.write();
  }
}

if (process.platform === 'win32') {
  let rl = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('SIGINT', function () {
    process.emit('SIGINT');
  });
}

module.exports = DB;
