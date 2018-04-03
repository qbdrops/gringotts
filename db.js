let env = require('./env');
let ResultTypes = require('./types/result');
let EthUtils = require('ethereumjs-util');
let MongoClient = require('mongodb').MongoClient;

let url = env.mongodbUrl;
let DB = function () {
    this.stopReceiveStage = null,
    this.relax = () => {
        this.stopReceiveStage = null;
    },
    this.getOrNewStageHeight = async () => {
        try {
            let collection = await this.db.collection('stage_height');
            let lastestStage = await collection.findOne({_id: 1});
            if (lastestStage) {
                let height = lastestStage.stageHeight;
                return height;
            } else {
                let result = await collection.save({_id: 1, stageHeight: 0});
                if (result) {
                    return 0;
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    this.pendingRootHashes = async () => {
        try {
            let collection = await this.db.collection('pending_roothashes');
            let pendingRootHashes = await collection.find({ onChain: false }).toArray();
            return pendingRootHashes;
        } catch (e) {
            console.error(e);
        }
    };

    this.pushPendingRootHash = async (rootHash, stageHeight) => {
        try {
            let collection = await this.db.collection('pending_roothashes');
            let result = await collection.save({rootHash: rootHash, stageHeight: stageHeight, onChain: false});
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.clearPendingRootHash = async (rootHash) => {
        try {
            let collection = await this.db.collection('pending_roothashes');
            let result = await collection.update({ onChain: false, rootHash: rootHash }, { $set: { onChain: true } });
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.pendingPayments = async (stageHeight = null, lock = false) => {
        try {
            let collection = await this.db.collection('payments');
            let payments;
            if (stageHeight) {
                if (lock) {
                    this.stopReceiveStage = stageHeight;
                }
                payments = await collection.find({ onChain: false, stageHeight: stageHeight }).toArray();
            } else {
                payments = await collection.find({ onChain: false }).toArray();
            }
            return payments;
        } catch (e) {
            console.error(e);
        }
    };

    this.clearPendingPayments = async (stageHash) => {
        try {
            let collection = await this.db.collection('payments');
            let result = await collection.update({ onChain: false, stageHash: stageHash }, { $set: { onChain: true } }, { multi: true });
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.stageHeight = async () => {
        try {
            let collection = await this.db.collection('payments');
            let result = await collection.find().sort({stageHeight: -1}).limit(1).next();
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
            let latestBuildingStage = await collection.find({onChain: false}).sort({stageHeight: -1}).limit(1).next();
            let latestBuiltStage = await collection.find({onChain: true}).sort({stageHeight: -1}).limit(1).next();

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
            let result = await treeCollection.find({stageHeight: {$eq: parseInt(stageHeight)}}).toArray();
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.savePayments = async (payments) => {
        let treenodesCollection = await this.db.collection('treenodes');
        let paymentsCollection = await this.db.collection('payments');
        let containsKnownPayment = false;

        for (let i = 0; i < payments.length; i++) {
            let payment = payments[i];
            let count = await paymentsCollection.find({ paymentHash: payment.paymentHash}).count();
            if (count > 0) {
                containsKnownPayment = true;
            }
        }

        if (containsKnownPayment) {
            return ResultTypes.CONTAINS_KNOWN_PAYMENT;
        } else {
            for (let i = 0 ; i < payments.length; i++) {
                let payment = payments[i];
                let paymentStageHeight = parseInt(payment.stageHeight);
                let count = await treenodesCollection.find({ stageHeight: paymentStageHeight }).count();
                let isNotValid = (paymentStageHeight == this.stopReceiveStage);
                let stageHasBeenBuilt = (count > 0);
                if (stageHasBeenBuilt || isNotValid) {
                    return ResultTypes.STAGE_HAS_BEEN_BUILT;
                }
            }
            let result = await paymentsCollection.insertMany(payments);
            if (result.result.ok) {
                return ResultTypes.OK;
            } else {
                return ResultTypes.INSERT_FAIL;
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
                result = await payments.find({stageHeight: {$eq: parseInt(stageHeight)}}).limit(limitSize).toArray();
            } else {
                result = await payments.find({stageHeight: {$eq: parseInt(stageHeight)}}).toArray();
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
            let slice = await collection.find({ stageHeight: stageHeight, treeNodeIndex: { $in: sliceIndexes }}).toArray();
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
            let userPublicKey = await users.findOne({'_id' : 1});
            let cpsPublicKey = await cps.findOne({'_id' : 1});
            return {userPublicKey: userPublicKey, cpsPublicKey: cpsPublicKey};
        } catch (e) {
            console.log(e);
        }
    };

    this.getUserAddress = async () => {
        try {
            let users = await this.db.collection('ecc_publickeys');
            let userPublicKey = await users.findOne({'_id' : 1});
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
