let env = require('./env');
let MerkleTree = require('./indexMerkleTree/MerkleTree');
let RSA = require('./indexMerkleTree/RSAencrypt');
let faker = require('faker');
let Web3 = require('web3');
let fs = require('fs');
let DB = require('./db');
let db;
let keys;

const scid = 11;
const maxHeight = 10;
const IFCContractAddress = env.IFCContractAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
let tree = new MerkleTree(maxHeight);
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const sidechain = JSON.parse(fs.readFileSync('./build/contracts/SideChain.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const sidechainBytecode = sidechain.unlinked_binary;
const sidechainABI = sidechain.abi;
const sidechainContractClass = web3.eth.contract(sidechainABI);

let makeTree = async function () {
    let userPublicKey = keys.userPublicKey.publickey;
    let cpsPublicKey = keys.cpsPublicKey.publickey;

    console.log(userPublicKey);
    console.log(cpsPublicKey);

    let leafNodeNumber = Math.pow(2, maxHeight - 1);
    let globalTid;
    for (let i = 0; i < leafNodeNumber; i++) {
        let tid = faker.random.uuid();
        let message = faker.random.alphaNumeric(100);
        let cipherUser = await RSA.encrypt(message, userPublicKey);
        let cipherCP = await RSA.encrypt(message, cpsPublicKey);

        if (i == 0) {
            globalTid = tid;
            console.log(cipherUser);
            console.log(cipherCP);
        }

        let content = {
            'tid': tid,
            'contentUser': cipherUser,
            'contentCp': cipherCP,
        };

        tree.putTransactionInTree(content);
    }

    let cipherA = tree.getTransactionSetUser(globalTid);
    let cipherB = tree.getTransactionSetCp(globalTid);
    console.log(cipherA);
    console.log(cipherB);
    
    let rootHash = '0x' + tree.getRootHash();
    return rootHash;
};

let unlockCoinbase = function () {
    web3.personal.unlockAccount(web3.eth.coinbase, env.coinbasePassword);
};

let deploySideChainContract = function (rootHash) {
    unlockCoinbase();
    return new Promise(function (resolve, reject) {
        sidechainContractClass.new(scid, rootHash, maxHeight, {
            data: sidechainBytecode,
            from: web3.eth.coinbase,
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

async function make() {
    try {
        db = await DB();
        keys = await db.getPublicKeys();
        console.log(keys);
        const rootHash = await makeTree();
        console.log('Root Hash: ' + rootHash);
        const result = await deploySideChainContract(rootHash);
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
    } catch (e) {
        console.log(e);
    }
}

make();
