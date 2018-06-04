let env = require('../env');
let Web3 = require('web3');
let Sidechain = require('../abi/Sidechain.json');

let web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let sidechain = web3.eth.contract(Sidechain.abi).at(env.contractAddress);

let storageType = null;
if (env.database == 'level') {
  storageType = './storages/level';
} else if (env.database == 'rocksdb') {
  storageType = './storages/rocksdb';
} else if (env.database == 'postgres') {
  storageType = './storages/postgres';
} else {
  throw new Error('Not supported database.');
}

let Storage = require(storageType);

class StorageManager {
  constructor (storage) {
    this.storage = storage;
    // Load pendingReceipts from DB
    this.init();
  }

  async attach (stageHeight, serializedTx) {
    let txHash = await this.storage.attach(stageHeight, serializedTx);
    return txHash;
  }

  async commitTrees (stageHeight) {
    let trees = await this.storage.commitTrees(stageHeight);
    return trees;
  }

  async setTrees (stageHeight, receiptTree, accountTree) {
    await this.storage.setTrees(stageHeight, receiptTree, accountTree);
  }

  async getBalance (address) {
    let balance = await this.storage.getBalance(address);
    return balance;
  }

  async getTrees (stageHeight) {
    let trees = await this.storage.getTrees(stageHeight);
    return trees;
  }

  async getContractAddress () {
    let contractAddress = await this.storage.getContractAddress();
    return contractAddress;
  }

  async saveContractAddress (contractAddress) {
    await this.storage.saveContractAddress(contractAddress);
  }

  async addOffchainReceipt(receipt) {
    await this.storage.addOffchainReceipt(receipt);
  }

  async getOffchainReceipts (targetStageHeight) {
    let offchainReceipts = await this.storage.getOffchainReceipts(targetStageHeight);
    return offchainReceipts;
  }

  async removeOffchainReceipt (lightTxHash) {
    await this.storage.removeOffchainReceipt(lightTxHash);
  }

  async removeOffchainReceipts (stageHeight) {
    await this.storage.removeOffchainReceipts(stageHeight);
  }

  async init () {
    try {
      await this.storage.init();
    } catch (e) {
      console.error(e);
    }
  }

  async pendingLightTxHashesOfReceipts () {
    let offchainReceiptHashes = await this.storage.pendingLightTxHashesOfReceipts();
    return offchainReceiptHashes;
  }

  async hasPendingReceipts (stageHeight) {
    let hasPendingReceipts = await this.storage.hasPendingReceipts(stageHeight);
    return hasPendingReceipts;
  }

  async pendingReceipts (stageHeight = null) {
    let receipts = await this.storage.pendingReceipts(stageHeight);
    return receipts;
  }

  async getReceiptByLightTxHash (lightTxHash) {
    let receipt = await this.storage.getReceiptByLightTxHash(lightTxHash);
    return receipt;
  }

  async applyLightTx (lightTx) {
    let result = await this.storage.applyLightTx(lightTx);
    return result;
  }
}

let storage = new Storage();
let storageManager = new StorageManager(storage);

// Watch latest block
sidechain.Attach({ toBlock: 'latest' }).watch(async (err, result) => {
  try {
    console.log('attach');
    let stageHeight = result.args._stageHeight;
    // Remove offchain receipt json
    await storageManager.removeOffchainReceipts(stageHeight);
  } catch(e) {
    console.error(e);
  }
});

module.exports = storageManager;
