const EthUtils = require('ethereumjs-util');
const assert = require('assert');
const Receipt = require('../models/receipt');
const LightTransaction = require('../models/light-transaction');
const types = require('../models/types');

class Verifier {
  constructor (serverAddress, boosterAccountAddress) {
    this.serverAddress = serverAddress;
    this.boosterAccountAddress = boosterAccountAddress;
  }

  verifyLightTx (lightTx) {
    assert(lightTx instanceof LightTransaction, 'Parameter \'lightTx\' is not a LightTransaction instance.');
    return this._verify(lightTx);
  }

  verifyReceipt (receipt) {
    assert(receipt instanceof Receipt, 'Parameter \'receipt\' is not a Receipt instance.');
    return this._verify(receipt);
  }

  _verify (object) {
    let isValid;
    let clientAddress;
    let klass;
    if (object instanceof LightTransaction) {
      klass = 'lightTx';
    } else if (object instanceof Receipt) {
      klass = 'receipt';
    } else {
      throw new Error('\'object\' should be instance of \'LightTransaction\' or \'Receipt\'.');
    }

    switch (object.type()) {
    case types.deposit:
      clientAddress = object.lightTxData.to.slice(-40);
      break;
    case types.withdrawal:
    case types.instantWithdrawal:
    case types.remittance:
      clientAddress = object.lightTxData.from.slice(-40);
      break;
    }
    let serverAddress = EthUtils.stripHexPrefix(this.serverAddress).toLowerCase();
    let boosterAccountAddress = EthUtils.stripHexPrefix(this.boosterAccountAddress).toLowerCase();
    let isClientLightTxSigValid = true;
    let isServerLightTxSigValid = true;
    let isBoosterReceiptSigValid = true;

    clientAddress = clientAddress.toLowerCase();

    if (object.hasClientLightTxSig()) {
      isClientLightTxSigValid = (clientAddress == this._recover(object.lightTxHash, object.sig.clientLightTx).toLowerCase());
    }

    if (object.hasServerLightTxSig()) {
      isServerLightTxSigValid = (serverAddress == this._recover(object.lightTxHash, object.sig.serverLightTx).toLowerCase());
    }

    if (klass == 'receipt') {
      if (object.hasBoosterReceiptSig()) {
        isBoosterReceiptSigValid = (boosterAccountAddress == this._recover(object.receiptHash, object.sig.boosterReceipt).toLowerCase());
      }
    }

    isValid = (isClientLightTxSigValid && isServerLightTxSigValid && isBoosterReceiptSigValid);
    return isValid;
  }

  _recover (msgHash, signature) {
    let prefix = new Buffer('\x19Ethereum Signed Message:\n32');
    let ethMsgHash = EthUtils.sha3(Buffer.concat([prefix, Buffer.from(msgHash, 'hex')]));
    let publicKey = EthUtils.ecrecover(ethMsgHash, signature.v, signature.r, signature.s);
    let address = EthUtils.pubToAddress(publicKey).toString('hex');
    return address;
  }
}

module.exports = Verifier;
