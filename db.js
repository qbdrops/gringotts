let env = require('./env');
let MongoClient = require('mongodb').MongoClient;
let url = env.mongodbUrl;
let db;

MongoClient.connect(url, function(err, dbInstance) {
    if (err) throw err;
    db = dbInstance;
});

module.exports = {
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
    }
};