let env = require('./env');
let MongoClient = require('mongodb').MongoClient;

let url = env.mongodbUrl;

async function connect() {
    let db = await MongoClient.connect(url);
    return {
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
            return new Promise(async function (resolve, reject) {
                try {
                    let treeCollection = await db.collection('records_tree');
                    let result = await treeCollection.findOne({_id: parseInt(scid)});
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },

        async getSideChainTrees (timeRange) {
            return new Promise(async function (resolve, reject) {
                try {
                    let nowTime = parseInt(Date.now() / 1000);
                    let timeStart = nowTime - parseInt(timeRange);
                    console.log(timeStart);                    
                    console.log(timeRange);                                        
                    let result = await db.collection('records_tree').find({time: {$gt: parseInt(timeStart), $lt: parseInt(nowTime)}}).toArray();
                    
                    console.log(result);
                    resolve(result);
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });
        },

        close () {
            db.close();
        },
    };
}

module.exports = connect;