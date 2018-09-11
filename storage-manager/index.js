let env = require('../env');
let Web3 = require('web3');
let Booster = require('../abi/Booster.json');

let web3 = new Web3(env.web3Url);
let booster = new web3.eth.Contract(Booster.abi, env.contractAddress);
let Storage = require('./storages/postgres');

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

  async getBalance (address, assetID) {
    let balance = await this.storage.getBalance(address, assetID);
    return balance;
  }

  async getTrees (stageHeight) {
    let trees = await this.storage.getTrees(stageHeight);
    return trees;
  }

  async getReceiptProof (stageHeight, receiptHash) {
    let proof = await this.storage.getReceiptProof(stageHeight, receiptHash);
    return proof;
  }

  async getContractAddress () {
    let contractAddress = await this.storage.getContractAddress();
    return contractAddress;
  }

  async saveContractAddress (contractAddress) {
    await this.storage.saveContractAddress(contractAddress);
  }

  async addOffchainReceipt (receipt) {
    await this.storage.addOffchainReceipt(receipt);
  }

  async getOffchainReceipts (targetStageHeight) {
    let offchainReceipts = await this.storage.getOffchainReceipts(targetStageHeight);
    return offchainReceipts;
  }

  async getAccountBalances () {
    let balances = await this.storage.getAccountBalances();
    return balances;
  }

  async getAccountsByStageHeight (stageHeight) {
    let accounts = await this.storage.getAccountsByStageHeight(stageHeight);
    return accounts;
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

  async getReceiptByStageHeight (stageHeight) {
    let receipts = await this.storage.getReceiptByStageHeight(stageHeight);
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

  async getReceiptsByAddress (address) {
    let result = await this.storage.getReceiptsByAddress(address);
    return result;
  }

  async getAssetList () {
    let result = await this.storage.getAssetList();
    return result;
  }
}

let storage = new Storage();
let storageManager = new StorageManager(storage);

// Watch latest block
booster.events.Attach({
  toBlock: 'latest' 
}, async (err, result) => {
  if (err) console.error(err);
  try {
    console.log('attach');
    let stageHeight = result.returnValues._stageHeight;
    // Remove offchain receipt json
    await storageManager.removeOffchainReceipts(stageHeight);
  } catch (e) {
    console.error(e);
  }
});

module.exports = storageManager;
