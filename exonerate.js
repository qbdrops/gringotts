let env = require('./env');
let MerkleTree = require('./indexMerkleTree/MerkleTree');
let Web3 = require('web3');
let EthUtils = require('ethereumjs-util');
let fs = require('fs');
let db = require('./db');

const privatekey = env.privateKey;
const publickey = '0x' + EthUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + EthUtils.pubToAddress(publickey).toString('hex');

const IFCContractAddress = env.IFCContractAddress;

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const Stage = JSON.parse(fs.readFileSync('./build/contracts/Stage.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const StageABI = Stage.abi;
const StageClass = web3.eth.contract(StageABI);

async function exonerate(stageHeight, paymentHash) {
    try {
        let paymentCiphers = await db.getStage(stageHeight);
        if (paymentCiphers.length > 0) {
            let stageHash = '0x' + EthUtils.sha3(stageHeight.toString()).toString('hex');
            let stageAddress = await IFCContract.getStageAddress(stageHash.toString());
            let stage = StageClass.at(stageAddress);
            let objectionTidHashes = stage.getObjectionablePaymentHashes();
            let valideObjectionTidHashes = objectionTidHashes.filter((objectionTidHash) => {
                return stage.objections(objectionTidHash)[1];
            });
            if (valideObjectionTidHashes.length > 0 &&
                (valideObjectionTidHashes.indexOf('0x' + paymentHash) >= 0)) {
                let height = parseInt(Math.log2(paymentCiphers.length)) + 1;
                let tree = new MerkleTree(height);
                tree.setStageHeight(stageHeight);
                paymentCiphers.forEach((payment) => {
                    tree.putPaymentInTree(payment);
                });

                let nodes = tree.extractSlice(paymentHash);
                let paymentHashes = tree.getPaymentHashArray(paymentHash);

                let slice = nodes.map((node) => {
                    return '0x' + node.treeNodeHash;
                });

                paymentHashes = paymentHashes.map((paymentHash) => {
                    return '0x' + paymentHash;
                });

                web3.personal.unlockAccount(account, env.password);
                let ethPaymentHash = IFCContract.exonerate(stageHash, '0x' + paymentHash, nodes[0].treeNodeIndex, slice, paymentHashes, {from: account, to:IFCContract.address, gas: 4700000});
                console.log(ethPaymentHash);
            }
        }
        return true;
    } catch (e) {
        console.log(e);
    }
}

module.exports = exonerate;
