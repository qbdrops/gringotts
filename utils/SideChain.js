let env = require('../env');
let db = require('../db');
let Web3 = require('web3');
let EthUtils = require('ethereumjs-util');
let fs = require('fs');

const IFCContractAddress = env.IFCContractAddress;

const privatekey = env.privateKey;
const publickey = '0x' + EthUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + EthUtils.pubToAddress(publickey).toString('hex');

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const Stage = JSON.parse(fs.readFileSync('./build/contracts/Stage.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const StageABI = Stage.abi;
const StageClass = web3.eth.contract(StageABI);

let Sidechain = function () {
    this.getStage = (heightOrHash) => {
        let isHex = (web3.toHex(heightOrHash) === heightOrHash.toString().toLowerCase());
        let stage = null;
        if (isHex) {
            let stageAddress = IFCContract.getStageAddress(heightOrHash);
            if (stageAddress != 0) {
                stage = StageClass.at(stageAddress);
            }
        } else {
            let stageHash = IFCContract.stages(heightOrHash);
            console.log(stageHash);
            if (stageHash != '0x') {
                let stageAddress = IFCContract.getStageAddress(stageHash);
                stage = StageClass.at(stageAddress);
            }
        }

        return stage;
    };

    this.getFinalizedTime = async () => {
        let stageHeight = await this.getLatestStageHeight();
        if (stageHeight > 0) {
            let stage = this.getStage(stageHeight.toString());
            return stage.finalizedTime();
        }

        return 0;
    };

    this.getBalance = (address) => {
        return web3.eth.getBalance(address);
    };

    this.getLatestObjections = () => {
        let finalizedNumber = IFCContract.stageHeight();
        if (finalizedNumber > 0) {
            let stageHash = IFCContract.stages(finalizedNumber);
            let address = IFCContract.getStageAddress(stageHash);
            let stage = StageClass.at(address);
            let objectionTidHashes = stage.getObjectionableTIDs();
            let validObjections = objectionTidHashes.filter((objectionTidHash) => {
                let objection = stage.objections(objectionTidHash);
                return objection[2];
            });

            return validObjections;
        }

        return [];
    };

    this.getContractStageHeight = async () => {
        return IFCContract.stageHeight();
    };
    
    this.pendingPayments = async () => {
        let payments = await db.pendingPayments();
        return payments;
    };

    this.getLatestStageHeight = async () => {
        let stageHeight = await db.lastestStageHeight();
        return stageHeight;
    };

    this.pendingStages = async () => {
        let finalizedHeight = IFCContract.stageHeight();
        let latestStageHeight = await this.getLatestStageHeight();
        if (latestStageHeight > finalizedHeight) {
            let pendingStages = [];
            for (let i = finalizedHeight; i < latestStageHeight; i++) {
                pendingStages.push(i + 1);
            }
            return pendingStages;
        } else {
            return [];
        }
    };

    this.finalize = (stageHash) => {
        let stage = this.getStage(stageHash);
        if (stage) {
            web3.personal.unlockAccount(env.account, env.password);
            let txHash = IFCContract.finalize(stageHash, { from: account, to: IFCContract.address, gas: 4700000 });
            return txHash;
        } else {
            throw new Error('The stage does not exists.');
        }
    };

    this.payPenalty = (stageHash, paymentHashes) => {
        let stage = this.getStage(stageHash);
        if (stage) {
            web3.personal.unlockAccount(env.account, env.password);
            console.log(stageHash);
            console.log(paymentHashes);
            let txHash = IFCContract.payPenalty(stageHash, paymentHashes, { from: account, to: IFCContract.address, gas: 4700000 });
            return txHash;
        } else {
            throw new Error('The stage does not exists.');
        }
    };
};

let sideChain = new Sidechain();

module.exports = sideChain;
