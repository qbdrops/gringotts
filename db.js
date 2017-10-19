let env = require('./env');
let MongoClient = require('mongodb').MongoClient;
const CircularJSON = require('circular-json');

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

        insertIFCTree (tree) {
            let treeJson = JSON.parse(CircularJSON.stringify(tree));
            return new Promise(async function(resolve, reject) {
                try {
                    let tree = await db.collection('records_tree');
                    let result = await tree.save({_id: 1, tree: treeJson});
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