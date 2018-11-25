const axios = require('axios');
const assert = require('assert');
const EthUtils = require('ethereumjs-util');
const EthereumTx = require('ethereumjs-tx');
const Web3 = require('web3');
const Signer = require('./signer');
const env = require('../env');
const types = require('../models/types');
const LightTransaction = require('../models/light-transaction');
const Booster = require('../abi/Booster.json');
const boosterAccountAddress = '0x' + EthUtils.privateToAddress(Buffer.from(env.signerKey, 'hex')).toString('hex');

class Infinitechain {
  constructor (web3, storageManager) {
    assert(web3 instanceof Web3, 'web3 is invalid.');
    this.web3 = web3;
    this.booster = new web3.eth.Contract(Booster.abi, env.contractAddress);
    this.storageManager = storageManager;
    let signer = new Signer();
    signer.importPrivateKey(env.signerKey);
    this.signer = signer;
  }

  async sendLightTx (from, to, assetID, value, fee, metadata) {
    try {
      let remittanceData = {
        from: from,
        to: to,
        assetID: assetID,
        value: value,
        fee: fee
      };
      metadata = Object.assign({
        client: ''
      }, metadata);
      let lightTx = await this.makeLightTx(types.remittance, remittanceData, metadata);
      let receipt = await axios.post(`${env.serverUrl}/pay`, lightTx.toJson());
      return receipt;
    } catch(e) {
      throw e;
    }
  }

  async makeLightTx (type, lightTxData, metadata = null) {
    // Prepare lightTxData
    lightTxData = await this._prepare(type, lightTxData);
    if (metadata) {
      if (typeof metadata.client == 'object') {
        metadata.client = JSON.stringify(metadata.client);
      } else {
        metadata.client = metadata.client.toString();
      }
    }
    let lightTxJson = { lightTxData: lightTxData, metadata: metadata };

    // Create lightTx
    let lightTx = new LightTransaction(lightTxJson);

    // Sign lightTx
    let signer = this.signer;
    let signedLightTx = signer.signWithClientKey(lightTx);

    return signedLightTx;
  }

  async attach (stageHeight) {
    let trees = await this.storageManager.commitTrees(stageHeight);
    let fees = await this.storageManager.getFee(stageHeight);
    let assetList = [];
    let feeList = [];
    let txHash = '';
    let receipt = undefined;
    for (let i = 0; i < fees.length; i++) {
      assetList.push('0x' + fees[i].assetID);
      feeList.push('0x' + fees[i].fee);
    }
    let nonce = this.web3.utils.toHex(await this.web3.eth.getTransactionCount(boosterAccountAddress, 'pending'));
    let txMethodData = this.booster.methods.attach([
      '0x' + trees.receiptRootHash,
      '0x' + trees.accountRootHash,
      '0x'
    ], assetList, feeList).encodeABI();

    let txParams = {
      data: txMethodData,
      from: boosterAccountAddress,
      to: env.contractAddress,
      value: '0x0',
      nonce: nonce,
      gas: 4700000,
      gasPrice: '0x2540be400'
    };

    let tx = new EthereumTx(txParams);
    tx.sign(Buffer.from(env.signerKey, 'hex'));
    let serializedTx = '0x' + tx.serialize().toString('hex');

    receipt = await this.web3.eth.sendSignedTransaction(serializedTx);
    txHash = receipt.transactionHash;
    console.log('Attach txHash: ' + txHash);
    return receipt;
  }

  async finalize() {
    
    const period = await this.booster.methods.stagePeriod().call();
    const height = await this.booster.methods.stageHeight().call();
    console.log('period: ', period, 'stageHeight: ', height);
    const txMethodData = this.booster.methods.finalizeStage().encodeABI();
    let receipt;
    let nonce = this.web3.utils.toHex(await this.web3.eth.getTransactionCount(boosterAccountAddress, 'pending'));
    let txParams = {
      data: txMethodData,
      from: boosterAccountAddress,
      to: env.contractAddress,
      value: '0x0',
      nonce: nonce,
      gas: 4700000,
      gasPrice: '0x2540be400'
    };

    let tx = new EthereumTx(txParams);
    tx.sign(Buffer.from(env.signerKey, 'hex'));
    let serializedTx = '0x' + tx.serialize().toString('hex');

    receipt = await this.web3.eth.sendSignedTransaction(serializedTx);
    const txHash = receipt.transactionHash;
    console.log('Finalize txHash: ' + txHash);
    return receipt;
  }


  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }

  async _prepare (type, lightTxData) {
    assert(type === types.remittance, 'Parameter \'type\' should be \'remittance\'');

    lightTxData.nonce = this._getNonce();
    lightTxData.logID = '0';

    return lightTxData;
  }

  _getNonce () {
    return this._sha3((Math.random()).toString());
  }
}

module.exports = Infinitechain;
