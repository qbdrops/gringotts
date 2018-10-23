let env = require('./env');
let Booster = require('./abi/Booster.json');
let EthUtils = require('ethereumjs-util');
let EthereumTx = require('ethereumjs-tx');
let Web3 = require('web3');

let web3 = new Web3(env.web3Url);
let booster = new web3.eth.Contract(Booster.abi, env.contractAddress);
let from = '0x' + EthUtils.privateToAddress(Buffer.from(env.signerKey, 'hex')).toString('hex');
let to = env.contractAddress;

let getFee = async () => {
  let stageHeight = parseInt(await booster.methods.stageHeight().call());
  console.log(' Get fee with stageHeight = ' + stageHeight + '.');
  console.log('If gasUse = 24XXX, means this stage height no fee.');
  let nonce = web3.utils.toHex(await web3.eth.getTransactionCount(from, 'pending'));
  let txMethodData = booster.methods.getFeeWithStageHeight(stageHeight).encodeABI();

  let txParams = {
    data: txMethodData,
    from: from,
    to: to,
    value: '0x0',
    nonce: nonce,
    gas: 4700000,
    gasPrice: '0x2540be400'
  };

  let tx = new EthereumTx(txParams);
  tx.sign(Buffer.from(env.signerKey, 'hex'));
  let serializedTx = '0x' + tx.serialize().toString('hex');

  let receipt = await web3.eth.sendSignedTransaction(serializedTx);
  console.log(receipt);
}

getFee();