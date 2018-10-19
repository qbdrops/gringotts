const env = require('../env');
const axios = require('axios');
const assert = require('assert');
const Signer = require('./signer');
const EthUtils = require('ethereumjs-util');
const types = require('../models/types');
const LightTransaction = require('../models/light-transaction');

class Infinitechain {
  constructor () {
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
