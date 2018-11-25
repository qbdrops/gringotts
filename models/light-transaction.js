let Util = require('../utils/util');
let assert = require('assert');
let types = require('./types');

const allowedLightTxDataKeys = ['from', 'to', 'assetID', 'value', 'fee', 'nonce', 'logID', 'clientMetadataHash'];
const allowedSigKeys = ['clientLightTx', 'serverLightTx'];
const allowedMetadataKeys = ['client', 'server'];

class LightTransaction {
  constructor (lightTxJson) {
    // Check if recceiptJson has correct keys
    assert(lightTxJson.hasOwnProperty('lightTxData'), 'Paramter \'lightTxJson\' should have key \'lightTxData\'.');

    let lightTxData = lightTxJson.lightTxData;
    let sig = Object.assign({ clientLightTx: {}, serverLightTx: {} }, lightTxJson.sig);
    let metadata = Object.assign({ client: '', server: '' }, lightTxJson.metadata);
    assert(typeof metadata.client == 'string', 'Paramter \'metadata.client\' should be a string type.');
    assert(typeof metadata.server == 'string', 'Paramter \'metadata.server\' should be a string type.');

    // Remove keys which are not in the whitelist
    Object.keys(lightTxData).forEach(key => {
      if (!allowedLightTxDataKeys.includes(key)) {
        delete lightTxData[key];
      }
    });

    Object.keys(sig).forEach(key => {
      if (!allowedSigKeys.includes(key)) {
        delete sig[key];
      }
    });

    Object.keys(metadata).forEach(key => {
      if (!allowedMetadataKeys.includes(key)) {
        delete metadata[key];
      }
    });

    // Check if all lightTxData keys are included
    // Meanwhile make an ordered lightTxData
    let keys = Object.keys(lightTxData);
    let orderedLightTxData = {};
    allowedLightTxDataKeys.forEach(key => {
      if (key != 'clientMetadataHash') {
        assert(keys.includes(key), 'Parameter \'lightTxData\' does not include key \'' + key + '\'.');
      }
      orderedLightTxData[key] = (lightTxData[key] || lightTxData[key] == 0) ? lightTxData[key] : '';
    });

    // Check if sig has correct format
    Object.keys(sig).forEach(key => {
      let _s = Object.keys(sig[key]).sort().toString();
      let isSigFormatCorrect = (_s == 'r,s,v');
      let isSigDefault = (_s == '');
      assert(isSigFormatCorrect || isSigDefault, '\'sig\' does not have correct format.');
    });

    this.lightTxData = this._normalize(orderedLightTxData);
    this.lightTxData.clientMetadataHash = Util.sha3(metadata.client);
    this.sig = sig;
    this.lightTxHash = Util.sha3(Object.values(this.lightTxData).reduce((acc, curr) => acc + curr, ''));
    this.metadata = metadata;
    this.instantWithdrawalLimit = Util.toBN(1E19);
  }

  _normalize (lightTxData) {
    lightTxData.from    = Util.toByte32(lightTxData.from);
    lightTxData.to      = Util.toByte32(lightTxData.to);
    lightTxData.logID   = Util.toByte32(lightTxData.logID);
    lightTxData.nonce   = Util.toByte32(lightTxData.nonce);
    lightTxData.assetID = Util.toByte32(lightTxData.assetID);
    lightTxData.value   = Util.toByte32(Util.isByte32(lightTxData.value)? lightTxData.value : Util.toWei(lightTxData.value, 18));
    lightTxData.fee     = Util.toByte32(Util.isByte32(lightTxData.fee)? lightTxData.fee : Util.toWei(lightTxData.fee, 18));
    return lightTxData;
  }

  type () {
    let res;
    let from = this.lightTxData.from;
    let to = this.lightTxData.to;
    let value = Util.toBN(this.lightTxData.value, 16);

    if (from == 0 || to == 0) {
      if (from == 0) {
        res = types.deposit;
      } else {
        res = (value.gt(this.instantWithdrawalLimit)) ? types.withdrawal : types.instantWithdrawal;
      }
    } else {
      res = types.remittance;
    }

    return res;
  }

  hasClientLightTxSig () {
    return (Object.keys(this.sig.clientLightTx).sort().toString() == 'r,s,v');
  }

  hasServerLightTxSig () {
    return (Object.keys(this.sig.serverLightTx).sort().toString() == 'r,s,v');
  }

  toJson () {
    let json = {
      lightTxHash: this.lightTxHash,
      lightTxData: this.lightTxData,
      sig: this.sig,
      metadata: this.metadata
    };
    return json;
  }

  toString () {
    return JSON.stringify(this.toJson());
  }
}

module.exports = LightTransaction;
