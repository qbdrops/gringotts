let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let EthUtils = require('ethereumjs-util');
let storageManager = require('./storage-manager');
let Sidechain = require('./abi/Sidechain.json');
let ErrorCodes = require('./errors/codes');
let LightTransaction = require('./models/light-transaction');
let LightTxTypes = require('./models/types');
let BigNumber = require('bignumber.js');
let Web3 = require('web3');

let web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let sidechain = web3.eth.contract(Sidechain.abi).at(env.contractAddress);

let boosterPort = parseInt(env.boosterPort);

if (isNaN(boosterPort) || boosterPort <= 0) {
  boosterPort = 3001;
}

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

var server = require('http').createServer(app);

const account = env.serverAddress;
const contractAddress = env.contractAddress;
const serverAddress = env.serverAddress;
let burnAddress = '0000000000000000000000000000000000000000000000000000000000000000';

app.get('/balance/:address', async function (req, res) {
  try {
    let address = req.params.address;
    address = address.padStart(64, '0');
    let assetID = req.query.assetID || '1'; // default is 1
    assetID = assetID.padStart(64, '0');
    if (address && (address != burnAddress)) {
      let balance = await storageManager.getBalance(address, assetID);
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

    let trees = await storageManager.getTrees(stageHeight);
    let receiptTree = trees.receiptTree;
    let receipt = await storageManager.getReceiptByLightTxHash(lightTxHash);
    let slice = receiptTree.getSlice(receipt.receiptHash);
    let treeNodeIndex = receiptTree.computeLeafIndex(receipt.receiptHash);
    let receiptHashArray = receiptTree.getAllLeafElements(receipt.receiptHash);

    res.send({ slice: slice, receiptHashArray: receiptHashArray, treeNodeIndex: treeNodeIndex });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

function isValidSig (lightTx) {
  let type = lightTx.type();
  let from = lightTx.lightTxData.from;
  let to = lightTx.lightTxData.to;
  let isClientSigValid = false;
  let isServerSigValid = false;
  if (!lightTx.hasServerLightTxSig() || !lightTx.hasClientLightTxSig()) {
    return false;
  } else {
    let msgHash = Buffer.from(lightTx.lightTxHash, 'hex');
    let prefix = new Buffer('\x19Ethereum Signed Message:\n32');
    let ethMsgHash = EthUtils.sha3(Buffer.concat([prefix, msgHash]));
    if (type == LightTxTypes.deposit) {
      let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.clientLightTx.v, lightTx.sig.clientLightTx.r, lightTx.sig.clientLightTx.s);
      let address = EthUtils.pubToAddress(publicKey).toString('hex').padStart(64, '0');
      isClientSigValid = (to == address);
    } else if ((type == LightTxTypes.withdrawal) ||
      (type == LightTxTypes.instantWithdrawal) ||
      (type == LightTxTypes.remittance)) {
      let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.clientLightTx.v, lightTx.sig.clientLightTx.r, lightTx.sig.clientLightTx.s);
      let address = EthUtils.pubToAddress(publicKey).toString('hex').padStart(64, '0');
      isClientSigValid = (from == address);
    } else {
      new Error('Not supported light transaction type.');
    }
    // validate signatures of lightTxs
    let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.serverLightTx.v, lightTx.sig.serverLightTx.r, lightTx.sig.serverLightTx.s);
    let address = '0x' + EthUtils.pubToAddress(publicKey).toString('hex');
    isServerSigValid = (account == address);
  }

  return (isClientSigValid && isServerSigValid);
}

app.get('/accounts/:stageHeight', async function (req, res) {
  try {
    let stageHeight = req.params.stageHeight;
    stageHeight = parseInt(stageHeight).toString(16).padStart(64, '0').slice(-64);
    let accounts = await storageManager.getAccountsByStageHeight(stageHeight);
    res.send(accounts);
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/receipts/:stageHeight', async function (req, res) {
  try {
    let stageHeight = req.params.stageHeight;
    stageHeight = parseInt(stageHeight).toString(16).padStart(64, '0').slice(-64);
    let receipts = await storageManager.getReceiptByStageHeight(stageHeight);
    receipts = receipts.map(receipt => receipt.data);
    res.send(receipts);
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/receipt/:lightTxHash', async function (req, res) {
  try {
    let lightTxHash = req.params.lightTxHash;
    let receipt = await storageManager.getReceiptByLightTxHash(lightTxHash);
    res.send(receipt);
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/personalreceipt/:address', async function (req, res) {
  try {
    let address = req.params.address.slice(-40).padStart(64, '0');
    let receipts = await storageManager.getReceiptsByAddress(address);
    res.send(receipts);
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, message: e.message, errors: e.message, code: ErrorCodes.SOMETHING_WENT_WRONG });
  }
});

app.post('/send/light_tx', async function (req, res) {
  try {
    let lightTxJson = req.body.lightTxJson;
    let lightTx = new LightTransaction(lightTxJson);

    let oldReceipt = await storageManager.getReceiptByLightTxHash(lightTx.lightTxHash);

    let success = false;
    let message = 'Something went wrong.';
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let receipt = null;

    if (oldReceipt) {
      message = 'Contains known light transaction.';
      code = ErrorCodes.CONTAINS_KNOWN_LIGHT_TX;
    } else {
      let isValidSigLightTx = isValidSig(lightTx);
      if (isValidSigLightTx) {
        let updateResult = await storageManager.applyLightTx(lightTx);

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

app.get('/roothash', async function (req, res) {
  try {
    let stageHeight = parseInt(sidechain.stageHeight()) + 1;
    let hasPendingReceipts = await storageManager.hasPendingReceipts(stageHeight);

    if (hasPendingReceipts) {
      /*
        Should Fix account hashes before increasing expectedStageHeight in order to
        prevnet the upcoming light transaction keep changing the accout hashes
       */
      let trees = await storageManager.commitTrees(stageHeight);

      res.send({
        ok: true,
        stageHeight: stageHeight,
        trees: trees
      });
    } else {
      res.send({ ok: false, message: 'Receipts are empty.', code: ErrorCodes.RECEIPTS_ARE_EMPTY });
    }
  } catch (e) {
    console.log(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/roothash/:stageHeight', async function (req, res) {
  try {
    let stageHeight = req.params.stageHeight;
    let trees = await storageManager.getTrees(stageHeight);

    if (Object.keys(trees).length > 0) {
      res.send({ ok: true, receiptRootHash: trees.receiptTree.rootHash, accountRootHash: trees.accountTree.rootHash });
    } else {
      res.send({ ok: false, message: 'StageHeight does not exist.' });
    }
  } catch (e) {
    res.send({ ok: false, message: e.message });
  }
});

app.post('/attach', async function (req, res) {
  try {
    let stageHeight = req.body.stageHeight;
    let serializedTx = req.body.serializedTx;
    if (stageHeight) {
      let txHash = await storageManager.attach(stageHeight, serializedTx);
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
    res.send({ address: contractAddress });
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

app.get('/pending/receipts', async function (req, res) {
  try {
    let pendingLightTxHashesOfReceipts = await storageManager.pendingLightTxHashesOfReceipts();
    res.send({ lightTxHashes: pendingLightTxHashesOfReceipts });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

server.listen(boosterPort, async function () {
  try {
    console.log(`App listening on port ${boosterPort}!`);
  } catch (e) {
    console.error(e.message);
  }
});

server.on('error', function (err) {
  console.error(err);
});
