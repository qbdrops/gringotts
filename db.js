let env = require('./env');
let EthUtils = require('ethereumjs-util');
let MongoClient = require('mongodb').MongoClient;

let url = env.mongodbUrl;
let DB = function () {
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

    this.pendingPayments = async () => {
        try {
            let collection = await this.db.collection('payments');
            let payments = await collection.find({onChain: false}).toArray();
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

    this.lastestStageHeight = async () => {
        try {
            let collection = await this.db.collection('payments');
            let result = await collection.find({ onChain: true }).sort({stageHeight: -1}).limit(1).next();
            let stageHeight = 0;
            if (result) { stageHeight = result.stageHeight; }
            return stageHeight;
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
        try {
            console.log(payments);
            let _payments = await this.db.collection('payments');
            let result = await _payments.insertMany(payments);
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.getPayment = async (paymentHash) => {
        try {
            let _payments = await this.db.collection('payments');
            return await _payments.findOne({ paymentHash: paymentHash });
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
            let _payments = await this.db.collection('payments');
            let payments = await _payments.find({ stageHash: stageHash }).toArray();
            payments = payments.map(payment => payment.paymentHash);
            return payments;
        } catch (e) {
            console.error(e);
        }
    };

    this.getPaymentSize = async (stageHeight) => {
        try {
            let _payments = await this.db.collection('payments');
            return await _payments.count({ stageHeight: stageHeight });
        } catch (e) {
            console.error(e);
        }
    };

    this.getPaymentByIndex = async (stageHeight, treeNodeIndex) => {
        try {
            let _payments = await this.db.collection('payments');
            return await _payments.find({ stageHeight: stageHeight, treeNodeIndex: treeNodeIndex }).toArray();
        } catch (e) {
            console.error(e);
        }
    };

    this.updatePaymentNodeIndex = async (paymentHash, treeNodeIndex) => {
        try {
            let _payments = await this.db.collection('payments');
            _payments.update({ paymentHash: paymentHash }, { $set: { treeNodeIndex: treeNodeIndex } });
        } catch (e) {
            console.error(e);
        }
    };

    this.saveTreeNode = async (treeNode, stageHeight) => {
        try {
            let _treeNodes = await this.db.collection('treenodes');
            treeNode.stageHeight = stageHeight;
            let result = await _treeNodes.update({ stageHeight: stageHeight, treeNodeIndex: treeNode.treeNodeIndex }, treeNode, { upsert: true });
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.getTreeNode = async (stageHeight, treeNodeIndex) => {
        try {
            let _treeNodes = await this.db.collection('treenodes');
            let result = await _treeNodes.findOne({ stageHeight: stageHeight, treeNodeIndex: treeNodeIndex });
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.getSlice = async (stageHeight, sliceIndexes) => {
        try {
            let _treenodes = await this.db.collection('treenodes');
            let slice = await _treenodes.find({ stageHeight: stageHeight, treeNodeIndex: { $in: sliceIndexes }}).toArray();
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
