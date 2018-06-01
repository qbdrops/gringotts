let EthUtils = require('ethereumjs-util');
let assert = require('assert');
let types = require('./types.js');

const allowedLightTxDataKeys = ['from', 'to', 'assetID', 'value', 'fee', 'nonce', 'logID', 'metadataHash'];
const allowedSigKeys = ['clientLightTx', 'serverLightTx'];
const instantWithdrawalLimit = 10;

class LightTransaction {
  constructor (lightTxJson) {
    // Check if recceiptJson has correct keys
    assert(lightTxJson.hasOwnProperty('lightTxData'), 'Paramter \'lightTxJson\' should have key \'lightTxData\'.');

    let lightTxData = lightTxJson.lightTxData;
    let sig = Object.assign({ clientLightTx: {}, serverLightTx: {} }, lightTxJson.sig);

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

    // Check if all lightTxData keys are included
    // Meanwhile make an ordered lightTxData
    let keys = Object.keys(lightTxData);
    let orderedLightTxData = {};
    allowedLightTxDataKeys.forEach(key => {
      if (key != 'metadataHash') {
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

    this.metadata = (lightTxJson.metadata || {});
    this.lightTxData = this._normalize(orderedLightTxData);
    this.lightTxData.metadataHash = this._sha3(JSON.stringify(this.metadata));
    this.sig = sig;
    this.lightTxHash = this._sha3(Object.values(this.lightTxData).reduce((acc, curr) => acc + curr, ''));
  }

  _normalize (lightTxData) {
    lightTxData.from    = lightTxData.from.slice(-40).padStart(64, '0').slice(-64);
    lightTxData.to      = lightTxData.to.slice(-40).padStart(64, '0').slice(-64);
    lightTxData.logID   = lightTxData.logID.toString(16).padStart(64, '0').slice(-64);
    lightTxData.nonce   = lightTxData.nonce.toString(16).padStart(64, '0').slice(-64);
    lightTxData.assetID = this._to32BytesHex(lightTxData.assetID, false);
    lightTxData.value   = this._to32BytesHex(lightTxData.value, true);
    lightTxData.fee     = this._to32BytesHex(lightTxData.fee, true);
    return lightTxData;
  }

  _to32BytesHex (n, toWei) {
    let startWith0x = ((n.toString().slice(0, 2) == '0x') && (n.toString().substring(2).length == 64));
    let lengthIs64Bytes = (n.toString().length == 64);

    if (startWith0x || lengthIs64Bytes) {
      n = n.slice(-64);
    } else {
      let m = parseFloat(n);
      m = toWei ? (m * 1e18) : m;
      let h = m.toString(16);
      assert(h != 'NaN', '\'' + n + '\' can not be parsed to an integer.');
      n = h.padStart(64, '0');
    }

    return n;
  }

  type () {
    let res;
    let from = this.lightTxData.from;
    let to = this.lightTxData.to;
    let value = parseInt(this.lightTxData.value, 16) / 1e18;

    if (from == 0 || to == 0) {
      if (from == 0) {
        res = types.deposit;
      } else {
        res = (value > instantWithdrawalLimit) ? types.withdrawal : types.instantWithdrawal;
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

  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }
}

module.exports = LightTransaction;
