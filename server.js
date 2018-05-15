let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let EthUtils = require('ethereumjs-util');
let TreeManager = require('./utils/tree-manager');
let IndexedMerkleTree = require('./utils/indexed-merkle-tree');
let DB = require('./utils/DB');
let txDecoder = require('ethereum-tx-decoder');
let abiDecoder = require('abi-decoder');
let Sidechain = require('./abi/Sidechain.json');
let ErrorCodes = require('./errors/codes');
let LightTransaction = require('./models/light-transaction');
let Receipt = require('./models/receipt');
let AccountMap = require('./utils/account-map');
let GSNGenerator = require('./utils/gsn-generator');
let LightTxTypes = require('./models/types');
let BigNumber = require('bignumber.js');
let Web3 = require('web3');

let db = new DB();
let web3Url = 'http://' + env.web3Host + ':' + env.web3Port;
let web3 = new Web3(new Web3.providers.HttpProvider(web3Url));
let sidechain = web3.eth.contract(Sidechain.abi).at(env.sidechainAddress);

abiDecoder.addABI(Sidechain.abi);

let initStageHeight = parseInt(sidechain.stageHeight()) + 1;
let expectedStageHeight;
let treeManager;
let gsnGenerator;
let accountMap;

// Load pendingReceipts from DB
db.initPendingReceipts().then(async () => {
  let stageHeightFromDB = await db.loadStageHeight();

  if (stageHeightFromDB == 0) {
    expectedStageHeight = initStageHeight;
  } else {
    expectedStageHeight = stageHeightFromDB;
  }
  console.log('expectedStageHeight: ' + expectedStageHeight);
  try {
    treeManager = new TreeManager(db);
    await treeManager.initialize(expectedStageHeight);

    gsnGenerator = new GSNGenerator(db);
    await gsnGenerator.initialize();

    accountMap = new AccountMap(db);
    await accountMap.initialize();
  } catch (e) {
    console.error(e);
  }
});

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next) {
  if (!req.timedout) next();
}

var server = require('http').createServer(app);

const account = env.serverAddress;
const sidechainAddress = env.sidechainAddress;
const serverAddress = env.serverAddress;
let burnAddress = '0000000000000000000000000000000000000000000000000000000000000000';
let initBalance = '0000000000000000000000000000000000000000000000000000000000000000';

// Watch latest block
sidechain.AttachStage({ toBlock: 'latest' }).watch(async (err, result) => {
  console.log('attach');
  let stageHeight = result.args._stageHeight;

  // Clear pending pool
  let targetLightTxHashes = await db.getOffchainReceipts(stageHeight);

  // Remove offchain receipt json
  await db.removeOffchainReceipts(targetLightTxHashes);
});

app.get('/balance/:address', async function (req, res) {
  try {
    let address = req.params.address;
    address = address.padStart(64, '0');
    if (address && (address != burnAddress)) {
      let balance = await accountMap.getBalance(address);
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

    let trees = treeManager.getTrees(stageHeight);
    let receiptTree = trees.receiptTree;
    let receipt = await db.getReceiptByLightTxHash(lightTxHash);
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
    let receipt = await db.getReceiptByLightTxHash(lightTxHash);
    res.send(receipt);
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

let applyLightTx = async (lightTx) => {
  let code = ErrorCodes.SOMETHING_WENT_WRONG;
  let type = lightTx.type();
  let fromAddress = lightTx.lightTxData.from;
  let toAddress = lightTx.lightTxData.to;

  let isNewFromAddress = accountMap.isNewAddress(fromAddress);
  let isNewToAddress = accountMap.isNewAddress(toAddress);

  let fromBalance = initBalance;
  let toBalance = initBalance;
  let oldFromBalance;
  let oldToBalance;
  try {
    if (type === LightTxTypes.deposit) {
      let value = new BigNumber('0x' + lightTx.lightTxData.value);
      toBalance = accountMap.getBalance(toAddress);

      oldToBalance = toBalance;
      toBalance = new BigNumber('0x' + toBalance);
      toBalance = toBalance.plus(value);
      toBalance = toBalance.toString(16).padStart(64, '0');
      accountMap.setBalance(toAddress, toBalance);
    } else if ((type === LightTxTypes.withdrawal) ||
              (type === LightTxTypes.instantWithdrawal)) {
      let value = new BigNumber('0x' + lightTx.lightTxData.value);
      fromBalance = accountMap.getBalance(fromAddress);

      oldFromBalance = fromBalance;
      fromBalance = new BigNumber('0x' + fromBalance);
      if (fromBalance.isGreaterThanOrEqualTo(value)) {
        fromBalance = fromBalance.minus(value);
        fromBalance = fromBalance.toString(16).padStart(64, '0');
        accountMap.setBalance(fromAddress, fromBalance);
      } else {
        code = ErrorCodes.INSUFFICIENT_BALANCE;
        throw new Error('Insufficient balance.');
      }
    } else if (type === LightTxTypes.remittance) {
      let value = new BigNumber('0x' + lightTx.lightTxData.value);

      fromBalance = accountMap.getBalance(fromAddress);
      oldFromBalance = fromBalance;
      toBalance = accountMap.getBalance(toAddress);
      oldToBalance = toBalance;

      fromBalance = new BigNumber('0x' + fromBalance);
      toBalance = new BigNumber('0x' + toBalance);
      if (fromBalance.isGreaterThanOrEqualTo(value)) {
        fromBalance = fromBalance.minus(value);
        toBalance = toBalance.plus(value);

        fromBalance = fromBalance.toString(16).padStart(64, '0');
        toBalance = toBalance.toString(16).padStart(64, '0');

        accountMap.setBalance(fromAddress, fromBalance);
        accountMap.setBalance(toAddress, toBalance);
      } else {
        code = ErrorCodes.INSUFFICIENT_BALANCE;
        throw new Error('Insufficient balance.');
      }
    } else {
      code = ErrorCodes.INVALID_LIGHT_TX_TYPE;
      throw new Error('Invalid light transaction type.');
    }

    // GSN
    let gsn = gsnGenerator.getGSN();
    let receiptJson = lightTx.toJson();
    receiptJson.receiptData = {
      stageHeight: expectedStageHeight,
      GSN: gsn,
      lightTxHash: lightTx.lightTxHash,
      fromBalance: fromBalance,
      toBalance: toBalance,
    };

    let receipt = new Receipt(receiptJson);

    // try {
    //   await db.getReceiptByLightTxHash(receipt.lightTxHash);
    // } catch (e) {
    //   if (e.type == 'NotFoundError') {
    //     // No known receipt, do nothing
    //   } else {
    //     code = ErrorCodes.SOMETHING_WENT_WRONG;
    //     throw e;
    //   }
    // }

    db.addOffchainReceipt(receipt.lightTxHash);
    let newAddresses = [];

    if (isNewFromAddress) {
      newAddresses.push(fromAddress);
    }

    if (isNewToAddress) {
      newAddresses.push(toAddress);
    }

    db.batch(newAddresses, gsn, receipt);

    return { ok: true, receipt: receipt };
  } catch (e) {
    console.error(e);
    // rollback all modifications in the leveldb transaction
    db.removeOffchainReceipt(lightTx.lightTxHash);
    // rollback balances in memory
    if (type === LightTxTypes.deposit) {
      accountMap.setBalance(toAddress, oldToBalance);
    } else if ((type === LightTxTypes.withdrawal) ||
              (type === LightTxTypes.instantWithdrawal)) {
      accountMap.setBalance(fromAddress, oldFromBalance);
    } else if (type === LightTxTypes.remittance) {
      accountMap.setBalance(fromAddress, oldFromBalance);
      accountMap.setBalance(toAddress, oldToBalance);
    }
    return { ok: false, code: code, message: e.message };
  }
};

// let applyLightTx = (lightTx) => {
//   // gringotts can only process one lightTx at the same time
//   return new Promise(async (resolve) => {
//     let fromAddress = lightTx.lightTxData.from;
//     let toAddress = lightTx.lightTxData.to;

//     let canProcessParallelly = (
//       (processingAddresses.indexOf(fromAddress) < 0) &&
//       (processingAddresses.indexOf(toAddress) < 0 )
//     );

//     if (canProcessParallelly) {
//       let updateResult = await _applyLightTx(lightTx);
//       resolve(updateResult);
//     } else {
//       let timerId = setInterval(async () => {
//         let canProcessParallelly = (
//           (processingAddresses.indexOf(fromAddress) < 0) &&
//           (processingAddresses.indexOf(toAddress) < 0 )
//         );

//         if (canProcessParallelly) {
//           let updateResult = await _applyLightTx(lightTx);
//           clearInterval(timerId);
//           resolve(updateResult);
//         }
//       }, 0);
//     }
//   });
// };

app.post('/send/light_tx', async function (req, res) {
  try {
    let lightTxJson = req.body.lightTxJson;
    let lightTx = new LightTransaction(lightTxJson);
    let isExisted = true;
    
    let oldReceipt = await db.getReceiptByLightTxHash(lightTx.lightTxHash);
    if (!oldReceipt) {
      isExisted = false;
    }

    let success = false;
    let message = 'Something went wrong.';
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let receipt = null;

    if (isExisted) {
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

app.get('/roothash', async function (req, res) {
  try {
    let stageHeight = parseInt(sidechain.stageHeight()) + 1;
    let pendingReceipts = await db.pendingReceipts(stageHeight);

    if (pendingReceipts.length > 0) {
      expectedStageHeight += 1;
      pendingReceipts = await db.pendingReceipts(stageHeight);
      let receiptHashes = pendingReceipts.map(receipt => receipt.receiptHash);
      let accountHashes = accountMap.hashes();
      console.log('Building Stage Height: ' + stageHeight);
      let receiptTree = new IndexedMerkleTree(stageHeight, receiptHashes);
      let accountTree = new IndexedMerkleTree(stageHeight, accountHashes);

      treeManager.setTrees(stageHeight, receiptTree, accountTree);

      // Dump data from memory to disk
      treeManager.dump();
      gsnGenerator.dump();

      res.send({
        ok: true,
        stageHeight: stageHeight,
        receiptRootHash: receiptTree.rootHash,
        accountRootHash: accountTree.rootHash
      });
    } else {
      res.send({ ok: false, message: 'Receipts are empty.', code: ErrorCodes.RECEIPTS_ARE_EMPTY });
    }
  } catch (e) {
    expectedStageHeight -= 1;
    console.log(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/roothash/:stageHeight', async function (req, res) {
  let stageHeight = req.params.stageHeight;
  let trees = treeManager.getTrees(stageHeight);

  if (trees) {
    res.send({ ok: true, receiptRootHash: trees.receiptTree.rootHash, accountRootHash: trees.accountTree.rootHash });
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
        let decodedTx = txDecoder.decodeTx(serializedTx);
        let functionParams = abiDecoder.decodeMethod(decodedTx.data);

        let receiptRootHash = functionParams.params[1].value[0].slice(2);
        let accountRootHash = functionParams.params[1].value[1].slice(2);
        let trees = treeManager.getTrees(stageHeight);
        let receiptTree = trees.receiptTree;
        let accountTree = trees.accountTree;

        if ((receiptTree.rootHash === receiptRootHash) &&
            accountTree.rootHash === accountRootHash) {
          let txHash = web3.eth.sendRawTransaction(serializedTx);
          console.log('Committed txHash: ' + txHash);

          // Dump stageHeight
          await db.dumpStageHeight(expectedStageHeight);

          res.send({ ok: true, txHash: txHash });
        } else {
          throw new Error('Invalid signed root hashes.');
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

app.get('/pending/receipts', async function (req, res) {
  try {
    let pendingLightTxHashesOfReceipts = db.pendingLightTxHashesOfReceipts();
    res.send(pendingLightTxHashesOfReceipts);
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

server.on('error', function (err) {
  console.error(err);
});
