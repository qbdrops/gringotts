let EthUtils = require('ethereumjs-util');
let assert = require('assert');
let types = require('./types.js');

const allowedLightTxDataKeys = ['from', 'to', 'value', 'fee', 'LSN', 'stageHeight'];
const allowedSigKeys = ['clientLightTx', 'serverLightTx'];
const instantWithdrawalLimit = 10;

class LightTransaction {
  constructor (lightTxData, sig = null) {
    // Set default sig
    if (!sig) {
      sig = { clientLightTx: {}, serverLightTx: {} };
    }

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
      assert(keys.includes(key), 'Parameter \'lightTxData\' does not include key \'' + key + '\'.');
      orderedLightTxData[key] = lightTxData[key];
    });

    // Check if sig has correct format
    Object.keys(sig).forEach(key => {
      let _s = Object.keys(sig[key]).sort().toString();
      let isSigFormatCorrect = (_s == 'r,s,v');
      let isSigDefault = (_s == '');
      assert(isSigFormatCorrect || isSigDefault, '\'sig\' does not have correct format.');
    });

    this.lightTxData = this._normalize(orderedLightTxData);
    this.lightTxHash = EthUtils.sha3(JSON.stringify(this.lightTxData)).toString('hex');
    this.sig = sig;
  }

  _normalize (lightTxData) {
    lightTxData.from        = lightTxData.from.padStart(64, '0').slice(-64);
    lightTxData.to          = lightTxData.to.padStart(64, '0').slice(-64);
    lightTxData.stageHeight = this._to32BytesHex(lightTxData.stageHeight, false);
    lightTxData.LSN         = this._to32BytesHex(lightTxData.LSN, false);
    lightTxData.value       = this._to32BytesHex(lightTxData.value, true);
    lightTxData.fee         = this._to32BytesHex(lightTxData.fee, true);
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
      sig: this.sig
    };
    return json;
  }

  toString () {
    return JSON.stringify(this.toJson());
  }

  static parseProposeDeposit (eventData) {
    let lightTxData = {
      from: '0',
      to: eventData._client,
      value: eventData._value,
      LSN: eventData._lsn,
      fee: eventData._fee,
      stageHeight: eventData._stageHeight
    };

    let sig = {
      clientLightTx: {
        v: eventData._v,
        r: eventData._r,
        s: eventData._s
      }
    };

    let lightTx = new LightTransaction(lightTxData, sig);
    return lightTx;
  }
}

module.exports = LightTransaction;
