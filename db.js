let env = require('./env');
let MongoClient = require('mongodb').MongoClient;
let ethUtils = require('ethereumjs-util');

let url = env.mongodbUrl;

async function connect() {
    let db = await MongoClient.connect(url);
    return {
        async getOrNewBlockHeight () {
            try {
                let collection = await db.collection('block_height');
                let lastestBlock = await collection.findOne({_id: 1});
                if (lastestBlock) {
                    let height = lastestBlock.blockHeight;
                    return height;
                } else {
                    let result = await collection.save({_id: 1, blockHeight: 0});
                    if (result) {
                        return 0;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        },

        async increaseBlockHeight () {
            try {
                let height = await this.getOrNewBlockHeight();
                height = parseInt(height) + 1;
                let collection = await db.collection('block_height');
                await collection.save({_id: 1, blockHeight: height});
                return height;
            } catch (e) {
                console.error(e);
            }
        },

        async saveTxCiphers(ciphers) {
            try {
                let collection = await db.collection('tx_ciphers');
                let result = await collection.insertMany(ciphers);
                return result;
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

        insertSideChainTree (time, scid, treeJson) {
            return new Promise(async function(resolve, reject) {
                try {
                    let tree = await db.collection('records_tree');
                    let result = await tree.save({_id: parseInt(scid), tree: treeJson, time: parseInt(time)});
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },

        async getSideChainTree (scid) {
            try {
                let treeCollection = await db.collection('tx_ciphers');
                let result = await treeCollection.find({scid: {$eq: parseInt(scid)}}).toArray();
                return result;
            } catch (e) {
                console.error(e);
            }
        },

        async getSideChainTrees (timeRange) {
            try {
                let nowTime = parseInt(Date.now() / 1000);
                let timeStart = nowTime - parseInt(timeRange);
                console.log(timeStart);                    
                console.log(timeRange);                                        
                let result = await db.collection('records_tree').find({time: {$gt: parseInt(timeStart), $lt: parseInt(nowTime)}}).toArray();
                
                console.log(result);
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

        async getTransactions (scid, limitSize = null) {
            try {
                let txs = await db.collection('txs');
                let result = null;
                if (limitSize) {
                    result = await txs.find({scid: {$eq: parseInt(scid)}}).limit(limitSize).toArray();
                } else {
                    result = await txs.find({scid: {$eq: parseInt(scid)}}).toArray();
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