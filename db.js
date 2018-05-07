let env = require('./env');
let ErrorCodes = require('./errors/codes');
let EthUtils = require('ethereumjs-util');
let MongoClient = require('mongodb').MongoClient;

let level = require('level');
let chain = level('./sidechaindata', { valueEncoding: 'json' });

let url = env.mongodbUrl;
let stopReceiveStage = null;
let acceptableStage = null;

let DB = function () {
  this.chain = chain;
  this.getSidechain = () => {
    return this.chain;
  },
  this.getStopReceiveStage = () => {
    return stopReceiveStage;
  },
  this.acceptStage = (stageHeight) => {
    acceptableStage = stageHeight;
  },
  this.cancelStage = () => {
    acceptableStage = null;
  },
  this.relax = () => {
    stopReceiveStage = null;
  },
  this.getOrNewStageHeight = async () => {
    try {
      let collection = await this.db.collection('stage_height');
      let lastestStage = await collection.findOne({ _id: 1 });
      if (lastestStage) {
        let height = lastestStage.stageHeight;
        return height;
      } else {
        let result = await collection.save({ _id: 1, stageHeight: 0 });
        if (result) {
          return 0;
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  this.pendingRootHashes = async () => {
    let pendingRootHashes = await chain.get('pending_roothashes');
    pendingRootHashes = pendingRootHashes.filter((pendingRootHash) => {
      return pendingRootHash.onChain == false;
    });
    return pendingRootHashes;
  };

  this.pushPendingRootHash = async (rootHash, stageHeight) => {
    let pendingRootHashes;
    let element = { rootHash: rootHash, stageHeight: stageHeight, onChain: false };
    try {
      pendingRootHashes = await chain.get('pending_roothashes');
      pendingRootHashes.push(element);
      await chain.put('pending_roothashes', pendingRootHashes);
    } catch (e) {
      if (e.type == 'NotFoundError') {
        pendingRootHashes = [element];
        await chain.put('pending_roothashes', pendingRootHashes);
      } else {
        throw e;
      }
    }
  };

  this.clearPendingRootHash = async (rootHash) => {
    let pendingRootHashes = await chain.get('pending_roothashes');
    for (let i = 0; i < pendingRootHashes.length; i++) {
      let pendingRootHash = pendingRootHashes[i];
      if (pendingRootHash.rootHash == rootHash) {
        pendingRootHashes[i] = { rootHash: rootHash, stageHeight: pendingRootHash.stageHeight, onChain: true };
        await chain.put('pending_roothashes', pendingRootHashes);
        break;
      }
    }
  };

  this.pendingReceipts = async (stageHeight = null, lock = false) => {
    let receipts;
    try {
      receipts = await chain.get('offchain_receipts');
      if (stageHeight) {
        if (lock) {
          stopReceiveStage = stageHeight;
        }
        receipts = receipts.filter((receipt) => {
          return parseInt(receipt.lightTxData.stageHeight) == stageHeight;
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
    await chain.put('offchain_receipts', JSON.stringify(offchainReceipts));
  };

  this.stageHeight = async () => {
    try {
      let collection = await this.db.collection('payments');
      let result = await collection.find().sort({ stageHeight: -1 }).limit(1).next();
      let stageHeight = 0;
      if (result) {
        stageHeight = result.stageHeight;
      }
      return stageHeight;
    } catch (e) {
      console.error(e);
    }
  };

  this.viableStageHeight = async () => {
    try {
      let collection = await this.db.collection('payments');
      let latestBuildingStage = await collection.find({ onChain: false }).sort({ stageHeight: 1 }).limit(1).next();
      let latestBuiltStage = await collection.find({ onChain: true }).sort({ stageHeight: -1 }).limit(1).next();
      if (stopReceiveStage) {
        return parseInt(stopReceiveStage) + 1;
      }

      if (acceptableStage) {
        return acceptableStage;
      }

      if (latestBuildingStage && latestBuildingStage.stageHeight) {
        return parseInt(latestBuildingStage.stageHeight);
      } else if (latestBuiltStage && latestBuiltStage.stageHeight) {
        return parseInt(latestBuiltStage.stageHeight) + 1;
      }

      return 1;
    } catch (e) {
      console.error(e);
    }
  };

  this.getStage = async (stageHeight) => {
    try {
      let treeCollection = await this.db.collection('payments');
      let result = await treeCollection.find({ stageHeight: { $eq: parseInt(stageHeight) } }).toArray();
      return result;
    } catch (e) {
      console.error(e);
    }
  };

  this.isLightTxExisted = async (lightTxHash) => {
    try {
      let containsKnownLightTx = false;
      let receiptsCollection = await this.db.collection('receipts');
      let count = await receiptsCollection.find({ lightTxHash: lightTxHash }).count();
      if (count > 0) {
        containsKnownLightTx = true;
      }

      return containsKnownLightTx;
    } catch (e) {
      console.error(e);
    }
  };

  this.saveReceipt = async (receipt) => {
    let treenodesCollection = await this.db.collection('receipt_treenodes');
    let receiptsCollection = await this.db.collection('receipts');
    let containsKnownReceipt = false;

    let count = await receiptsCollection.find({ receiptHash: receipt.receiptHash }).count();
    if (count > 0) {
      containsKnownReceipt = true;
    }

    if (containsKnownReceipt) {
      return ErrorCodes.CONTAINS_KNOWN_RECEIPT;
    } else {
      let receiptStageHeight = parseInt(receipt.lightTxData.stageHeight);
      let count = await treenodesCollection.find({ stageHeight: receiptStageHeight }).count();
      let isNotValid = (receiptStageHeight == stopReceiveStage);
      let stageHasBeenBuilt = (count > 0);
      if (stageHasBeenBuilt || isNotValid) {
        return ErrorCodes.STAGE_HAS_BEEN_BUILT;
      }

      if (stopReceiveStage && ((receiptStageHeight - 1) !== stopReceiveStage)) {
        return ErrorCodes.CONTAINS_OVER_HEIGHT_RECEIPT;
      }

      let result = await receiptsCollection.insert(receipt);
      if (result.result.ok) {
        return ErrorCodes.OK;
      } else {
        return ErrorCodes.INSERT_FAIL;
      }
    }
  };

  this.getPayment = async (paymentHash) => {
    try {
      let payments = await this.db.collection('payments');
      return await payments.findOne({ paymentHash: paymentHash });
    } catch (e) {
      console.error(e);
    }
  },

  this.getPayments = async (stageHeight, limitSize = null) => {
    try {
      let payments = await this.db.collection('payments');
      let result = null;
      if (limitSize) {
        result = await payments.find({ stageHeight: { $eq: parseInt(stageHeight) } }).limit(limitSize).toArray();
      } else {
        result = await payments.find({ stageHeight: { $eq: parseInt(stageHeight) } }).toArray();
      }
      return result;
    } catch (e) {
      console.error(e);
    }
  };

  this.getPaymentsFromStageHash = async (stageHash) => {
    try {
      let collection = await this.db.collection('payments');
      let payments = await collection.find({ stageHash: stageHash }).toArray();
      payments = payments.map(payment => payment.paymentHash);
      return payments;
    } catch (e) {
      console.error(e);
    }
  };

  this.getPaymentSize = async (stageHeight) => {
    try {
      let payments = await this.db.collection('payments');
      return await payments.count({ stageHeight: stageHeight });
    } catch (e) {
      console.error(e);
    }
  };

  this.getPaymentByIndex = async (stageHeight, treeNodeIndex) => {
    try {
      let payments = await this.db.collection('payments');
      return await payments.find({ stageHeight: stageHeight, treeNodeIndex: treeNodeIndex }).toArray();
    } catch (e) {
      console.error(e);
    }
  };

  this.updatePaymentNodeIndex = async (paymentHash, treeNodeIndex) => {
    try {
      let payments = await this.db.collection('payments');
      await payments.update({ paymentHash: paymentHash }, { $set: { treeNodeIndex: treeNodeIndex } });
    } catch (e) {
      console.error(e);
    }
  };

  this.saveTreeNode = async (treeNode, stageHeight) => {
    try {
      let collection = await this.db.collection('treenodes');
      treeNode.stageHeight = stageHeight;
      let result = await collection.update({ stageHeight: stageHeight, treeNodeIndex: treeNode.treeNodeIndex }, treeNode, { upsert: true });
      return result;
    } catch (e) {
      console.error(e);
    }
  };

  this.getTreeNode = async (stageHeight, treeNodeIndex) => {
    try {
      let collection = await this.db.collection('treenodes');
      let result = await collection.findOne({ stageHeight: stageHeight, treeNodeIndex: treeNodeIndex });
      return result;
    } catch (e) {
      console.error(e);
    }
  };

  this.getSlice = async (stageHeight, sliceIndexes) => {
    try {
      let collection = await this.db.collection('treenodes');
      let slice = await collection.find({ stageHeight: stageHeight, treeNodeIndex: { $in: sliceIndexes } }).toArray();
      slice = slice.sort((a, b) => (a.treeNodeIndex < b.treeNodeIndex));
      return slice;
    } catch (e) {
      console.error(e);
    }
  };

  this.connect = async () => {
    this.db = await MongoClient.connect(url);
  };

  this.close = () => {
    this.db.close();
  };

  this.isConnected = async () => {
    let treeCollection = await this.db.collection('payments');
    let result = await treeCollection.find({}).toArray();
    return result;
  };

  this.getPublicKeys = async () => {
    try {
      let users = await this.db.collection('rsa_publickeys');
      let cps = await this.db.collection('cp_publickeys');
      let userPublicKey = await users.findOne({ '_id' : 1 });
      let cpsPublicKey = await cps.findOne({ '_id' : 1 });
      return { userPublicKey: userPublicKey, cpsPublicKey: cpsPublicKey };
    } catch (e) {
      console.log(e);
    }
  };

  this.getUserAddress = async () => {
    try {
      let users = await this.db.collection('ecc_publickeys');
      let userPublicKey = await users.findOne({ '_id' : 1 });
      let account = '0x' + EthUtils.pubToAddress(userPublicKey.publickey).toString('hex');
      return account;
    } catch (e) {
      console.log(e);
    }
  };
};

let dbSingleton = new DB();
dbSingleton.connect();

module.exports = dbSingleton;
