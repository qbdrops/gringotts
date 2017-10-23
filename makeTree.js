let env = require('./env');
let MerkleTree = require('./indexMerkleTree/MerkleTree');
let RSA = require('./indexMerkleTree/RSAencrypt');
let Web3 = require('web3');
let fs = require('fs');
let DB = require('./db');
let db;
let keys;

const IFCContractAddress = env.IFCContractAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const sidechain = JSON.parse(fs.readFileSync('./build/contracts/SideChain.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const sidechainBytecode = sidechain.unlinked_binary;
const sidechainABI = sidechain.abi;
const sidechainContractClass = web3.eth.contract(sidechainABI);

let makeTree = async function (scid, records) {
    let userPublicKey = keys.userPublicKey.publickey;
    let cpsPublicKey = keys.cpsPublicKey.publickey;

    let recordLength = records.length;
    let height = parseInt(Math.log2(recordLength)) + 1;
    let tree = new MerkleTree(height);
    tree.setSCID(scid);

    for (let i = 0; i < recordLength; i++) {
        let tid = records[i].tid;
        let message = records[i].content;
        let cipherUser = await RSA.encrypt(message, userPublicKey);
        let cipherCP = await RSA.encrypt(message, cpsPublicKey);

        let content = {
            'tid': tid,
            'contentUser': cipherUser,
            'contentCp': cipherCP,
        };

        tree.putTransactionInTree(content);
    }

    return tree;
};

let unlockCoinbase = function () {
    web3.personal.unlockAccount(web3.eth.coinbase, env.coinbasePassword);
};

let deploySideChainContract = function (scid, rootHash, treeHeight) {
    unlockCoinbase();
    let wei = (2 ** (treeHeight - 1)) * 100;
    return new Promise(function (resolve, reject) {
        sidechainContractClass.new(scid, rootHash, treeHeight, {
            data: sidechainBytecode,
            from: web3.eth.coinbase,
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

async function buildSideChainTree(scid, records) {
    try {
        db = await DB();
        keys = await db.getPublicKeys();
        console.log(keys);
        const tree = await makeTree(scid, records);
        await db.insertSideChainTree(scid, tree.export());
        const rootHash = '0x' + tree.getRootHash();
        console.log('Root Hash: ' + rootHash);
        const result = await deploySideChainContract(scid, rootHash, tree.getHeight());
        const contractAddress = result.address;
        const txHash = result.transactionHash;

        console.log('Sidechain ID: ' + scid);
        console.log('Sidechain contract address: ' + contractAddress);
        console.log('Tx hash: ' + txHash);

        unlockCoinbase();
        let addSideChainTxHash = IFCContract.addSideChainAddress(contractAddress, {
            from: web3.eth.coinbase,
            gas: 3000000
        });

        console.log('Add sidechain tx hash: ' + addSideChainTxHash);
        db.close();
        return true;
    } catch (e) {
        console.log(e);
    }

    return false;
}

module.exports = buildSideChainTree;
