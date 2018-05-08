let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let EthUtils = require('ethereumjs-util');
let TreeManager = require('./utils/tree-manager');
let IndexedMerkleTree = require('./utils/indexed-merkle-tree');
let Web3 = require('web3');
let Sidechain = require('./abi/Sidechain.json');
let ErrorCodes = require('./errors/codes');
let LightTransaction = require('./models/light-transaction');
let Receipt = require('./models/receipt');
let BalanceSet = require('./utils/balance-set');
let GSNGenerator = require('./utils/gsn-generator');
let LightTxTypes = require('./models/types');
let BigNumber = require('bignumber.js');
let db = require('./db');
let chain = db.getSidechain();
let treeManager = new TreeManager(chain);
let gsnGenerator = new GSNGenerator(chain);
let balanceSet = new BalanceSet(chain);
let offchainReceipts = [];
let lightTxLock = false;

chain.get('offchain_receipts', (err, existedOffchainReceipts) => {
  let receipts;
  if (err) {
    receipts = [];
  } else {
    receipts = existedOffchainReceipts;
  }
  offchainReceipts = receipts;
});

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

var server = require('http').createServer(app);
var io = require('socket.io')(server);

const web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
const account = env.serverAddress;
const sidechainAddress = env.sidechainAddress;
const serverAddress = env.serverAddress;
let attachTxs = [];
let rootHashStageMap = {};
let txHashRootHashMap = {};
let burnAddress = '0000000000000000000000000000000000000000000000000000000000000000';
let initBalance = '0000000000000000000000000000000000000000000000000000000000000000';
io.on('connection', async function (socket) {
  console.log('connected');
  socket.on('disconnect', function () {
    console.log('disconnected');
  });
});

let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let sidechain = web3.eth.contract(Sidechain.abi).at(env.sidechainAddress);

// Watch latest block
web3.eth.filter('latest').watch((err, blockHash) => {
  if (err) {
    console.log(err);
  } else {
    let block = web3.eth.getBlock(blockHash);
    let txHashes = block.transactions;
    txHashes.forEach(async (txHash) => {
      // Check if the addNewStageTx is included
      if (attachTxs.includes(txHash)) {
        let receipt = web3.eth.getTransactionReceipt(txHash);
        let status = parseInt(receipt.status);

        if (status) {
          let stageHash = receipt.logs[0].topics[1].substring(2);
          console.log('stageHash: ' + stageHash);

          // Clear pending pool
          let targetReceipts = offchainReceipts.filter((receipt) => {
            return receipt.lightTxData.stageHeight == stageHeight;
          });

          // Remove offchain receipt json
          for (let i = 0; i < offchainReceipts.length; i++) {
            let offchainReceipt = offchainReceipts[i];
            for (let j = 0; j < targetReceipts.length; j++) {
              let targetReceipt = targetReceipts[j];
              if (offchainReceipt.receiptHash == targetReceipt.receiptHash) {
                offchainReceipts.splice(i, 1);
              }
            }
          }

          // remove from level db
          await db.updateOffchainRecepts(offchainReceipts);
        }
        let rootHash = txHashRootHashMap[txHash];
        let stageHeight = rootHashStageMap[rootHash];
        db.cancelStage(stageHeight);
      }
    });
  }
});

app.get('/balance/:address', async function (req, res) {
  try {
    let address = req.params.address;
    address = address.padStart(64, '0');
    if (address && (address != burnAddress)) {
      let balance = await balanceSet.getBalance(address);
      balance = new BigNumber('0x' + balance);
      res.send({ balance: balance.toString() });
    } else {
      res.status(400).send({ errors: 'Parameter address is missing.' });
    }
  } catch (e) {
    res.status(500).send({ errors: e.message });
  }
});

app.get('/slice', async function (req, res) {
  try {
    let query = req.query;
    let stageHeight = query.stage_height;
    let lightTxHash = query.light_tx_hash;

    let tree = treeManager.get(stageHeight);
    let receipt = await chain.get('receipt::' + lightTxHash);
    let slice = tree.getSlice(receipt.receiptHash);
    let treeNodeIndex = tree.computeLeafIndex(receipt.receiptHash);
    let receiptHashArray = tree.getAllLeafElements(receipt.receiptHash);

    res.send({ slice: slice, receiptHashArray: receiptHashArray, treeNodeIndex: treeNodeIndex });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

function isValidSig (lightTx) {
  if (!lightTx.hasServerLightTxSig()) {
    return false;
  } else {
    // validate signatures of lightTxs
    let msgHash = Buffer.from(lightTx.lightTxHash, 'hex');
    let prefix = new Buffer('\x19Ethereum Signed Message:\n32');
    let ethMsgHash = EthUtils.sha3(Buffer.concat([prefix, msgHash]));
    let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.serverLightTx.v, lightTx.sig.serverLightTx.r, lightTx.sig.serverLightTx.s);
    let address = '0x' + EthUtils.pubToAddress(publicKey).toString('hex');
    return account == address;
  }
}

app.get('/receipt/:lightTxHash', async function (req, res) {
  try {
    let lightTxHash = req.params.lightTxHash;
    let receipt = await chain.get('receipt::' + lightTxHash);
    res.send(receipt);
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

let _applyLightTx = async (lightTx) => {
  let code = ErrorCodes.SOMETHING_WENT_WRONG;
  let type = lightTx.type();
  let fromAddress = lightTx.lightTxData.from;
  let toAddress = lightTx.lightTxData.to;
  let fromBalance = initBalance;
  let toBalance = initBalance;
  let oldFromBalance;
  let oldToBalance;
  try {
    if (type === LightTxTypes.deposit) {
      let value = new BigNumber('0x' + lightTx.lightTxData.value);
      toBalance = await balanceSet.getBalance(toAddress);
      oldToBalance = toBalance;
      toBalance = new BigNumber('0x' + toBalance);
      toBalance = toBalance.plus(value);
      toBalance = toBalance.toString(16).padStart(64, '0');
      await balanceSet.setBalance(toAddress, toBalance);
    } else if ((type === LightTxTypes.withdrawal) ||
              (type === LightTxTypes.instantWithdrawal)) {
      let value = new BigNumber('0x' + lightTx.lightTxData.value);
      fromBalance = await balanceSet.getBalance(fromAddress);
      oldFromBalance = fromBalance;
      fromBalance = new BigNumber('0x' + fromBalance);
      if (fromBalance.isGreaterThanOrEqualTo(value)) {
        fromBalance = fromBalance.minus(value);
        fromBalance = fromBalance.toString(16).padStart(64, '0');
        await balanceSet.setBalance(fromAddress, fromBalance);
      } else {
        code = ErrorCodes.INSUFFICIENT_BALANCE;
        throw new Error('Insufficient balance.');
      }
    } else if (type === LightTxTypes.remittance) {
      let value = new BigNumber('0x' + lightTx.lightTxData.value);

      fromBalance = await balanceSet.getBalance(fromAddress);
      oldFromBalance = fromBalance;
      toBalance = await balanceSet.getBalance(toAddress);
      oldToBalance = toBalance;
      fromBalance = new BigNumber('0x' + fromBalance);
      toBalance = new BigNumber('0x' + toBalance);
      if (fromBalance.isGreaterThanOrEqualTo(value)) {
        fromBalance = fromBalance.minus(value);
        toBalance = toBalance.plus(value);

        fromBalance = fromBalance.toString(16).padStart(64, '0');
        toBalance = toBalance.toString(16).padStart(64, '0');

        await balanceSet.setBalance(fromAddress, fromBalance);
        await balanceSet.setBalance(toAddress, toBalance);
      } else {
        code = ErrorCodes.INSUFFICIENT_BALANCE;
        throw new Error('Insufficient balance.');
      }
    } else {
      code = ErrorCodes.INVALID_LIGHT_TX_TYPE;
      throw new Error('Invalid light transaction type.');
    }

    // GSN
    let gsn = await gsnGenerator.getGSN();
    let receiptJson = lightTx.toJson();
    receiptJson.receiptData = {
      GSN: gsn,
      lightTxHash: lightTx.lightTxHash,
      fromBalance: fromBalance,
      toBalance: toBalance,
    };

    let receipt = new Receipt(receiptJson);

    // Save Receipt
    let containsKnownReceipt = false;
    let stageHasBeenBuilt = false;

    try {
      await chain.get('receipt::' + receipt.lightTxHash);
      containsKnownReceipt = true;
    } catch (e) {
      if (e.type == 'NotFoundError') {
        // No known receipt, do nothing
      } else {
        code = ErrorCodes.SOMETHING_WENT_WRONG;
        throw e;
      }
    }

    if (containsKnownReceipt) {
      code = ErrorCodes.CONTAINS_KNOWN_RECEIPT;
      throw new Error('Contains known receipt.');
    } else {
      let receiptStageHeight = parseInt(receipt.lightTxData.stageHeight);
      try {
        await chain.get('stage::' + receiptStageHeight);
        stageHasBeenBuilt = true;
      } catch (e) {
        if (e.type == 'NotFoundError') {
          // Stage does not existed, do nothing
        } else {
          code = ErrorCodes.SOMETHING_WENT_WRONG;
          throw e;
        }
      }
      let stopReceiveStage = db.getStopReceiveStage();
      let isNotValid = (receiptStageHeight == stopReceiveStage);
      if (stageHasBeenBuilt || isNotValid) {
        code = ErrorCodes.STAGE_HAS_BEEN_BUILT;
        throw new Error('Stage has been built.');
      }

      if (stopReceiveStage && ((receiptStageHeight - 1) !== stopReceiveStage)) {
        code = ErrorCodes.CONTAINS_OVER_HEIGHT_RECEIPT;
        throw new Error('Contains over height receipt.');
      }

      let receiptJson = receipt.toJson();
      offchainReceipts.push(receiptJson);

      await chain.batch()
        .put('balances', balanceSet.balances())
        .put('GSN', gsn)
        .put('offchain_receipts', offchainReceipts)
        .put('receipt::' + receipt.lightTxHash, receipt.toJson())
        .write();

      return { ok: true, receipt: receipt };
    }
  } catch (e) {
    console.error(e);
    // rollback all modifications in the leveldb transaction
    offchainReceipts.pop();
    // rollback balances in memory
    if (type === LightTxTypes.deposit) {
      await balanceSet.setBalance(toAddress, oldToBalance);
    } else if ((type === LightTxTypes.withdrawal) ||
              (type === LightTxTypes.instantWithdrawal)) {
      await balanceSet.setBalance(fromAddress, oldFromBalance);
    } else if (type === LightTxTypes.remittance) {
      await balanceSet.setBalance(fromAddress, oldFromBalance);
      await balanceSet.setBalance(toAddress, oldToBalance);
    }
    return { ok: false, code: code, message: e.message };
  }
};

let applyLightTx = (lightTx) => {
  // gringotts can only process one lightTx at the same time
  return new Promise(async (resolve) => {
    if (!lightTxLock) {
      lightTxLock = true;
      let updateResult = await _applyLightTx(lightTx);
      lightTxLock = false;
      resolve(updateResult);
    } else {
      let timerId = setInterval(async () => {
        if (!lightTxLock) {
          lightTxLock = true;
          let updateResult = await _applyLightTx(lightTx);
          lightTxLock = false;
          clearInterval(timerId);
          resolve(updateResult);
        }
      }, Math.floor(Math.random() * 500));
    }
  });
};

app.post('/send/light_tx', async function (req, res) {
  try {
    let lightTxJson = req.body.lightTxJson;
    let lightTx = new LightTransaction(lightTxJson);
    let isExisted = true;
    try {
      await chain.get('receipt::' + lightTx.lightTxHash);
    } catch (e) {
      if (e.type == 'NotFoundError') {
        isExisted = false;
      }
    }

    let success = false;
    let message = 'Something went wrong.';
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let stageHeight = sidechain.stageHeight();
    let containsOlderPayments = (parseInt(lightTx.lightTxData.stageHeight) <= stageHeight);
    let receipt = null;

    if (containsOlderPayments) {
      message = 'Contains older payment.';
      code = ErrorCodes.CONTAINS_OLDER_RECEIPT;
    } else if (isExisted) {
      message = 'Contains known light transaction.';
      code = ErrorCodes.CONTAINS_KNOWN_LIGHT_TX;
    } else {
      let isValidSigLightTx = isValidSig(lightTx);
      if (isValidSigLightTx) {
        let updateResult = await applyLightTx(lightTx);

        if (updateResult.ok) {
          success = true;
          receipt = updateResult.receipt;
        } else {
          message = updateResult.message;
          code = updateResult.code;
        }
      } else {
        message = 'Contains wrong signature receipt.';
        code = ErrorCodes.WRONG_SIGNATURE;
      }
    }

    if (success) {
      res.send({ ok: true, receipt: receipt });
    } else {
      res.send({ ok: false, message: message, code: code });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, message: e.message, errors: e.message, code: ErrorCodes.SOMETHING_WENT_WRONG });
  }
});

app.get('/pending/roothashes', async function (req, res) {
  try {
    let pendingRootHashes = await db.pendingRootHashes();
    res.send(pendingRootHashes);
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/roothash', async function (req, res) {
  try {
    let stageHeight = parseInt(sidechain.stageHeight()) + 1;
    let receipts = await db.pendingReceipts(stageHeight);
    let receiptHashes = receipts.map(receipt => receipt.receiptHash);
    if (receiptHashes.length > 0) {
      let tree = new IndexedMerkleTree();
      treeManager.set(stageHeight, tree);
      console.log('Building Stage Height: ' + stageHeight);
      tree.build(stageHeight, receiptHashes);
      let receiptRootHash = tree.receiptRootHash;
      res.send({ ok: true, receiptRootHash: receiptRootHash, stageHeight: stageHeight });
    } else {
      res.send({ ok: false, message: 'Receipts are empty.', code: ErrorCodes.RECEIPTS_ARE_EMPTY });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/roothash/:stageHeight', async function (req, res) {
  let stageHeight = req.params.stageHeight;
  let tree = treeManager.get(stageHeight);

  if (tree) {
    res.send({ ok: true, receiptRootHash: tree.receiptRootHash });
  } else {
    res.send({ ok: false, message: 'StageHeight does not exist.' });
  }
});

app.post('/attach', async function (req, res) {
  try {
    let stageHeight = req.body.stageHeight;
    let serializedTx = req.body.serializedTx;

    if (stageHeight) {
      try {
        let valid = false;
        let receipts = await db.pendingReceipts(stageHeight);
        let receiptHashes = receipts.map(receipt => receipt.receiptHash);
        if (receiptHashes.length > 0) {
          let tree = new IndexedMerkleTree();
          console.log('Building Stage Height: ' + stageHeight);
          tree.build(stageHeight, receiptHashes);
          let receiptRootHash = tree.receiptRootHash;
          let targetTree = treeManager.get(stageHeight);
          let targetRootHash = targetTree.receiptRootHash;

          console.log(receiptRootHash);
          console.log(targetRootHash);
          
          if (receiptRootHash == targetRootHash) {
            valid = true;
          }
        }

        if (valid) {
          let txHash = web3.eth.sendRawTransaction(serializedTx);
          console.log('Committed txHash: ' + txHash);
          // Add txHash to attachTxs pool
          res.send({ ok: true, txHash: txHash });
        } else {
          throw new Error('Root hash are not match.');
        }
      } catch (e) {
        console.log(e);
        res.status(500).send({ ok: false, errors: e.message });
      }
    } else {
      res.send({ ok: false, errors: 'Does not provide rootHash.' });
    }
  } catch (e) {
    console.log(e);
    res.send({ ok: false, errors: e.message });
  }
});

app.get('/sidechain/address', async function (req, res) {
  try {
    res.send({ address: sidechainAddress });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/server/address', async function (req, res) {
  try {
    res.send({ address: serverAddress });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/viable/stage/height', async function (req, res) {
  try {
    let height = await db.viableStageHeight();
    res.send({ height: height });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/pending/receipts', async function (req, res) {
  try {
    res.send(offchainReceipts);
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

server.listen(3000, async function () {
  try {
    console.log('App listening on port 3000!');
  } catch (e) {
    console.error(e.message);
  }
});
