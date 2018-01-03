let env = require('./env');
let MerkleTree = require('./indexMerkleTree/MerkleTree');
let RSA = require('./crypto/RSAencrypt');
let ethUtils = require('ethereumjs-util');
let Web3 = require('web3');
let fs = require('fs');
let DB = require('./db');
let db;
let keys;

const IFCContractAddress = env.IFCContractAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

let makeTree = async function (time, stageId, records) {
    let userPublicKey = keys.userPublicKey.publickey;
    let cpsPublicKey = keys.cpsPublicKey.publickey;

    let recordLength = records.length;
    let height = parseInt(Math.log2(recordLength)) + 1;
    let tree = new MerkleTree(height);
    tree.setStageId(stageId);
    tree.setTime(time);
    let txs = [];
    for (let i = 0; i < recordLength; i++) {
        let tid = records[i].tid;
        let message = records[i].content;
        let cipherUser = await RSA.encrypt(message, userPublicKey);
        let cipherCP = await RSA.encrypt(message, cpsPublicKey);

        let tx = {
            'stageId': parseInt(stageId),
            'tid': tid,
            'tidHash': '0x' + ethUtils.sha3(tid.toString()).toString('hex'),
            'contentUser': cipherUser,
            'contentCp': cipherCP,
        };
        txs.push(tx);
    }

    db.saveTxCiphers(txs);
    txs.forEach((tx) => {
        tree.putTransactionInTree(tx);
    });

    return tree;
};


let addNewStage = function (stageId, rootHash) {
    web3.personal.unlockAccount(env.account, env.password);
    let stageHash = '0x' + ethUtils.sha3(stageId.toString()).toString('hex');
    return IFCContract.addNewStage(stageHash, rootHash);
};

async function buildStage(time, stageId, records) {
    try {
        db = await DB();
        keys = await db.getPublicKeys();
        console.log(keys);
        const tree = await makeTree(time, stageId, records);
        const rootHash = '0x' + tree.getRootHash();
        console.log('stage ID' + stageId);
        console.log('time' + time);
        console.log('Root Hash: ' + rootHash);
        const txHash = addNewStage(stageId, rootHash);
        console.log('Add stage tx hash: ' + txHash);
        let result = await db.clearPendingTransactions();
        console.log(result);
        await db.increaseStageHeight();

        db.close();
        return tree;
    } catch (e) {
        console.log(e);
    }

    return false;
}

module.exports = buildStage;
