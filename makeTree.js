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
const SidechainTemplateAddress = env.SidechainTemplateAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const sidechain = JSON.parse(fs.readFileSync('./build/contracts/SideChainBlock.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const sidechainBytecode = sidechain.unlinked_binary;
const sidechainABI = sidechain.abi;
const sidechainContractClass = web3.eth.contract(sidechainABI);

let makeTree = async function (time, scid, records) {
    let userPublicKey = keys.userPublicKey.publickey;
    let cpsPublicKey = keys.cpsPublicKey.publickey;

    let recordLength = records.length;
    let height = parseInt(Math.log2(recordLength)) + 1;
    let tree = new MerkleTree(height);
    tree.setSCID(scid);
    tree.setTime(time);
    let txs = [];
    for (let i = 0; i < recordLength; i++) {
        let tid = records[i].tid;
        let message = records[i].content;
        let cipherUser = await RSA.encrypt(message, userPublicKey);
        let cipherCP = await RSA.encrypt(message, cpsPublicKey);

        let tx = {
            'scid': parseInt(scid),
            'tid': tid,
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


let deploySideChainContract = function (scid, rootHash, treeHeight) {
    web3.personal.unlockAccount(env.account, env.password);
    let wei = (2 ** (treeHeight - 1)) * 100;
    let scidHash = '0x' + ethUtils.sha3(scid.toString()).toString('hex');
    console.log('scidHash : ' + scidHash);
    return new Promise(function (resolve, reject) {
        sidechainContractClass.new(SidechainTemplateAddress, scidHash, rootHash, treeHeight, 300, 0, {
            data: sidechainBytecode,
            from: env.account,
            value: wei,
            gas: 3000000
        }, (err, res) => {
            if (err) {
                console.log(err);
                reject(err);
                return;
            }

            if (res.address) {
                resolve(res);
            }
        });
    });
};

async function buildSideChainTree(time, scid, records) {
    try {
        db = await DB();
        keys = await db.getPublicKeys();
        console.log(keys);
        const tree = await makeTree(time, scid, records);
        console.log('scid' + scid);
        console.log('time' + time);
        const rootHash = '0x' + tree.getRootHash();
        console.log('Root Hash: ' + rootHash);
        const result = await deploySideChainContract(scid, rootHash, tree.getHeight());
        const contractAddress = result.address;
        const txHash = result.transactionHash;

        console.log('Sidechain ID: ' + scid);
        console.log('Sidechain contract address: ' + contractAddress);
        console.log('Tx hash: ' + txHash);

        web3.personal.unlockAccount(env.accout, env.password);        
        let addSideChainTxHash = IFCContract.addBlockAddress(contractAddress, {
            from: env.account,
            gas: 3000000
        });

        console.log('Add sidechain tx hash: ' + addSideChainTxHash);
        db.close();
        return tree;
    } catch (e) {
        console.log(e);
    }

    return false;
}

module.exports = buildSideChainTree;
