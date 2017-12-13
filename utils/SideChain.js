let env = require('../env');
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

let SideChain = function () {
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
