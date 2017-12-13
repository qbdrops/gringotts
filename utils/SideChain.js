let env = require('../env');
let DB = require('../db');
let Web3 = require('web3');
let ethUtils = require('ethereumjs-util');
let fs = require('fs');

const IFCContractAddress = env.IFCContractAddress;

const privatekey = env.privateKey;
const publickey = '0x' + ethUtils.privateToPublic('0x' + privatekey).toString('hex');
const account = '0x' + ethUtils.pubToAddress(publickey).toString('hex');

let web3 = new Web3(new Web3.providers.HttpProvider(env.web3Url));
const IFC = JSON.parse(fs.readFileSync('./build/contracts/IFC.json'));
const block = JSON.parse(fs.readFileSync('./build/contracts/SideChainBlock.json'));

const IFCABI = IFC.abi;
const IFCContractClass = web3.eth.contract(IFCABI);
const IFCContract = IFCContractClass.at(IFCContractAddress);

const blockABI = block.abi;
const blockContractClass = web3.eth.contract(blockABI);

async function connectDB() {
    try {
        let db = await DB();
        return db;
    } catch (e) {
        console.error(e);
    }
}

let SideChain = function () {
    this.db = null;
    connectDB().then((db) => {
        this.db = db;
    });

    this.chain = IFCContract;
    this.getBlock = (heightOrHash) => {
        let isHex = (web3.toHex(heightOrHash) === heightOrHash.toLowerCase());
        let blockInstance = null;
        if (isHex) {
            let blockContractAddress = IFCContract.getBlockAddress(heightOrHash);
            if (blockContractAddress != 0) {
                blockInstance = blockContractClass.at(blockContractAddress);
            }
        } else {
            let blockHash = IFCContract.blockID(heightOrHash);
            console.log(blockHash);
            if (blockHash != '0x') {
                let blockContractAddress = IFCContract.getBlockAddress(blockHash);
                blockInstance = blockContractClass.at(blockContractAddress);
            }
        }

        return blockInstance;
    };

    this.getAgentBalance = () => {
        return web3.eth.getBalance(account);
    };

    this.getLatestObjections = () => {
        let finalizedNumber = IFCContract.blockNumber();
        if (finalizedNumber > 0) {
            let blockID = IFCContract.blockID(finalizedNumber - 1);
            let address = IFCContract.getBlockAddress(blockID);
            let latestBlock = blockContractClass.at(address);
            let objectionTidHashes = latestBlock.getErrorTIDs();
            let validObjections = objectionTidHashes.filter((objectionTidHash) => {
                let objection = latestBlock.objections(objectionTidHash);
                return objection[2];
            });

            return validObjections;
        }

        return [];
    };

    this.getLatestBlockHeight = () => {
        let finalizedNumber = IFCContract.blockNumber();
        if (finalizedNumber > 0) {
            return finalizedNumber - 1;
        }

        return null;
    };
    
    this.getLatestSideChainBlock = async () => {
        let nextBlockHeight = await this.db.getOrNewBlockHeight();
        nextBlockHeight = parseInt(nextBlockHeight);
        let lastestBlockHeight = 0;
        if (nextBlockHeight > 0) {
            lastestBlockHeight = nextBlockHeight - 1;
        }
        return lastestBlockHeight;
    };

    this.pendingBlocks = async () => {
        let finalizedNumber = IFCContract.blockNumber();
        let finalizedBlockHeight = finalizedNumber - 1;
        let blockHeightInSidechain = await this.getLatestSideChainBlock();
        if (blockHeightInSidechain > finalizedBlockHeight) {
            let pendingBlocks = [];
            for (let i = finalizedBlockHeight; i < blockHeightInSidechain; i++) {
                pendingBlocks.push(i + 1);
            }
            return pendingBlocks;
        } else {
            return [];
        }
    };

    this.judge = (heightOrHash) => {
        let blockInstance = this.getBlock(heightOrHash);
        if (blockInstance) {
            web3.personal.unlockAccount(env.account, env.password);
            let result = blockInstance.judge({from: account, to: blockInstance.address, gas: 4700000});
            return result;
        } else {
            throw new Error('The block does not exists.');
        }
    };
};

let sideChain = new SideChain();

module.exports = sideChain;
