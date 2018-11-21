let Util = require('../utils/util');
let assert = require('assert');
let LightTransaction = require('./light-transaction');
let types = require('./types');

const allowedReceiptJsonKeys = ['lightTxHash', 'lightTxData', 'sig', 'receiptData', 'metadata'];
const allowedReceiptDataKeys = ['stageHeight', 'GSN', 'fromPreGSN', 'toPreGSN', 'lightTxHash', 'fromBalance', 'toBalance', 'serverMetadataHash'];

class Receipt {
  constructor (receiptJson) {
    // Remove keys which are not in the whitelist
    Object.keys(receiptJson).forEach(key => {
      if (!allowedReceiptJsonKeys.includes(key)) {
        delete receiptJson[key];
      }
    });

    Object.keys(receiptJson.receiptData).forEach(key => {
      if (!allowedReceiptDataKeys.includes(key)) {
        delete receiptJson.receiptData[key];
      }
    });

    // Check Json format (except for 'metadata')
    allowedReceiptJsonKeys.filter(key => key != 'metadata').forEach(key => {
      assert(Object.keys(receiptJson).includes(key), 'Parameter \'receiptJson\' does not include key \'' + key + '\'.');
    });

    // Check lightTxData format
    let lightTx = new LightTransaction({
      lightTxData: receiptJson.lightTxData,
      metadata: receiptJson.metadata,
      sig: receiptJson.sig
    });
    assert(lightTx.hasClientLightTxSig(), '\'clientLightTx\' signature is empty.');
    assert(lightTx.hasServerLightTxSig(), '\'serverLightTx\' signature is empty.');

    // Meanwhile make an ordered receiptData
    let receiptKeys = Object.keys(receiptJson.receiptData);
    let orderedReceiptData = {};
    allowedReceiptDataKeys.forEach(key => {
      if (key != 'serverMetadataHash') {
        assert(receiptKeys.includes(key), 'Parameter \'receiptData\' does not include key \'' + key + '\'.');
      }
      orderedReceiptData[key] = receiptJson.receiptData[key];
    });
    assert(lightTx.lightTxHash === receiptJson.receiptData.lightTxHash, 'The \'lightTxHash\' is different in receiptData and lightTransaction.');

    this.lightTxHash = lightTx.lightTxHash;
    this.lightTxData = lightTx.lightTxData;
    this.receiptData = this._normalize(orderedReceiptData);
    this.metadata = (receiptJson.metadata);
    this.receiptData.serverMetadataHash = Util.sha3(this.metadata.server);
    this.receiptHash = Util.sha3(Object.values(this.receiptData).reduce((acc, curr) => acc + curr, ''));
    this.sig = receiptJson.sig;
    // Initialize boosterReceipt sig if it is undefined.
    if (!this.sig.boosterReceipt || !this.hasBoosterReceiptSig()) {
      this.sig.boosterReceipt = {};
    }
    this.instantWithdrawalLimit = Util.toBN(1E19);
  }

  _normalize (receiptData) {
    receiptData.stageHeight = Util.toByte32(receiptData.stageHeight);
    receiptData.GSN         = Util.toByte32(receiptData.GSN);
    receiptData.fromPreGSN  = Util.toByte32(receiptData.fromPreGSN);
    receiptData.toPreGSN    = Util.toByte32(receiptData.toPreGSN);
    receiptData.fromBalance = Util.toByte32(receiptData.fromBalance);
    receiptData.toBalance   = Util.toByte32(receiptData.toBalance);
    return receiptData;
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

  hasBoosterReceiptSig () {
    return (Object.keys(this.sig.boosterReceipt).sort().toString() == 'r,s,v');
  }

  toJson () {
    let json = {
      lightTxHash: this.lightTxHash,
      lightTxData: this.lightTxData,
      receiptHash: this.receiptHash,
      receiptData: this.receiptData,
      sig: this.sig,
      metadata: this.metadata
    };
    return json;
  }

  toArray () {
    let arrayReceipt = [
      '0x' + this.lightTxHash,
      '0x' + this.lightTxData.from,
      '0x' + this.lightTxData.to,
      '0x' + this.lightTxData.assetID,
      '0x' + this.lightTxData.value,
      '0x' + this.lightTxData.fee,
      '0x' + this.lightTxData.nonce,
      '0x' + this.lightTxData.logID,
      '0x' + this.lightTxData.clientMetadataHash,
      this.sig.clientLightTx.v,
      this.sig.clientLightTx.r,
      this.sig.clientLightTx.s,
      '0x' + this.receiptData.GSN,
      '0x' + this.receiptData.fromPreGSN,
      '0x' + this.receiptData.toPreGSN,
      '0x' + this.receiptData.fromBalance,
      '0x' + this.receiptData.toBalance,
      '0x' + this.receiptData.serverMetadataHash,
      this.sig.serverLightTx.v,
      this.sig.serverLightTx.r,
      this.sig.serverLightTx.s,
      this.sig.boosterReceipt.v,
      this.sig.boosterReceipt.r,
      this.sig.boosterReceipt.s
    ];
    return arrayReceipt;
  }
}

module.exports = Receipt;
