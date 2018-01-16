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
            let result = await collection.update({ onChain: false, stageHash: stageHash }, { $set: { onChain: true } }, { multi: true});
            return result;
        } catch (e) {
            console.error(e);
        }
    };

    this.lastestStageHeight = async () => {
        try {
            let collection = await this.db.collection('payments');
            let result = await collection.find().sort({stageHeight: -1}).limit(1).next();
            return result.stageHeight;
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
