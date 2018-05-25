let env = require('../../env');
let Web3 = require('web3');
let Sidechain = require('../../abi/Sidechain.json');
let rocksdb = require('level-rocksdb');
let BigNumber = require('bignumber.js');
let TreeManager = require('../utils/tree-manager');
let GSNGenerator = require('../utils/gsn-generator');
let AccountMap = require('../utils/account-map');
let Receipt = require('../../models/receipt');
let ErrorCodes = require('../../errors/codes');
let LightTxTypes = require('../../models/types');
let IndexedMerkleTree = require('../utils/indexed-merkle-tree');
let txDecoder = require('ethereum-tx-decoder');
let abiDecoder = require('abi-decoder');

let chain = rocksdb('./chaindata/rocksdb', { valueEncoding: 'json' });
let web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let sidechain = web3.eth.contract(Sidechain.abi).at(env.sidechainAddress);
let nextContractStageHeight = parseInt(sidechain.stageHeight()) + 1;
let initBalance = '0000000000000000000000000000000000000000000000000000000000000000';

abiDecoder.addABI(Sidechain.abi);

class Level {
  constructor () {
    this.chain = chain;
    this.accountMap = null;
    this.treeManager = null;
    this.gsnGenerator = null;
    this.accountMap = null;
    this.offchainReceiptHashes = null;
    this.offchainReceipts = {};
    this.expectedStageHeight = null;
  }

  async attach (stageHeight, serializedTx) {
    try {
      console.log(stageHeight);
      console.log(serializedTx);
      let decodedTx = txDecoder.decodeTx(serializedTx);
      let functionParams = abiDecoder.decodeMethod(decodedTx.data);

      let receiptRootHash = functionParams.params[1].value[0].slice(2);
      let accountRootHash = functionParams.params[1].value[1].slice(2);
      let trees = await this.getTrees(stageHeight);
      let receiptTree = trees.receiptTree;
      let accountTree = trees.accountTree;

      if ((receiptTree.rootHash === receiptRootHash) &&
          accountTree.rootHash === accountRootHash) {
        let txHash = web3.eth.sendRawTransaction(serializedTx);
        console.log('Committed txHash: ' + txHash);

        // Dump stageHeight for level, rocksdb
        await this.dumpExpectedStageHeight();

        return txHash;
      } else {
        throw new Error('Invalid signed root hashes.');
      }
    } catch (e) {
      throw e;
    }
  }

  async commitTrees (stageHeight) {
    try {
      let accountHashes = this.accountHashes();
      this.increaseExpectedStageHeight();
      let pendingReceipts = this.pendingReceipts(stageHeight);
      let receiptHashes = pendingReceipts.map(receipt => receipt.receiptHash);
      console.log('Building Stage Height: ' + stageHeight);
      let receiptTree = new IndexedMerkleTree(stageHeight, receiptHashes);
      let accountTree = new IndexedMerkleTree(stageHeight, accountHashes);

      this.setTrees(stageHeight, receiptTree, accountTree);
      await this.dumpAll();

      console.log(receiptTree.rootHash);
      console.log(accountTree.rootHash);

      return {
        receiptRootHash: receiptTree.rootHash,
        accountRootHash: accountTree.rootHash
      };
    } catch (e) {
      this.decreaseExpectedStageHeight();
      throw e;
    }
  }

  setAccountMap (accountMap) {
    this.accountMap = accountMap;
  }

  async dumpExpectedStageHeight () {
    await chain.put('stageHeight', this.expectedStageHeight);
  }

  expectedStageHeight () {
    return this.expectedStageHeight;
  }

  async dumpAll () {
    await this.treeManager.dump();
    await this.gsnGenerator.dump();
  }

  setTrees(stageHeight, receiptTree, accountTree) {
    this.treeManager.setTrees(stageHeight, receiptTree, accountTree);
  }

  decreaseExpectedStageHeight () {
    this.expectedStageHeight -= 1;
  }

  increaseExpectedStageHeight () {
    this.expectedStageHeight += 1;
  }

  accountHashes () {
    let accountHashes = this.accountMap.hashes();
    return accountHashes;
  }

  async getBalance (address) {
    let balance = await this.accountMap.getBalance(address);
    return balance;
  }

  async getTrees (stageHeight) {
    let trees = await this.treeManager.getTrees(stageHeight);
    return trees;
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

  async removeOffchainReceipts (stageHeight) {
    let targetLightTxHashes = await this.getOffchainReceipts(stageHeight);
    for (let i = 0; i < targetLightTxHashes.length; i++) {
      let targetLightTxHash = targetLightTxHashes[i];
      delete this.offchainReceipts[targetLightTxHash];
      this.offchainReceiptHashes.splice(this.offchainReceiptHashes.indexOf(targetLightTxHash), 1);
    }

    await this.updateOffchainReceptHashes();
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

  async init () {
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

    // Init contract address
    let contractAddress = await this.getContractAddress();

    if (!contractAddress) {
      await this.saveContractAddress(env.sidechainAddress);
    } else if (env.sidechainAddress != contractAddress) {
      throw new Error('Sidechain address is not consistent.');
    }

    // Init stage height
    let expectedStageHeightFromDB = await this.loadExpectedStageHeight();

    if (!expectedStageHeightFromDB) {
      this.expectedStageHeight = nextContractStageHeight;
    } else {
      this.expectedStageHeight = expectedStageHeightFromDB;
    }

    console.log('expectedStageHeight: ' + this.expectedStageHeight);

    // Init utilities
    try {
      this.treeManager = new TreeManager(this);
      await this.treeManager.initialize(this.expectedStageHeight);

      this.gsnGenerator = new GSNGenerator(this);
      await this.gsnGenerator.initialize();

      this.accountMap = new AccountMap(this);
      await this.accountMap.initialize();
    } catch (e) {
      console.error(e);
    }

    return offchainLightTxHashes;
  }

  pendingLightTxHashesOfReceipts () {
    return this.offchainReceiptHashes;
  }

  async hasPendingReceipts (stageHeight) {
    let receipts = await this.pendingReceipts(stageHeight);
    return (receipts.length > 0);
  }

  pendingReceipts (stageHeight = null) {
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

  async commit (newAddresses, GSN, receipt) {
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

module.exports = Level;
