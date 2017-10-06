const MerkleTree = require('./indexMerkleTree/MerkleTree.js');
const faker = require('faker');
const Web3 = require('web3');
const fs = require('fs');

const scid = 2;
const maxHeight = 10;
const IFCContractAddress = '0x84af34e4bf857a6c505cd5a319b7d478941dc853';

let web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
let tree = new MerkleTree(maxHeight);
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const sidechain = JSON.parse(fs.readFileSync('./build/contracts/SideChain.json'));

const IFCBytecode = IFC.unlinked_binary;
const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const sidechainBytecode = sidechain.unlinked_binary;
const sidechainABI = sidechain.abi;
const sidechainContractClass = web3.eth.contract(sidechainABI);

let makeTree = function () {
    let leafNodeNumber = Math.pow(2, maxHeight - 1);
    for (let i = 0; i < leafNodeNumber; i++) {
        let content = {
            'tid': faker.random.uuid(),
            'content': faker.random.alphaNumeric(100)
        };
    
        console.log(content);
        tree.putTransactionInTree(content);
    }
    
    let rootHash = tree.getRootHash();
    return rootHash;
};

let unlockCoinbase = function () {
    web3.personal.unlockAccount(web3.eth.coinbase, 'howard123');
}

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

async function main() {
    try {
        const rootHash = makeTree();
        const result = await deploySideChainContract(rootHash);
        const contractAddress = result.address;
        const txHash = result.transactionHash;

        console.log(contractAddress);
        console.log(txHash);

        unlockCoinbase();
        let addSideChainTxHash = IFCContract.addSideChainAddress(contractAddress, {
            from: web3.eth.coinbase,
            gas: 3000000
        });

        console.log(addSideChainTxHash);
    } catch (e) {
        console.log(e);
    }
}

main();
