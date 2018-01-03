let env = require('./env');
let MerkleTree = require('./indexMerkleTree/MerkleTree');
let Web3 = require('web3');
let ethUtils = require('ethereumjs-util');
let fs = require('fs');
let DB = require('./db');
let db;

const privatekey = env.privateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

const IFCContractAddress = env.IFCContractAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const Stage = JSON.parse(fs.readFileSync('./build/contracts/Stage.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const StageABI = Stage.abi;
const StageClass = web3.eth.contract(StageABI);

async function exonerate(stageHeight, tid) {
    try {
        db = await DB();
        let txCiphers = await db.getStage(stageHeight);
        if (txCiphers.length > 0) {
            let stageHash = '0x' + ethUtils.sha3(stageHeight.toString()).toString('hex');
            let tidHash = '0x' + ethUtils.sha3(tid.toString()).toString('hex');
            let stageAddress = await IFCContract.stageAddress(stageHash.toString());
            let stage = StageClass.at(stageAddress);
            let objectionTidHashes = stage.getObjectionableTIDs();

            if (objectionTidHashes > 0 && (objectionTidHashes.indexOf(tid) >= 0)) {
                let height = parseInt(Math.log2(txCiphers.length)) + 1;
                let tree = new MerkleTree(height);
                tree.setStageHeight(stageHash);
                txCiphers.forEach((tx) => {
                    tree.putTransactionInTree(tx);
                });
                let targetIds = [tid];
                let idx = tree.calcLeafIndexByTidHash(tidHash);
                let slices = tree.collectSlices(targetIds);

                let idxsIMT = [];
                let sliceHashes = [];
                let idxsLFD = [];
                let leafHashes = [];

                for (let key in slices) {
                    let slice = slices[key];
                    let id = slice.id;
                    let nodeHash = slice.nodeHash;
                    idxsIMT.push(id);
                    sliceHashes.push('0x' + nodeHash);
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
                console.log(leafHashes);

                web3.personal.unlockAccount(account, env.password);
                let txHash = IFCContract.exonerate(stageHash, tidHash, idx, sliceHashes, leafHashes, {from: account, to:IFCContract.address, gas: 4700000});
                console.log(txHash);
            }
        }
        return true;
    } catch (e) {
        console.log(e);
    } finally {
        db.close();
    }
}

module.exports = exonerate;