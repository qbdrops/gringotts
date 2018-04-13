let EthUtils = require('ethereumjs-util');
let assert = require('assert');

const allowedLightTxDataKeys = ['from', 'to', 'value', 'fee', 'LSN', 'stageHeight'];
const allowedSigKeys = ['clientLightTx', 'serverLightTx'];

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

    this.lightTxData = orderedLightTxData;
    this.lightTxHash = EthUtils.sha3(JSON.stringify(this.lightTxData)).toString('hex');
    this.sig = sig;
  }
}

module.exports = LightTransaction;
