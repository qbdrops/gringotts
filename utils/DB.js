let level = require('level');
let chain = level('./sidechaindata', { valueEncoding: 'json' });
let txs = [];

class DB {
  constructor () {
    this.chain = chain;
    this.treeManager = null;
    this.accountMap = null;
    this.gsnGenerator = null;
    this.offchainReceipts = null;

    setInterval(async () => {
      if (txs.length > 0) {
        while (txs.length > 0) {
          let tx = txs.shift();
          try {
            await tx.write();
          } catch (e) {
            console.error(e);
          }
        }
        if (this.offchainReceipts.length > 0) {
          await chain.put('offchain_receipts', this.offchainReceipts);
        }
      }
    }, 1000);

    process.on('SIGINT', async () => {
      if (txs.length > 0) {
        while (txs.length > 0) {
          let tx = txs.shift();
          try {
            await tx.write();
          } catch (e) {
            console.error(e);
          }
        }
      }
    
      if (this.offchainReceipts.length > 0) {
        await chain.put('offchain_receipts', this.offchainReceipts);
      }
      process.exit();
    });
  }

  addOffchainReceipt(offchainLightTxHash) {
    this.offchainReceipts.push(offchainLightTxHash);
  }

  async getOffchainReceipts (targetStageHeight) {
    targetStageHeight = parseInt(targetStageHeight, 16);
    let receipts = [];
    for (let i = 0; i < this.offchainReceipts.length; i++) {
      let lightTxHash = this.offchainReceipts[i];
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
    this.offchainReceipts.splice(this.offchainReceipts.indexOf(lightTxHash), 1);
  }

  async removeOffchainReceipts (targetLightTxHashes) {
    for (let i = 0; i < targetLightTxHashes.length; i++) {
      this.offchainReceipts.splice(this.offchainReceipts.indexOf(targetLightTxHashes[i]), 1);
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

  async initPendingReceipts () {
    let offchainLightTxHashes = [];
    try {
      offchainLightTxHashes = await chain.get('offchain_receipts');
    } catch (e) {
      if (e.type == 'NotFoundError') {
        await chain.put('offchain_receipts', offchainLightTxHashes);
      } else {
        throw e;
      }
    }

    this.offchainReceipts = offchainLightTxHashes;
    return offchainLightTxHashes;
  }

  pendingLightTxHashesOfReceipts () {
    return this.offchainReceipts;
  }

  async pendingReceipts (stageHeight = null) {
    let receipts = [];
    for (let i = 0; i < this.offchainReceipts.length; i++) {
      let offchainLightTxHash = this.offchainReceipts[i];
      let receipt = await chain.get('receipt::' + offchainLightTxHash);
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
    await chain.put('offchain_receipts', this.offchainReceipts);
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

  batch (newAddresses, GSN, receipt) {
    let fromAddress = receipt.lightTxData.from;
    let toAddress = receipt.lightTxData.to;
    let tx = chain.batch().
      put('GSN', GSN).
      put('receipt::' + receipt.lightTxHash, receipt.toJson());

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

    txs.push(tx);
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
