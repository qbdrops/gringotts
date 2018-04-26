let EthUtils = require('ethereumjs-util');
let assert = require('assert');
let LightTransaction = require('./light-transaction');
let types = require('./types');

const allowedReceiptJsonKeys = ['lightTxHash', 'lightTxData', 'sig', 'receiptData'];
const allowedReceiptDataKeys = ['GSN', 'lightTxHash', 'fromBalance', 'toBalance'];
const instantWithdrawalLimit = 10;

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

    // Check Json format
    allowedReceiptJsonKeys.forEach(key => {
      assert(Object.keys(receiptJson).includes(key), 'Parameter \'receiptJson\' does not include key \'' + key + '\'.');
    });

    // Check lightTxData format
    let lightTx = new LightTransaction(receiptJson.lightTxData, receiptJson.sig);
    assert(lightTx.hasClientLightTxSig(), '\'clientLightTx\' signature is empty.');
    assert(lightTx.hasServerLightTxSig(), '\'serverLightTx\' signature is empty.');

    // Meanwhile make an ordered receiptData
    let receiptKeys = Object.keys(receiptJson.receiptData);
    let orderedReceiptData = {};
    allowedReceiptDataKeys.forEach(key => {
      assert(receiptKeys.includes(key), 'Parameter \'receiptData\' does not include key \'' + key + '\'.');
      orderedReceiptData[key] = receiptJson.receiptData[key];
    });
    assert(lightTx.lightTxHash === receiptJson.receiptData.lightTxHash, 'The \'lightTxHash\' is different in receiptData and lightTransaction.');

    this.lightTxHash = lightTx.lightTxHash;
    this.lightTxData = lightTx.lightTxData;
    this.receiptData = this._normalize(orderedReceiptData);
    this.receiptHash = EthUtils.sha3(
      Object.values(this.receiptData).reduce((acc, curr) => acc + curr, '')
    ).toString('hex');
    this.sig = receiptJson.sig;
    // Initialize serverReceipt sig if it is undefined.
    if (!this.sig.serverReceipt) {
      this.sig.serverReceipt = {};
    }
  }

  _normalize = (receiptData) => {
    receiptData.GSN         = receiptData.GSN.toString(16).padStart(64, '0').slice(-64);
    receiptData.fromBalance = receiptData.fromBalance.toString(16).padStart(64, '0').slice(-64);
    receiptData.toBalance   = receiptData.toBalance.toString(16).padStart(64, '0').slice(-64);
    return receiptData;
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

  hasServerReceiptSig () {
    return (Object.keys(this.sig.serverReceipt).sort().toString() == 'r,s,v');
  }

  toJson () {
    let json = {
      lightTxHash: this.lightTxHash,
      lightTxData: this.lightTxData,
      receiptHash: this.receiptHash,
      receiptData: this.receiptData,
      sig: this.sig
    };
    return json;
  }
}

module.exports = Receipt;
