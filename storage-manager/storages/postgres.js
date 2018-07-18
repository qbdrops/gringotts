let assert = require('assert');
let env = require('../../env');
let Web3 = require('web3');
let Booster = require('../../abi/Booster.json');
let EIP20 = require('../../abi/EIP20.json');
let BigNumber = require('bignumber.js');
let Receipt = require('../../models/receipt');
let ErrorCodes = require('../../errors/codes');
let LightTxTypes = require('../../models/types');
let IndexedMerkleTree = require('../utils/indexed-merkle-tree');
let txDecoder = require('ethereum-tx-decoder');
let abiDecoder = require('abi-decoder');
let Model = require('../models');
let EthUtils = require('ethereumjs-util');

const Sequelize = Model.Sequelize;
const sequelize = Model.sequelize;
const Op = Sequelize.Op;

let web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let booster = web3.eth.contract(Booster.abi).at(env.contractAddress);
let nextContractStageHeight = parseInt(booster.stageHeight()) + 1;
let initBalance = '0000000000000000000000000000000000000000000000000000000000000000';

let ReceiptModel = Model.receipts;
let AssetModel = Model.assets;
let AssetListModel = Model.asset_lists;
let ContractAddressModel = Model.contract_address;
let ExpectedStageHeightModel = Model.expected_stage_height;
let GSNNumberModel = Model.gsn_number;
let TreeModel = Model.trees;
let AccountSnapshotModel = Model.account_snapshot;

abiDecoder.addABI(Booster.abi);

class Postgres {
  async attach (stageHeight, serializedTx) {
    try {
      let decodedTx = txDecoder.decodeTx(serializedTx);
      let functionParams = abiDecoder.decodeMethod(decodedTx.data);
      let receiptRootHash = functionParams.params[1].value[0].slice(2);
      let accountRootHash = functionParams.params[1].value[1].slice(2);
      let trees = await this.getTrees(stageHeight);

      let receiptTree = trees.receipt_tree;
      let accountTree = trees.account_tree;

      if ((receiptTree.rootHash === receiptRootHash) &&
        accountTree.rootHash === accountRootHash) {
        let txHash = web3.eth.sendRawTransaction(serializedTx);
        console.log('Committed txHash: ' + txHash);
        return txHash;
      } else {
        throw new Error('Invalid signed root hashes.');
      }
    } catch (e) {
      throw e;
    }
  }

  async commitTrees (stageHeight) {
    let tx;
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    try {
      tx = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });
      let accountData = await this.accountData(tx);
      let accountHashes = this.accountHashes(stageHeight, accountData);

      await this.increaseExpectedStageHeight(tx);
      let receiptHashes = await this.pendingReceiptHashes(stageHeight, tx);

      console.log('Building Stage Height: ' + stageHeight);

      let receiptTree = new IndexedMerkleTree(stageHeight, receiptHashes);
      let accountTree = new IndexedMerkleTree(stageHeight, Object.values(accountHashes));

      await this.setTrees(stageHeight, receiptTree, accountTree, accountData, accountHashes, tx);
      // ipfs 
      await tx.commit();
      return {
        receiptRootHash: receiptTree.rootHash,
        accountRootHash: accountTree.rootHash
        // ipfs adress
      };
    } catch (e) {
      console.error(e);
      // rollback all modifications in the leveldb transaction
      await tx.rollback();
      return { ok: false, code: code, message: e.message };
    }
  }

  async increaseExpectedStageHeight (tx = null) {
    let expectedStageHeightModel = await this.expectedStageHeightModel(tx);
    let result = await expectedStageHeightModel.increment('height', {
      transaction: tx
    });
    return result;
  }

  async expectedStageHeightModel (tx = null) {
    // SQL SELECT
    let expectedStageHeight = await ExpectedStageHeightModel.findById(1, {
      transaction: tx
    });

    return expectedStageHeight;
  }

  async gsnNumberModel (tx = null) {
    let gsnNumberModel = await GSNNumberModel.findById(1, {
      transaction: tx
    });

    return gsnNumberModel;
  }

  async setTrees (stageHeight, receiptTree, accountTree, accountData, accountHashes, tx = null) {
    if (stageHeight) {
      stageHeight = stageHeight.toString(16).slice(-64).padStart(64, '0');
    }

    let result = await TreeModel.findOne({
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    });

    if (!result) {
      await TreeModel.create({
        stage_height: stageHeight,
        receipt_tree: receiptTree,
        account_tree: accountTree
      }, {
        transaction: tx
      });
      await AccountSnapshotModel.create({
        stage_height: stageHeight,
        account_data: accountData,
        asset_roothash: accountHashes
      }, {
        transaction: tx
      });
    } else {
      throw new Error('this stage is already save in DB!');
    }
  }

  async accountData (tx = null) {
    let assets = await AssetModel.findAll({
      'order': [
        ['address', 'ASC'],
        ['asset_id', 'ASC']
      ]
    }, {
      transaction: tx
    });

    let accountData = assets.reduce((acc, asset) => {
      acc[asset.address] = acc[asset.address] || {};
      acc[asset.address][asset.asset_id] = asset.balance;
      return acc;
    }, {});

    return accountData;
  }

  accountHashes (stageHeight, accountData) {
    let result = Object.keys(accountData)
      .reduce((acc, address) => {
        let balances = accountData[address];
        let assetHashes = Object.keys(balances).map((assetID) => {
          return this._sha3(assetID + balances[assetID]);
        });
        let assetTree = new IndexedMerkleTree(stageHeight, assetHashes);
        let roothash = this._sha3(address + assetTree.rootHash);
        acc[address] = roothash;
        return acc;
      }, {});

    return result;
  }

  async getAccountsByStageHeight (stageHeight, tx = null) {
    let accounts = await AccountSnapshotModel.findOne({
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    });
    return accounts.account_data;
  }

  async getTrees (stageHeight, tx = null) {
    if (stageHeight) {
      stageHeight = stageHeight.toString(16).padStart(64, '0').slice(-64);
    }
    let trees = await TreeModel.findOne({
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    });
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

  addOffchainReceipt (receipt) {
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
    if (stageHeight) {
      stageHeight = stageHeight.toString(16).slice(-64).padStart(64, '0');
    }
    let result = ReceiptModel.update({
      onchain: true
    }, {
      where: {
        stage_height: stageHeight
      }
    });
    return result;
  }

  async init () {
    assert(env.contractAddress, 'Booster address is empty.');
    let contractAddress = await ContractAddressModel.findById(1);
    if (!contractAddress && env.contractAddress) {
      await ContractAddressModel.create({
        address: env.contractAddress
      });
    } else if (contractAddress && (contractAddress.address != env.contractAddress)) {
      throw new Error('Booster address is not consistent.');
    }

    let expectedStageHeightModel = await ExpectedStageHeightModel.findById(1);
    let expectedStageHeight;
    if (!expectedStageHeightModel) {
      expectedStageHeight = nextContractStageHeight;
      await ExpectedStageHeightModel.create({
        height: expectedStageHeight
      });
    } else {
      expectedStageHeight = parseInt(expectedStageHeightModel.height, 16);
    }

    console.log('expectedStageHeight: ' + expectedStageHeight);

    let gsnNumberModel = await GSNNumberModel.findById(1);
    let gsn;
    if (!gsnNumberModel) {
      gsn = 0;
      await GSNNumberModel.create({
        gsn: gsn
      });
    } else {
      gsn = parseInt(gsnNumberModel.gsn, 10);
    }

    console.log('gsn: ' + gsn);

    let assetList = await AssetListModel.findById(1);
    if (!assetList) {
      await AssetListModel.create({
        asset_name: 'ETH',
        asset_decimals: 18,
        asset_address: '0x' + '0'.padStart(40, '0')
      });
      let assetListLength = booster.getAssetAddressesLength();
      for (let i = 0; i < assetListLength.toNumber(); i++) {
        let address = booster.assetAddressesArray(i);
        let contract = web3.eth.contract(EIP20.abi).at(address);
        let name = contract.symbol();
        let decimals = contract.decimals();
        await AssetListModel.create({
          asset_name: name,
          asset_decimals: decimals.toNumber(),
          asset_address: address
        });
      }
    }
  }

  async pendingLightTxHashesOfReceipts () {
    let receipts = await ReceiptModel.findAll({
      attributes: ['receipt_hash'],
      where: {
        onchain: false
      }
    }).map((e) => {
      return e.receipt_hash;
    });
    return receipts;
  }

  async hasPendingReceipts (stageHeight) {
    if (stageHeight) {
      stageHeight = stageHeight.toString(16).padStart(64, '0').slice(-64);
    }
    let receipts = await ReceiptModel.findOne({
      where: {
        stage_height: stageHeight,
        onchain: false
      }
    });
    return !!(receipts);
  }

  async pendingReceiptHashes (stageHeight, tx = null) {
    if (stageHeight) {
      stageHeight = stageHeight.toString(16).padStart(64, '0').slice(-64);
    }
    let receipts = await ReceiptModel.findAll({
      attributes: ['receipt_hash'],
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    }).map((e) => {
      return e.receipt_hash;
    });
    return receipts;
  }

  async getReceiptByLogID (logID, tx = null) {
    let receipt = await ReceiptModel.findOne({
      where: {
        log_id: logID
      }
    }, {
      transaction: tx
    });
    return receipt;
  }

  async getReceiptByLightTxHash (lightTxHash, tx = null) {
    let receipt = await ReceiptModel.findOne({
      where: {
        light_tx_hash: lightTxHash
      }
    }, {
      transaction: tx
    });
    return receipt;
  }

  async getReceiptByStageHeight (stageHeight, tx = null) {
    let receipts = await ReceiptModel.findAll({
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    });
    return receipts;
  }

  async getBalance (address, assetID, tx = null) {
    if (!assetID) {
      assetID = '0'.padStart(64, '0');
    } else {
      assetID = assetID.toString().padStart(64, '0');
    }
    let asset = await AssetModel.findOne({
      where: {
        address: address,
        asset_id: assetID
      }
    }, {
      transaction: tx
    });

    if (asset) {
      return asset.balance;
    } else {
      return initBalance.toString(16).padStart(64, '0');
    }
  }

  async getAsset (address, assetID, tx = null) {
    let asset = await AssetModel.findOne({
      where: {
        address: address, asset_id: assetID
      }
    }, {
      transaction: tx
    });
    return asset;
  }

  async setBalance (address, assetID, balance, tx = null) {
    let asset = await this.getAsset(address, assetID, tx);

    if (asset) {
      await asset.update({
        address: address,
        asset_id: assetID,
        balance: balance
      });
    } else {
      asset = AssetModel.build({
        address: address,
        asset_id: assetID,
        balance: balance
      });
      await asset.save();
    }
  }

  async applyLightTx (lightTx) {
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let type = lightTx.type();
    let fromAddress = lightTx.lightTxData.from;
    let toAddress = lightTx.lightTxData.to;
    let assetID = lightTx.lightTxData.assetID;
    let logID = lightTx.lightTxData.logID;

    let fromBalance = initBalance;
    let toBalance = initBalance;
    let tx;
    try {
      tx = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });
      if (type === LightTxTypes.deposit) {
        let oldReceipt = await this.getReceiptByLogID(logID);
        let depositLog = booster.depositLogs('0x' + logID);
        /**
         * depositLog[0]: stage height
         * depositLog[1]: users' address
         * depositLog[2]: users' deposit value
         * depositLog[3]: users' deposit asset ID
         * depositLog[4]: if users' funds are relayed to booster
         */
        if (oldReceipt || depositLog[4] == true) {
          code = ErrorCodes.CONTAINS_KNOWN_LOG_ID;
          throw new Error('Contains known log id.');
        } else {
          if (depositLog[1] != '0x' + toAddress ||
              depositLog[2] != '0x' + lightTx.lightTxData.value ||
              depositLog[3] != '0x' + lightTx.lightTxData.assetID) {
            code = ErrorCodes.WRONG_LOG_ID;
            throw new Error('Wrong log id.');
          } else {
            let value = new BigNumber('0x' + lightTx.lightTxData.value);
            toBalance = await this.getBalance(toAddress, assetID, tx);

            toBalance = new BigNumber('0x' + toBalance);
            toBalance = toBalance.plus(value);
            toBalance = toBalance.toString(16).padStart(64, '0');

            await this.setBalance(toAddress, assetID, toBalance, tx);
          }
        }
      } else if ((type === LightTxTypes.withdrawal) ||
        (type === LightTxTypes.instantWithdrawal)) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);
        fromBalance = await this.getBalance(fromAddress, assetID, tx);

        fromBalance = new BigNumber('0x' + fromBalance);
        if (fromBalance.isGreaterThanOrEqualTo(value)) {
          fromBalance = fromBalance.minus(value);
          fromBalance = fromBalance.toString(16).padStart(64, '0');

          await this.setBalance(fromAddress, assetID, fromBalance, tx);
        } else {
          code = ErrorCodes.INSUFFICIENT_BALANCE;
          throw new Error('Insufficient balance.');
        }
      } else if (type === LightTxTypes.remittance) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);

        // Get 'from' balance
        fromBalance = await this.getBalance(fromAddress, assetID, tx);
        fromBalance = new BigNumber('0x' + fromBalance);
        if (fromBalance.isGreaterThanOrEqualTo(value)) {
          // Minus 'from' balance
          fromBalance = fromBalance.minus(value);
          fromBalance = fromBalance.toString(16).padStart(64, '0');
          // Save 'from' balance
          await this.setBalance(fromAddress, assetID, fromBalance, tx);

          // Get 'to' balance
          toBalance = await this.getBalance(toAddress, assetID, tx);
          toBalance = new BigNumber('0x' + toBalance);
          // Plus 'to' balance
          toBalance = toBalance.plus(value);
          toBalance = toBalance.toString(16).padStart(64, '0');
          // Save 'to' balance
          await this.setBalance(toAddress, assetID, toBalance, tx);
        } else {
          code = ErrorCodes.INSUFFICIENT_BALANCE;
          throw new Error('Insufficient balance.');
        }
      } else {
        code = ErrorCodes.INVALID_LIGHT_TX_TYPE;
        throw new Error('Invalid light transaction type.');
      }

      let expectedStageHeightModel = await this.expectedStageHeightModel(tx);
      let expectedStageHeight = expectedStageHeightModel.height;

      let gsnNumberModel = await this.gsnNumberModel(tx);
      await gsnNumberModel.increment('gsn', {
        transaction: tx
      });

      let gsn = gsnNumberModel.gsn;

      let receiptJson = lightTx.toJson();
      receiptJson.receiptData = {
        stageHeight: parseInt(expectedStageHeight, 10),
        GSN: parseInt(gsn, 10),
        lightTxHash: lightTx.lightTxHash,
        fromBalance: fromBalance,
        toBalance: toBalance,
      };

      let receipt = new Receipt(receiptJson);
      await ReceiptModel.create({
        gsn: receipt.receiptData.GSN,
        log_id: receipt.lightTxData.logID,
        stage_height: receipt.receiptData.stageHeight,
        light_tx_hash: receipt.lightTxHash,
        receipt_hash: receipt.receiptHash,
        from: receipt.lightTxData.from,
        to: receipt.lightTxData.to,
        value: receipt.lightTxData.value,
        data: receipt.toJson()
      }, {
        transaction: tx
      });

      await tx.commit();

      return { ok: true, receipt: receipt };
    } catch (e) {
      console.error(e);
      // rollback all modifications in the leveldb transaction
      await tx.rollback();
      return { ok: false, code: code, message: e.message };
    }
  }

  async getReceiptsByAddress (address) {
    let result = await ReceiptModel.findAll({
      where: {
        [Op.or]: [
          { from: address },
          { to: address }]
      },
      order: [['gsn', 'DESC']]
    }).map(receipt => receipt.data);
    return result;
  }

  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }

  async getAssetList () {
    let result = await AssetListModel.findAll({
      raw: true
    }).map(asset => {
      return {
        asset_name: asset.asset_name,
        asset_decimals: asset.asset_decimals,
        asset_address: asset.asset_address
      };
    });
    return result;
  }
}

module.exports = Postgres;
