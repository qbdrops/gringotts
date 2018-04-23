let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let EthUtils = require('ethereumjs-util');
let db = require('./db');
let IndexedMerkleTree = require('./indexedMerkleTree/IndexedMerkleTree');
let Sidechain = require('./utils/SideChain');
let Web3 = require('web3');
let ResultTypes = require('./types/result');
let LightTransaction = require('./models/light-transaction');

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
let building = false;
let addNewStageTxs = [];
let rootHashStageMap = {};
let txHashRootHashMap = {};

io.on('connection', async function (socket) {
  console.log('connected');
  socket.on('disconnect', function() {
    console.log('disconnected');
  });
});

let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));

// Watch latest block
web3.eth.filter('latest').watch((err, blockHash) => {
  if (err) {
    console.log(err);
  } else {
    let block = web3.eth.getBlock(blockHash);
    let txHashes = block.transactions;
    txHashes.forEach(async (txHash) => {
      // Check if the addNewStageTx is included
      if (addNewStageTxs.includes(txHash)) {
        let receipt = web3.eth.getTransactionReceipt(txHash);
        let status = parseInt(receipt.status);

        if (status) {
          let stageHash = receipt.logs[0].topics[1].substring(2);
          console.log('stageHash: ' + stageHash);

          // Clear pending pool
          await db.clearPendingPayments(stageHash);
        }
        building = false;
        let rootHash = txHashRootHashMap[txHash];
        let stageHeight = rootHashStageMap[rootHash];
        db.cancelStage(stageHeight);
      }
    });
  }
});

app.get('/slice', async function (req, res) {
  try {
    let query = req.query;
    let stageHeight = query.stage_height;
    let paymentHash = query.payment_hash;

    let tree = new IndexedMerkleTree();
    let slice = await tree.getSlice(stageHeight, paymentHash);
    let payment = await db.getPayment(paymentHash);
    var treeNodeIndex;
    if (payment) {
      treeNodeIndex = payment.treeNodeIndex;
    }
    let paymentHashArray = await tree.getAllLeafElements(stageHeight, paymentHash);

    res.send({ slice: slice, paymentHashArray: paymentHashArray, treeNodeIndex: treeNodeIndex });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

function isValidSig (lightTx) {
  // validate signatures of lightTxs
  let msgHash = Buffer.from(lightTx.lightTxHash);
  let prefix = new Buffer('\x19Ethereum Signed Message:\n');
  let ethMsgHash = EthUtils.sha3(Buffer.concat([prefix, new Buffer(String(msgHash.length)), msgHash]));
  let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.serverLightTx.v, lightTx.sig.serverLightTx.r, lightTx.sig.serverLightTx.s);
  let address = '0x' + EthUtils.pubToAddress(publicKey).toString('hex');
  return account == address;
}

app.post('/send/light_tx', async function (req, res) {
  try {
    let lightTxJson = req.body.lightTxJson;
    let lightTx = new LightTransaction(lightTxJson.lightTxData, lightTxJson.sig);

    let success = false;
    let message = 'Something went wrong.';
    let code = ResultTypes.SOMETHING_WENT_WRONG;

    if (!lightTx) {
      message = 'lightTxJson is empty.';
      code = ResultTypes.PAYMENTS_ARE_EMPTY;
    }

    let stageHeight = await Sidechain.getContractStageHeight();

    let containsOlderPayments = (parseInt(lightTx.lightTxData.stageHeight) <= stageHeight);

    if (containsOlderPayments) {
      message = 'Contains older payment.';
      code = ResultTypes.CONTAINS_OLDER_PAYMENT;
    } else {
      let isValidSigLightTx = isValidSig(lightTx);

      if (isValidSigLightTx) {
        lightTx.onChain = false;

        let result = await db.savePayments([lightTx]);

        if (result == ResultTypes.OK) {
          success = true;
          message = 'Success.';
          code = ResultTypes.OK;
        } else {
          message = 'Fail to save payments.';
          code = result;
        }
      } else {
        message = 'Contains wrong signature payment.';
        code = ResultTypes.WRONG_SIGNATURE;
      }
    }

    res.send({ ok: success, message: message, code: code });
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, message: e.message, errors: e.message, code: ResultTypes.SOMETHING_WENT_WRONG });
  }
});

// app.post('/send/light_txs', async function (req, res) {
//   try {
//     let payments = req.body.payments;
//     let success = false;
//     let message = 'Something went wrong.';
//     let code = ResultTypes.SOMETHING_WENT_WRONG;

//     if (payments.length <= 0) {
//       message = 'Payments are empty.';
//       code = ResultTypes.PAYMENTS_ARE_EMPTY;
//     }

//     let paymentHeights = payments.map(payment => payment.stageHeight);
//     let stageHeight = await Sidechain.getContractStageHeight();
//     let containsOrderPayments = paymentHeights.some(height => height <= stageHeight);
//     let containsInvalidFormatPayments = payments.some(payment => {
//       let isNotValid = false;
//       if (!payment.hasOwnProperty('stageHeight') ||
//                 !payment.hasOwnProperty('stageHash') ||
//                 !payment.hasOwnProperty('paymentHash') ||
//                 !payment.hasOwnProperty('cipherClient') ||
//                 !payment.hasOwnProperty('cipherStakeholder') ||
//                 !payment.hasOwnProperty('v') ||
//                 !payment.hasOwnProperty('r') ||
//                 !payment.hasOwnProperty('s')) {
//         isNotValid = true;
//       }
//       return isNotValid;
//     });

//     let containsInvalidPaymentHash = payments.some(payment => {
//       return payment.paymentHash !== EthUtils.sha3(payment.cipherClient + payment.cipherStakeholder).toString('hex');
//     });

//     if (containsOrderPayments) {
//       message = 'Contains order payment.';
//       code = ResultTypes.CONTAINS_ORDER_PAYMENT;
//     } else if (containsInvalidFormatPayments) {
//       message = 'Contains invalid format payment.';
//       code = ResultTypes.CONTAINS_INVALID_FORMAT_PAYMENT;
//     } else if (containsInvalidPaymentHash) {
//       message = 'Contains invalid payment hash.';
//       code = ResultTypes.CONTAINS_INVALID_PAYMENT_HASH;
//     } else {
//       let validSigPayments = filterInvalidSig(payments);

//       if (payments.length > validSigPayments.length) {
//         message = 'Contains wrong signature payment.';
//         code = ResultTypes.WRONG_SIGNATURE;
//       } else {
//         validSigPayments = validSigPayments.map((paymentCipher) => {
//           paymentCipher.onChain = false;
//           return paymentCipher;
//         });

//         let result = await db.savePayments(validSigPayments);
//         if (result == ResultTypes.OK) {
//           success = true;
//           message = 'Success.';
//           code = ResultTypes.OK;
//         } else {
//           message = 'Fail to save payments.';
//           code = result;
//         }
//       }
//     }
//     res.send({ ok: success, message: message, code: code });
//   } catch (e) {
//     console.log(e);
//     res.status(500).send({ ok: false, message: e.message, errors: e.message, code: ResultTypes.SOMETHING_WENT_WRONG });
//   }
// });

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
    let targetRootHash = req.query.rootHash;

    if (targetRootHash) {
      let pendingRootHashes = await db.pendingRootHashes();
      let pendingRoot = pendingRootHashes.filter(root => {
        return root.rootHash == targetRootHash;
      });

      if (pendingRoot.length >= 1) {
        pendingRoot = pendingRoot[0];
        res.send({ ok: true, rootHash: pendingRoot.rootHash, stageHeight: pendingRoot.stageHeight });
      } else {
        res.send({ ok: false, message: 'Target root hash not found.', code: ResultTypes.TARGET_ROOT_HASH_BOT_FOUND });
      }
    } else if (building) {
      res.send({ ok: false, message: 'Stage is currently building.', code: ResultTypes.STAGE_IS_CURRENTLY_BUILDING });
    } else {
      let stageHeight = await Sidechain.getContractStageHeight();
      let nextStageHeight = parseInt(stageHeight) + 1;
      building = true;
      let payments = await db.pendingPayments(nextStageHeight, true);
      let paymentHashes = payments.map(payment => payment.paymentHash);
      if (paymentHashes.length > 0) {
        let tree = new IndexedMerkleTree();
        console.log('Building Stage Height:' + nextStageHeight);
        await tree.build(nextStageHeight, paymentHashes);
        let rootHash = '0x' + tree.rootHash;
        rootHashStageMap[rootHash] = nextStageHeight + 1;
        // rootHash should be pushed into pending rootHash
        await db.pushPendingRootHash(rootHash, nextStageHeight);
        db.relax();
        res.send({ ok: true, rootHash: rootHash, stageHeight: nextStageHeight });
      } else {
        db.relax();
        building = false;
        res.send({ ok: false, message: 'Payments are empty.', code: ResultTypes.PAYMENTS_ARE_EMPTY });
      }
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.post('/commit/payments', async function (req, res) {
  try{
    let rootHash = req.body.rootHash;
    let serializedTx = req.body.serializedTx;
    if (rootHash) {
      let txHash;
      try {
        txHash = web3.eth.sendRawTransaction(serializedTx);
        txHashRootHashMap[txHash] = rootHash;
        db.acceptStage(rootHashStageMap[rootHash]);
        console.log('Committed txHash: ' + txHash);
        // Add txHash to addNewStageTxs pool
        addNewStageTxs.push(txHash);
      } catch (e) {
        building = false;
        console.log(e);
        res.status(500).send({ ok: false, errors: e.message });
      }
      await db.clearPendingRootHash(rootHash);
      res.send({ ok: true, txHash: txHash });
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

app.get('/sidechain/stage/height', async function (req, res) {
  try {
    let height = await Sidechain.getSidechainStageHeight();
    res.send({ height: height });
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

app.get('/balance', async function (req, res) {
  try {
    let address = req.query.address;
    let balance = Sidechain.getBalance(address);
    res.send({ balance: balance });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/payments', async function (req, res) {
  try {
    let stageHeight = req.query.stage_id;
    console.log(stageHeight);
    let result = await db.getPayments(stageHeight);
    res.send(result);
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/latest/payments', async function (req, res) {
  try {
    let size = req.query.size;
    size = parseInt(size);
    let stageHeight = await Sidechain.getSidechainStageHeight();
    let result = await db.getPayments(stageHeight, size);
    res.send(result);
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/pending/stages', async function (req, res) {
  try {
    let pendingStages = await Sidechain.pendingStages();
    res.send(pendingStages);
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/stage/:stageHash', async function (req, res) {
  let stageHash = req.params.stageHash;
  try {
    let payments = await db.getPaymentsFromStageHash(stageHash);
    res.send(payments);
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/finalized/time', async function (req, res) {
  try {
    let finalizedTime = await Sidechain.getFinalizedTime();
    console.log(finalizedTime);
    res.send({
      finalizedTime: finalizedTime
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/pending/payments', async function (req, res) {
  try {
    let pendingPayments = await Sidechain.pendingPayments();
    res.send(pendingPayments);
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.post('/reset', async function (req, res) {
  try {
    building = false;
    res.send({ ok: true });
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

server.listen(3000, async function () {
  try {
    console.log('App listening on port 3000!');
  } catch (e) {
    console.error(e.message);
  }
});
