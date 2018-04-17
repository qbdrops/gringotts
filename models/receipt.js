import EthUtils from 'ethereumjs-util';
import assert from 'assert';
import LightTransaction from '@/models/light-transaction';

const allowedReceiptDataKeys = ['GSN', 'lightTxHash', 'fromBalance', 'toBalance'];

class Receipt {
  constructor (lightTx, receiptData) {
    // check if lightTx instanceof LightTransaction object or not.
    assert(lightTx instanceof LightTransaction, 'Parameter \'lightTx\' is not a LightTransaction instance.');
    Object.keys(receiptData).forEach(key => {
      if (!allowedReceiptDataKeys.includes(key)) {
        delete receiptData[key];
      }
    });
    // Meanwhile make an ordered receiptData
    let receiptKeys = Object.keys(receiptData);
    let orderedReceiptData = {};
    allowedReceiptDataKeys.forEach(key => {
      assert(receiptKeys.includes(key), 'Parameter \'receiptData\' does not include key \'' + key + '\'.');
      orderedReceiptData[key] = receiptData[key];
    });

    this.lightTxHash = lightTx.lightTxHash;
    this.receiptHash = EthUtils.sha3(JSON.stringify(this.receiptData)).toString('hex');
    this.lightTxData = lightTx.lightTxData;
    this.receiptData = orderedReceiptData;
    this.sig = lightTx.sig;
    this.sig.serverReceipt = {};
  }
}
export default Receipt;
