let env = require('./env');
let MerkleTree = require('./indexMerkleTree/MerkleTree');
let Web3 = require('web3');
let ethUtils = require('ethereumjs-util');
let fs = require('fs');
let DB = require('./db');
let db;

const privatekey = env.coinbasePrivateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

const IFCContractAddress = env.IFCContractAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const sidechain = JSON.parse(fs.readFileSync('./build/contracts/SideChainBlock.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const sidechainABI = sidechain.abi;
const sidechainContractClass = web3.eth.contract(sidechainABI);

let unlockCoinbase = function () {
    web3.personal.unlockAccount(web3.eth.coinbase, env.coinbasePassword);
};

let scid = 12412515154;

async function exonerate() {
    try {
        db = await DB();
        let treeJson = await db.getSideChainTree(scid);

        if (treeJson) {
            let scidHash = '0x' + ethUtils.sha3(scid.toString()).toString('hex');
            let sideChainAddress = await IFCContract.getBlockAddress(scidHash.toString());
            let sidechainInstance = sidechainContractClass.at(sideChainAddress);
            let objectionTidHashes = sidechainInstance.getErrorTIDs();
            console.log(objectionTidHashes);

            if (objectionTidHashes > 0) {
                let tree = await MerkleTree.import(treeJson.tree);
                let targetIds = tree.calcLeafIndexByTidHash(objectionTidHashes);
                let sliceHashes = tree.collectSlices(targetIds);
                console.log(sliceHashes);

                let idxsIMT = [];
                let nodeHashes = [];
                let idxsLFD = [];
                let leafHashes = [];

                for (let key in sliceHashes) {
                    let slice = sliceHashes[key];
                    let id = slice.id;
                    let nodeHash = slice.nodeHash;
                    idxsIMT.push(id);
                    nodeHashes.push('0x' + nodeHash);
                }

                let transactionHashes = tree.getTransactionHashesByIndex(targetIds);
                console.log(transactionHashes);
                for (let key in transactionHashes) {
                    let leafData = transactionHashes[key];
                    let hashes = leafData.transactionHash;

                    for (let index in hashes) {
                        let hash = hashes[index];
                        hashes[index] = '0x' + hash;
                    }

                    if (hashes.length == 0) {
                        continue;
                    }

                    idxsLFD.push(parseInt(key));
                    idxsLFD.push(hashes.length);
                    leafHashes = leafHashes.concat(hashes);
                }
                console.log('index LFD:');
                console.log(idxsLFD);
                console.log('LFD:');
                console.log(leafHashes);

                unlockCoinbase();

                let event = sidechainInstance.SideChainEvent();
                event.watch(function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(result);
                        let args = result.args;
                        let func = args._func;

                        let setting = '0x9d630d23';

                        if (args._scid === scidHash && func === setting) {
                            let isComplete = sidechainInstance.exonerate({from: account, to: sidechainInstance.address, gas: 4700000});
                            console.log('exonerate', isComplete);
                            event.stopWatching();
                        }
                    }
                });

                sidechainInstance.setting(idxsIMT, nodeHashes, idxsLFD, leafHashes, {from: account, to:sidechainInstance.address, gas: 4700000});
            }
        }
        return true;
    } catch (e) {
        console.log(e);
    } finally {
        db.close();
    }
}

exonerate();