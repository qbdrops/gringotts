let env = require('../../env');
let Web3 = require('web3');
let Sidechain = require('../../abi/Sidechain.json');
let BigNumber = require('bignumber.js');
let Receipt = require('../../models/receipt');
let ErrorCodes = require('../../errors/codes');
let LightTxTypes = require('../../models/types');

let web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let sidechain = web3.eth.contract(Sidechain.abi).at(env.sidechainAddress);
let nextContractStageHeight = parseInt(sidechain.stageHeight()) + 1;
let initBalance = '0000000000000000000000000000000000000000000000000000000000000000';

class Postgres {
  async dumpExpectedStageHeight () {
    // in-process database only
  }

  expectedStageHeight () {
    // SQL SELECT
    return this.expectedStageHeight;
  }

  async dumpAll () {
    // in-process database only
  }

  async setTrees(stageHeight, receiptTree, accountTree) {
    // SQL transactions INSERT receipt_trees, account_trees
    this.treeManager.setTrees(stageHeight, receiptTree, accountTree);
  }

  async decreaseExpectedStageHeight () {
    // SQL UPDATE
    this.expectedStageHeight -= 1;
  }

  increaseExpectedStageHeight () {
    // SQL UPDATE
    this.expectedStageHeight += 1;
  }

  accountHashes () {
    // SQL SELECT
    let accountHashes = this.accountMap.hashes();
    return accountHashes;
  }

  async getBalance (address) {
    // SQL SELECT
    let balance = await this.accountMap.getBalance(address);
    return balance;
  }

  async getTrees (stageHeight) {
    // SQL SELECT
    let trees = await this.treeManager.getTrees(stageHeight);
    return trees;
  }

  async getContractAddress () {
    // SQL SELECT
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
    // SQL INSERT
    await chain.put('contract_address', contractAddress);
  }

  addOffchainReceipt(receipt) {
    // SQL INSERT
    let offchainLightTxHash = receipt.lightTxHash;
    this.offchainReceipts[offchainLightTxHash] = receipt;
    this.offchainReceiptHashes.push(offchainLightTxHash);
  }

  async getOffchainReceipts (targetStageHeight) {
    // SQL SELECT
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
    // SQL DELETE
    this.offchainReceiptHashes.splice(this.offchainReceiptHashes.indexOf(lightTxHash), 1);
  }

  async removeOffchainReceipts (stageHeight) {
    // SQL DELETE
    let targetLightTxHashes = await this.getOffchainReceipts(stageHeight);
    for (let i = 0; i < targetLightTxHashes.length; i++) {
      let targetLightTxHash = targetLightTxHashes[i];
      delete this.offchainReceipts[targetLightTxHash];
      this.offchainReceiptHashes.splice(this.offchainReceiptHashes.indexOf(targetLightTxHash), 1);
    }

    await this.updateOffchainReceptHashes();
  }

  async loadExpectedStageHeight () {
    // leveldb, rocksdb only
  }

  async dumpStageHeight (stageHeight) {
    // leveldb, rocksdb only
  }

  async initPendingReceipts () {
    // leveldb, rocksdb only
  }

  pendingLightTxHashesOfReceipts () {
    // SQL SELECT receipts
    return this.offchainReceiptHashes;
  }

  async hasPendingReceipts (stageHeight) {
    // SQL SELECT
    let receipts = await this.pendingReceipts(stageHeight);
    return (receipts.length > 0);
  }

  async pendingReceipts (stageHeight = null) {
    // SQL SELECT
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
    // leveldb, rocksdb only
  }

  async getReceiptByLightTxHash (lightTxHash) {
    // SQL SELECT
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
    // leveldb, rocksdb only
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
    // leveldb, rocksdb only
    await chain.put('trees::' + stageHeight.toString(), trees);
  }

  async loadGSN () {
    // leveldb, rocksdb only
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
    // leveldb, rocksdb only
    await chain.put('GSN', GSN);
  }

  async loadAccounts () {
    // leveldb, rocksdb only
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

  async begin () {
    // SQL transaction begin
  }

  async rollback () {
    // SQL transaction rollback
  }

  async commit (newAddresses, GSN, receipt) {
    // SQL transaction commit
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

  async applyLightTx (lightTx) {
    // SQL transaction begin, commit, rollback
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let type = lightTx.type();
    let fromAddress = lightTx.lightTxData.from;
    let toAddress = lightTx.lightTxData.to;

    let isNewFromAddress = this.accountMap.isNewAddress(fromAddress);
    let isNewToAddress = this.accountMap.isNewAddress(toAddress);

    let fromBalance = initBalance;
    let toBalance = initBalance;
    let oldFromBalance;
    let oldToBalance;
    try {
      if (type === LightTxTypes.deposit) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);
        toBalance = this.accountMap.getBalance(toAddress);

        oldToBalance = toBalance;
        toBalance = new BigNumber('0x' + toBalance);
        toBalance = toBalance.plus(value);
        toBalance = toBalance.toString(16).padStart(64, '0');
        this.accountMap.setBalance(toAddress, toBalance);
      } else if ((type === LightTxTypes.withdrawal) ||
                (type === LightTxTypes.instantWithdrawal)) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);
        fromBalance = this.accountMap.getBalance(fromAddress);

        oldFromBalance = fromBalance;
        fromBalance = new BigNumber('0x' + fromBalance);
        if (fromBalance.isGreaterThanOrEqualTo(value)) {
          fromBalance = fromBalance.minus(value);
          fromBalance = fromBalance.toString(16).padStart(64, '0');
          this.accountMap.setBalance(fromAddress, fromBalance);
        } else {
          code = ErrorCodes.INSUFFICIENT_BALANCE;
          throw new Error('Insufficient balance.');
        }
      } else if (type === LightTxTypes.remittance) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);
  
        fromBalance = this.accountMap.getBalance(fromAddress);
        oldFromBalance = fromBalance;
        toBalance = this.accountMap.getBalance(toAddress);
        oldToBalance = toBalance;

        fromBalance = new BigNumber('0x' + fromBalance);
        toBalance = new BigNumber('0x' + toBalance);
        if (fromBalance.isGreaterThanOrEqualTo(value)) {
          fromBalance = fromBalance.minus(value);
          toBalance = toBalance.plus(value);

          fromBalance = fromBalance.toString(16).padStart(64, '0');
          toBalance = toBalance.toString(16).padStart(64, '0');

          this.accountMap.setBalance(fromAddress, fromBalance);
          this.accountMap.setBalance(toAddress, toBalance);
        } else {
          code = ErrorCodes.INSUFFICIENT_BALANCE;
          throw new Error('Insufficient balance.');
        }
      } else {
        code = ErrorCodes.INVALID_LIGHT_TX_TYPE;
        throw new Error('Invalid light transaction type.');
      }

      // GSN
      let gsn = this.gsnGenerator.getGSN();
      let receiptJson = lightTx.toJson();
      receiptJson.receiptData = {
        stageHeight: this.expectedStageHeight,
        GSN: gsn,
        lightTxHash: lightTx.lightTxHash,
        fromBalance: fromBalance,
        toBalance: toBalance,
      };
  
      let receipt = new Receipt(receiptJson);

      try {
        await this.getReceiptByLightTxHash(receipt.lightTxHash);
      } catch (e) {
        if (e.type == 'NotFoundError') {
          // No known receipt, do nothing
        } else {
          code = ErrorCodes.SOMETHING_WENT_WRONG;
          throw e;
        }
      }

      this.addOffchainReceipt(receipt);
      let newAddresses = [];
  
      if (isNewFromAddress) {
        newAddresses.push(fromAddress);
      }
  
      if (isNewToAddress) {
        newAddresses.push(toAddress);
      }

      await this.commit(newAddresses, gsn, receipt);
  
      return { ok: true, receipt: receipt };
    } catch (e) {
      console.error(e);
      // rollback all modifications in the leveldb transaction
      this.removeOffchainReceipt(lightTx.lightTxHash);
      // rollback balances in memory
      if (type === LightTxTypes.deposit) {
        this.accountMap.setBalance(toAddress, oldToBalance);
      } else if ((type === LightTxTypes.withdrawal) ||
                (type === LightTxTypes.instantWithdrawal)) {
        this.accountMap.setBalance(fromAddress, oldFromBalance);
      } else if (type === LightTxTypes.remittance) {
        this.accountMap.setBalance(fromAddress, oldFromBalance);
        this.accountMap.setBalance(toAddress, oldToBalance);
      }
      return { ok: false, code: code, message: e.message };
    }
  }
}

module.exports = Postgres;
