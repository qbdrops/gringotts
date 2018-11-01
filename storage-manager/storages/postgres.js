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
let GetProof = require('../utils/get-proof');
let Model = require('../models');
let EthUtils = require('ethereumjs-util');
let Signer = require('../../utils/signer');

const Sequelize = Model.Sequelize;
const sequelize = Model.sequelize;
const Op = Sequelize.Op;
const EtherEmptyAddress = '0x0000000000000000000000000000000000000000';

let initBalance = '0000000000000000000000000000000000000000000000000000000000000000';
let signer = new Signer();
signer.importPrivateKey(env.signerKey);

let ReceiptModel = Model.receipts;
let AssetModel = Model.assets;
let AssetListModel = Model.asset_lists;
let ContractAddressModel = Model.contract_address;
let ExpectedStageHeightModel = Model.expected_stage_height;
let GSNNumberModel = Model.gsn_number;
let TreeModel = Model.trees;
let AccountSnapshotModel = Model.account_snapshot;
let FeeListModel = Model.fee_lists;

class Postgres {
  constructor (web3) {
    assert(web3 instanceof Web3, 'web3 is invalid.');
    this.web3 = web3;
    this.booster = new this.web3.eth.Contract(Booster.abi, env.contractAddress);
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

  async getExpectedStageHeight (tx = null) {
    let expectedStageHeightModel = await this.expectedStageHeightModel(tx);
    let expectedStageHeight;
    if (!expectedStageHeightModel) {
      expectedStageHeight = parseInt(await this.booster.methods.stageHeight().call()) + 1;
      await ExpectedStageHeightModel.create({
        height: expectedStageHeight
      });
    } else {
      expectedStageHeight = parseInt(expectedStageHeightModel.height);
    }
    return expectedStageHeight;
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

    let tree = await TreeModel.findOne({
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    });
    let accountSnapshot = await AccountSnapshotModel.findOne({
      where: {
        stage_height: stageHeight
      }
    }, {
      transaction: tx
    });

    if (!tree) {
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
      await tree.update({
        stage_height: stageHeight,
        receipt_tree: receiptTree,
        account_tree: accountTree
      }, {
        where: {
          stage_height: stageHeight
        },
        transaction: tx
      });
      await accountSnapshot.update({
        stage_height: stageHeight,
        account_data: accountData,
        asset_roothash: accountHashes
      }, {
        where: {
          stage_height: stageHeight
        },
        transaction: tx
      });
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

  async getReceiptProof (stageHeight, receiptHash, tx = null) {
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

    let proof = new GetProof(stageHeight, receiptHash, trees.receipt_tree).build();

    return proof;
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

    let expectedStageHeight = await this.getExpectedStageHeight();
    console.log('expectedStageHeight: ' + expectedStageHeight);

    let gsnNumberModel = await this.gsnNumberModel();
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
        asset_address: EtherEmptyAddress
      });
      let assetListLength = await this.booster.methods.getAssetAddressesLength().call();
      for (let i = 0; i < assetListLength; i++) {
        let address = await this.booster.methods.assetAddressesArray(i).call();
        let contract = new this.web3.eth.Contract(EIP20.abi, address);
        let name = await contract.methods.symbol().call();
        let decimals = await contract.methods.decimals().call();
        await AssetListModel.create({
          asset_name: name,
          asset_decimals: decimals,
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
      },
      attributes: [
        'id'
      ]
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

  async getReceiptByGSN (GSN, tx = null) {
    let receipt = await ReceiptModel.findOne({
      where: {
        gsn: GSN
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

  async getBalance (address, assetID = null, tx = null) {
    let asset;
    if (!assetID) {
      asset = await AssetModel.findAll({
        where: {
          address: address
        }
      }, {
        transaction: tx
      }).map(e => {
        return {
          assetID: e.asset_id,
          balance: new BigNumber('0x' + e.balance)
        };
      });
      if (asset) {
        return asset;
      } else {
        return initBalance.toString(16).padStart(64, '0');
      }
    } else {
      assetID = assetID.toString().padStart(64, '0');
      asset = await AssetModel.findOne({
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
  }

  async getAsset (address, assetID, tx = null) {
    let asset = await AssetModel.findOne({
      where: {
        address: address, asset_id: assetID
      }
    }, {
      transaction: tx
    });

    if (!asset) {
      asset = AssetModel.build({
        address: address,
        asset_id: assetID,
        balance: initBalance,
        pre_gsn: 0
      }, {
        transaction: tx
      });
      await asset.save();
    }
    return asset;
  }

  async setBalance (address, assetID, balance, preGSN = 0, tx = null) {
    let asset = await this.getAsset(address, assetID, tx);

    if (asset) {
      await asset.update({
        balance: balance,
        pre_gsn: preGSN
      });
    } else {
      asset = AssetModel.build({
        address: address,
        asset_id: assetID,
        balance: balance,
        pre_gsn: preGSN
      }, {
        transaction: tx
      });
      await asset.save();
    }
  }

  async applyLightTx (lightTx) {
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let type = lightTx.type();
    let fromAddress = lightTx.lightTxData.from.toLowerCase();
    let toAddress = lightTx.lightTxData.to.toLowerCase();
    let assetID = lightTx.lightTxData.assetID.toLowerCase();
    let logID = lightTx.lightTxData.logID.toLowerCase();

    let fromBalance = initBalance;
    let toBalance = initBalance;
    let toPreGSN = 0;
    let fromPreGSN = 0;
    let tx;

    try {
      tx = await sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
      });

      let gsnNumberModel = await this.gsnNumberModel(tx);
      if (!gsnNumberModel) {
        throw new Error('Cannot get the newest gsn number.');
      }
      await gsnNumberModel.increment('gsn', {
        transaction: tx
      });
      let gsn = parseInt(gsnNumberModel.gsn, 10);
      let expectedStageHeightModel = await this.expectedStageHeightModel(tx);
      let expectedStageHeight = parseInt(expectedStageHeightModel.height);

      if (type === LightTxTypes.deposit) {
        let oldReceipt = await this.getReceiptByLogID(logID);
        let depositLog = await this.booster.methods.depositLogs('0x' + logID).call();
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
          if (depositLog[1].toLowerCase() != '0x' + toAddress ||
              depositLog[2].toLowerCase() != '0x' + lightTx.lightTxData.value.toLowerCase() ||
              depositLog[3].toLowerCase() != '0x' + assetID) {
            code = ErrorCodes.WRONG_LOG_ID;
            throw new Error('Wrong log id.');
          } else {
            let value = new BigNumber('0x' + lightTx.lightTxData.value);
            let toAsset = await this.getAsset(toAddress, assetID, tx);

            toPreGSN = parseInt(toAsset.pre_gsn, 10);
            toBalance = toAsset.balance;
            toBalance = new BigNumber('0x' + toBalance);
            toBalance = toBalance.plus(value);
            toBalance = toBalance.toString(16).padStart(64, '0');

            await this.setBalance(toAddress, assetID, toBalance, gsn, tx);
          }
        }
      } else if ((type === LightTxTypes.withdrawal) ||
        (type === LightTxTypes.instantWithdrawal)) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);
        let fee = new BigNumber('0x' + lightTx.lightTxData.fee);
        let valuePlusFee = value.plus(fee);
        let fromAsset = await this.getAsset(fromAddress, assetID, tx);

        fromPreGSN = parseInt(fromAsset.pre_gsn, 10);
        fromBalance = fromAsset.balance;
        fromBalance = new BigNumber('0x' + fromBalance);

        if (fromBalance.isGreaterThanOrEqualTo(valuePlusFee)) {
          fromBalance = fromBalance.minus(valuePlusFee);
          fromBalance = fromBalance.toString(16).padStart(64, '0');

          await this.setBalance(fromAddress, assetID, fromBalance, gsn, tx);

          let originFee = await this.getFee(expectedStageHeight, assetID, tx);
          let newFee = new BigNumber('0x' + originFee).plus(fee);
          await this.setFee(expectedStageHeight, assetID, newFee, tx);
        } else {
          code = ErrorCodes.INSUFFICIENT_BALANCE;
          throw new Error('Insufficient balance.');
        }
      } else if (type === LightTxTypes.remittance) {
        let value = new BigNumber('0x' + lightTx.lightTxData.value);
        let fee = new BigNumber('0x' + lightTx.lightTxData.fee);
        let valuePlusFee = value.plus(fee);

        // Get 'from' balance
        let fromAsset = await this.getAsset(fromAddress, assetID, tx);

        fromPreGSN = parseInt(fromAsset.pre_gsn, 10);
        fromBalance = fromAsset.balance;
        fromBalance = new BigNumber('0x' + fromBalance);

        if (fromBalance.isGreaterThanOrEqualTo(valuePlusFee)) {
          // Minus 'from' balance
          fromBalance = fromBalance.minus(valuePlusFee);
          fromBalance = fromBalance.toString(16).padStart(64, '0');
          // Save 'from' balance
          await this.setBalance(fromAddress, assetID, fromBalance, gsn, tx);

          // Get 'to' balance
          let toAsset = await this.getAsset(toAddress, assetID, tx);

          toPreGSN = parseInt(toAsset.pre_gsn, 10);
          toBalance = toAsset.balance;
          toBalance = new BigNumber('0x' + toBalance);
          // Plus 'to' balance
          toBalance = toBalance.plus(value);
          toBalance = toBalance.toString(16).padStart(64, '0');

          // Save 'to' balance
          await this.setBalance(toAddress, assetID, toBalance, gsn, tx);

          // Give fee to gringotts
          let originFee = await this.getFee(expectedStageHeight, assetID, tx);
          let newFee = new BigNumber('0x' + originFee).plus(fee);
          await this.setFee(expectedStageHeight, assetID, newFee, tx);
        } else {
          code = ErrorCodes.INSUFFICIENT_BALANCE;
          throw new Error('Insufficient balance.');
        }
      } else {
        code = ErrorCodes.INVALID_LIGHT_TX_TYPE;
        throw new Error('Invalid light transaction type.');
      }

      let receiptJson = lightTx.toJson();
      receiptJson.receiptData = {
        stageHeight: expectedStageHeight,
        GSN: gsn,
        fromPreGSN: fromPreGSN,
        toPreGSN: toPreGSN,
        lightTxHash: lightTx.lightTxHash,
        fromBalance: fromBalance,
        toBalance: toBalance,
      };

      let receipt = new Receipt(receiptJson);
      let signedReceipt = signer.signWithBoosterKey(receipt);
      await ReceiptModel.create({
        gsn: signedReceipt.receiptData.GSN,
        log_id: signedReceipt.lightTxData.logID,
        stage_height: signedReceipt.receiptData.stageHeight,
        light_tx_hash: signedReceipt.lightTxHash,
        receipt_hash: signedReceipt.receiptHash,
        from: signedReceipt.lightTxData.from,
        to: signedReceipt.lightTxData.to,
        value: signedReceipt.lightTxData.value,
        fee: signedReceipt.lightTxData.fee,
        asset_id: signedReceipt.lightTxData.assetID,
        data: signedReceipt.toJson()
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

  async getFee (stageHeight, assetID = null, tx = null) {
    stageHeight = stageHeight.toString(16).padStart(64, '0').slice(-64);
    if (assetID) {
      assetID = assetID.toString(16).padStart(64, '0').slice(-64);
      let assetFee = await FeeListModel.findOne({
        where: {
          stage_height: stageHeight,
          asset_id: assetID
        }
      }, {
        transaction: tx
      });
      if (assetFee) {
        assetFee = assetFee.fee;
      } else {
        assetFee = initBalance;
      }
      return assetFee;
    } else {
      let assetFees = await FeeListModel.findAll({
        where: {
          stage_height: stageHeight
        }
      }, {
        transaction: tx
      }).map((data) => {
        return {
          assetID: data.asset_id,
          fee: data.fee
        }
      });
      if (!assetFees) {
        assetFees = [];
      }
      return assetFees;
    }
  }

  async setFee (stageHeight, assetID, value, tx = null) {
    stageHeight = stageHeight.toString(16).padStart(64, '0').slice(-64);
    assetID = assetID.toString(16).padStart(64, '0').slice(-64);
    value = value.toString(16).padStart(64, '0').slice(-64);
    let assetFee = await FeeListModel.findOne({
      where: {
        stage_height: stageHeight,
        asset_id: assetID
      }
    }, {
      transaction: tx
    });

    if (assetFee) {
      await assetFee.update({
        stage_height: stageHeight,
        asset_id: assetID,
        fee: value
      }, {
        transaction: tx
      });
    } else {
      assetFee = await FeeListModel.build({
        stage_height: stageHeight,
        asset_id: assetID,
        fee: value
      }, {
        transaction: tx
      });
      await assetFee.save();
    }
  }
}

module.exports = Postgres;
