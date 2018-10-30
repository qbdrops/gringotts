let Storage = require('./storages/postgres');

class StorageManager {
  constructor (web3) {
    this.storage = new Storage(web3);
    this.init();
  }

  async commitTrees (stageHeight) {
    let trees = await this.storage.commitTrees(stageHeight);
    return trees;
  }

  async getExpectedStageHeight () {
    return await this.storage.getExpectedStageHeight();
  }

  async increaseExpectedStageHeight () {
    await this.storage.increaseExpectedStageHeight();
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

  async getFee (stageHeight) {
    let result = await this.storage.getFee(stageHeight);
    return result;
  }
}

module.exports = StorageManager;
