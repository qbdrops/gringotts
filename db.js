let env = require('./env');
let MongoClient = require('mongodb').MongoClient;
let ethUtils = require('ethereumjs-util');

let url = env.mongodbUrl;

async function connect() {
    let db = await MongoClient.connect(url);
    return {
        async getOrNewStageHeight () {
            try {
                let collection = await db.collection('stage_height');
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
        },

        async pendingTransactions () {
            try {
                let collection = await db.collection('txs');
                let txs = await collection.find({onChain: false}).toArray();
                return txs;
            } catch (e) {
                console.error(e);
            }
        },

        async clearPendingTransactions (stageHash) {
            try {
                let collection = await db.collection('txs');
                let result = await collection.update({ onChain: false, stageHash: stageHash }, { $set: { onChain: true } }, { multi: true});
                return result;
            } catch (e) {
                console.error(e);
            }
        },

        async lastestStageHeight () {
            try {
                let collection = await db.collection('txs');
                let result = await collection.find().sort({stageHeight: -1}).limit(1).next();
                return result.stageHeight;
            } catch (e) {
                console.error(e);
            }
        },

        async increaseStageHeight () {
            try {
                let height = await this.getOrNewStageHeight();
                height = parseInt(height) + 1;
                let collection = await db.collection('stage_height');
                await collection.save({_id: 1, stageHeight: height});
                return height;
            } catch (e) {
                console.error(e);
            }
        },

        insertRSAPublickey (publickey) {
            return new Promise(async function(resolve, reject) {
                try {
                    let collection = await db.collection('rsa_publickeys');
                    let result = await collection.save({_id: 1, publickey: publickey});
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },
    
        insertECCPublickey (publickey) {
            return new Promise(async function(resolve, reject) {
                try {
                    let collection = await db.collection('ecc_publickeys');
                    let result = await collection.save({_id: 1, publickey: publickey});
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },

        getUserAddress () {
            return new Promise(async function (resolve, reject) {
                try {
                    let users = await db.collection('ecc_publickeys');
                    let userPublicKey = await users.findOne({'_id' : 1});
                    let account = '0x' + ethUtils.pubToAddress(userPublicKey.publickey).toString('hex');
                    resolve(account);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },
    
        insertPublicKeys (userPublicKey, cpPublicKey) {
            return new Promise(async function(resolve, reject) {
                try {
                    let users = await db.collection('ecc_publickeys');
                    let result = await users.save({_id: 1, publickey: userPublicKey.publicKey});
    
                    let cps = await db.collection('cp_publickeys');
                    result = await cps.save({_id: 1, publickey: cpPublicKey.publicKey});
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },
    
        insertCpPublicKey(cpPublicKey) {
            return new Promise(async function(resolve, reject) {
                try {
                    let cps = await db.collection('cp_publickeys');
                    let result = await cps.save({_id: 1, publickey: cpPublicKey});
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            }); 
        },

        getPublicKeys () {
            return new Promise(async function (resolve, reject) {
                try {
                    let users = await db.collection('rsa_publickeys');
                    let cps = await db.collection('cp_publickeys');
                    let userPublicKey = await users.findOne({'_id' : 1});
                    let cpsPublicKey = await cps.findOne({'_id' : 1});
                    resolve({userPublicKey: userPublicKey, cpsPublicKey: cpsPublicKey});
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },

        async getStage (stageHeight) {
            try {
                let treeCollection = await db.collection('txs');
                let result = await treeCollection.find({stageHeight: {$eq: parseInt(stageHeight)}}).toArray();
                return result;
            } catch (e) {
                console.error(e);
            }
        },

        async saveTransactions (records) {
            try {
                let txs = await db.collection('txs');
                let result = await txs.insertMany(records);
                return result;
            } catch (e) {
                console.error(e);
            }
        },

        async getTransactions (stageHeight, limitSize = null) {
            try {
                let txs = await db.collection('txs');
                let result = null;
                if (limitSize) {
                    result = await txs.find({stageHeight: {$eq: parseInt(stageHeight)}}).limit(limitSize).toArray();
                } else {
                    result = await txs.find({stageHeight: {$eq: parseInt(stageHeight)}}).toArray();
                }
                return result;
            } catch (e) {
                console.error(e);
            }
        },

        close () {
            db.close();
        },
    };
}

module.exports = connect;