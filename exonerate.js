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

async function exonerate(stageHeight, txHash) {
    try {
        db = await DB();
        let txCiphers = await db.getStage(stageHeight);
        if (txCiphers.length > 0) {
            let stageHash = '0x' + ethUtils.sha3(stageHeight.toString()).toString('hex');
            let stageAddress = await IFCContract.getStageAddress(stageHash.toString());
            let stage = StageClass.at(stageAddress);
            let objectionTidHashes = stage.getObjectionableTxHashes();
            let valideObjectionTidHashes = objectionTidHashes.filter((objectionTidHash) => {
                return stage.objections(objectionTidHash)[1];
            });
            if (valideObjectionTidHashes.length > 0 &&
                (valideObjectionTidHashes.indexOf('0x' + txHash) >= 0)) {
                let height = parseInt(Math.log2(txCiphers.length)) + 1;
                let tree = new MerkleTree(height);
                tree.setStageHeight(stageHeight);
                txCiphers.forEach((tx) => {
                    tree.putTransactionInTree(tx);
                });

                let nodes = tree.extractSlice(txHash);
                let transactionHashes = tree.getTxHashArray(txHash);

                let slice = nodes.map((node) => {
                    return '0x' + node.treeNodeHash;
                });

                transactionHashes = transactionHashes.map((transactionHash) => {
                    return '0x' + transactionHash;
                });

                web3.personal.unlockAccount(account, env.password);
                let ethTxHash = IFCContract.exonerate(stageHash, '0x' + txHash, nodes[0].treeNodeID, slice, transactionHashes, {from: account, to:IFCContract.address, gas: 4700000});
                console.log(ethTxHash);
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