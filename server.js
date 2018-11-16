let env = require('./env');
let express = require('express');
let bodyParser = require('body-parser');
let cors = require('cors');
let EthUtils = require('ethereumjs-util');
let StorageManager = require('./storage-manager');
let Booster = require('./abi/Booster.json');
let ErrorCodes = require('./errors/codes');
let LightTransaction = require('./models/light-transaction');
let LightTxTypes = require('./models/types');
let BigNumber = require('bignumber.js');
let Web3 = require('web3');
let Infinitechain = require('./utils/infinitechain');
let Verifier = require('./utils/verifier');
let Receipt = require('./models/receipt');

const mode = process.env.NODE_ENV || 'develop';

let boosterPort = parseInt(env.boosterPort);

if (isNaN(boosterPort) || boosterPort <= 0) {
  boosterPort = 3001;
}

let app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

var server = require('http').createServer(app);

const serverAccountAddress = env.serverAddress;
const boosterContractAddress = env.contractAddress;
const boosterAccountAddress = '0x' + EthUtils.privateToAddress(Buffer.from(env.signerKey, 'hex')).toString('hex');
let burnAddress = '0000000000000000000000000000000000000000000000000000000000000000';
let stageBuildingLock = false;
let generateEmptyTx = env.generateEmptyTx || false;
let verifier = new Verifier(env.serverAddress, boosterAccountAddress);

app.get('/balance/:address', async function (req, res) {
  try {
    let address = req.params.address.toLowerCase().padStart(64, '0');
    let assetID = (req.query.assetID || null);
    if (assetID != null) {
      assetID = assetID.toLowerCase().padStart(64, '0');
    }
    if (address && (address != burnAddress)) {
      let balance = await this.storageManager.getBalance(address, assetID);
      if (assetID == null) {
        res.send(balance);
      } else {
        balance = new BigNumber('0x' + balance);
        res.send({ balance: balance.toString() });
      }
    } else {
      res.status(400).send({ errors: 'Parameter address is missing.' });
    }
  } catch (e) {
    res.status(500).send({ errors: e.message });
  }
});

app.get('/slice/:stageHeight/:receiptHash', async function (req, res) {
  try {
    let stageHeight = req.params.stageHeight;
    let receiptHash = req.params.receiptHash;
    let slice = await this.storageManager.getReceiptSlice(parseInt(stageHeight), receiptHash);

    if (Object.keys(slice).length > 0) {
      res.send({ ok: true, slice: slice });
    }
  } catch (e) {
    res.send({ ok: false, message: e.message });
  }
});

function isValidSig(lightTx) {
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
      isClientSigValid = (to.toLowerCase() == address.toLowerCase());
    } else if ((type == LightTxTypes.withdrawal) ||
      (type == LightTxTypes.instantWithdrawal) ||
      (type == LightTxTypes.remittance)) {
        let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.clientLightTx.v, lightTx.sig.clientLightTx.r, lightTx.sig.clientLightTx.s);
        let address = EthUtils.pubToAddress(publicKey).toString('hex').padStart(64, '0');
      isClientSigValid = (from.toLowerCase() == address.toLowerCase());
    } else {
      new Error('Not supported light transaction type.');
    }
    // validate signatures of lightTxs
    let publicKey = EthUtils.ecrecover(ethMsgHash, lightTx.sig.serverLightTx.v, lightTx.sig.serverLightTx.r, lightTx.sig.serverLightTx.s);
    let address = '0x' + EthUtils.pubToAddress(publicKey).toString('hex');
    isServerSigValid = (serverAccountAddress.toLowerCase() == address.toLowerCase());
  }

  return (isClientSigValid && isServerSigValid);
}

async function isValidAsset(lightTx) {
  let isValid = false;
  let assetList = await this.storageManager.getAssetList();
  assetList.forEach((asset) => {
    let address = asset.asset_address;
    if (address.slice(0, 2) == '0x') {
      address = address.substring(2);
    }
    if (lightTx.lightTxData.assetID == address.padStart(64, '0').toLowerCase()) {
      isValid = true;
    }
  });
  return isValid;
}

app.get('/accounts/:stageHeight', async function (req, res) {
  try {
    let stageHeight = req.params.stageHeight;
    stageHeight = parseInt(stageHeight).toString(16).padStart(64, '0').slice(-64);
    let accounts = await this.storageManager.getAccountsByStageHeight(stageHeight);
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
    let address = req.query.address || '';
    let receipts = [];
    if (address.length === 0) {
      receipts = await this.storageManager.getReceiptByStageHeight(stageHeight);
    } else {
      address = address.slice(-40).padStart(64, '0');
      if (address != burnAddress) {
        receipts = await this.storageManager.getReceiptsByStageHeightAndAddress(stageHeight, address);
      }
    }
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
    let receipt = await this.storageManager.getReceiptByLightTxHash(lightTxHash);
    if (receipt !== null) {
      res.send(receipt);
    } else {
      res.status(404).send({ ok: false, errors: 'Not found' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/receipt_by_gsn/:GSN', async function (req, res) {
  try {
    let GSN = req.params.GSN;
    GSN = GSN.padStart(64, '0');
    let receipt = await this.storageManager.getReceiptByGSN(GSN);
    if (receipt !== null) {
      res.send(receipt);
    } else {
      res.status(404).send({ ok: false, errors: 'Not found' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, errors: e.message });
  }
});

app.get('/personalreceipt/:address', async function (req, res) {
  try {
    let address = req.params.address.slice(-40).padStart(64, '0');
    if (address != burnAddress) {
      let receipts = await this.storageManager.getReceiptsByAddress(address);
      res.send(receipts);
    } else {
      res.status(400).send({ errors: 'Parameter address is missing.' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({ ok: false, message: e.message, errors: e.message, code: ErrorCodes.SOMETHING_WENT_WRONG });
  }
});

app.post('/send/light_tx', async function (req, res) {
  try {
    let success = false;
    let message = 'Something went wrong.';
    let code = ErrorCodes.SOMETHING_WENT_WRONG;
    let receipt = null;
    if (stageBuildingLock) {
      message = 'Stage is currently building.';
      code = ErrorCodes.STAGE_IS_CURRENTLY_BUILDING;
    } else {
      let lightTxJson = req.body.lightTxJson;
      let lightTx = new LightTransaction(lightTxJson);
      let oldReceipt = await this.storageManager.getReceiptByLightTxHash(lightTx.lightTxHash);
      if (oldReceipt) {
        message = 'Contains known light transaction.';
        code = ErrorCodes.CONTAINS_KNOWN_LIGHT_TX;
      } else {
        let isValidSigLightTx = isValidSig(lightTx);
        if (isValidSigLightTx) {
          let isValidAssetLightTx = await isValidAsset(lightTx);
          if (isValidAssetLightTx) {
            let updateResult = await this.storageManager.applyLightTx(lightTx);

            if (updateResult.ok) {
              success = true;
              receipt = updateResult.receipt;
            } else {
              message = updateResult.message;
              code = updateResult.code;
            }
          } else {
            message = 'Asset ID is not support.';
            code = ErrorCodes.WRONG_ASSET_ID;
          }
        } else {
          message = 'Contains wrong signature receipt.';
          code = ErrorCodes.WRONG_SIGNATURE;
        }
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
    let stageHeight = parseInt(await this.booster.methods.stageHeight().call()) + 1;
    let hasPendingReceipts = await this.storageManager.hasPendingReceipts(stageHeight);

    if (hasPendingReceipts) {
      /*
        Should Fix account hashes before increasing expectedStageHeight in order to
        prevnet the upcoming light transaction keep changing the accout hashes
       */
      let trees = await this.storageManager.commitTrees(stageHeight);

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
    stageHeight = parseInt(stageHeight);
    let trees = await this.storageManager.getTrees(stageHeight);

    if (Object.keys(trees).length > 0) {
      res.send({ ok: true, receiptRootHash: trees.receipt_tree.rootHash, accountRootHash: trees.account_tree.rootHash });
    } else {
      res.send({ ok: false, message: 'StageHeight does not exist.' });
    }
  } catch (e) {
    res.send({ ok: false, message: e.message });
  }
});

app.get('/trees/:stageHeight', async function (req, res) {
  try {
    let stageHeight = req.params.stageHeight;
    stageHeight = parseInt(stageHeight);
    let trees = await this.storageManager.getTrees(stageHeight);

    if (trees && Object.keys(trees).length > 0) {
      res.send({ ok: true, receiptTree: trees.receipt_tree, accountTree: trees.account_tree });
    } else {
      res.send({ ok: false, message: 'StageHeight does not exist.' });
    }
  } catch (e) {
    res.send({ ok: false, message: e.message });
  }
});


if (mode !== 'production') {

  app.post('/attach', async function (req, res) {
    try {
      let success = false;
      let message = 'Something went wrong.';
      let code = ErrorCodes.SOMETHING_WENT_WRONG;
      let txHash = null;
  
      let stageHeight = parseInt(await this.booster.methods.stageHeight().call()) + 1;
      let hasPendingReceipts = await this.storageManager.hasPendingReceipts(stageHeight);
      if (stageBuildingLock === true) {
        message = 'Stage are building.';
        code = ErrorCodes.STAGE_IS_CURRENTLY_BUILDING;
      } else if (hasPendingReceipts) {
        stageBuildingLock = true;
        let hexStageHeight = stageHeight.toString(16).padStart(64, '0').slice(-64);
        let receipts = await this.storageManager.getReceiptByStageHeight(hexStageHeight);
        receipts = receipts.map(receipt => new Receipt(receipt.data)).map(receipt => verifier.verifyReceipt(receipt));
        if (receipts.includes(false) === true) {
          message = 'Including wrong signature receipt.';
          code = ErrorCodes.WRONG_SIGNATURE;
        } else {
          let receipt = await this.infinitechain.attach(stageHeight);
          txHash = receipt.transactionHash;
          success = true;
        }
      } else {
        if (generateEmptyTx === true) {
          // generate an empty light tx
          console.log('Receipts are empty, generate an empty light tx');
          let res = await this.infinitechain.sendLightTx(boosterAccountAddress, boosterAccountAddress, 0, 0, 0);
          let receipt = new Receipt(res.data);
          if (verifier.verifyReceipt(receipt) === false) {
            message = 'Including wrong signature receipt.';
            code = ErrorCodes.WRONG_SIGNATURE;
          } else {
            // attach
            stageBuildingLock = true;
            let txReceipt = await this.infinitechain.attach(stageHeight);
            txHash = txReceipt.transactionHash;
            success = true;
          }
        } else {
          message = 'Receipts are empty.';
          code = ErrorCodes.RECEIPTS_ARE_EMPTY;
        }
      }
  
      stageBuildingLock = false;
      if (success) {
        res.send({ ok: true, txHash: txHash });
      } else {
        res.send({ ok: false, message: message, code: code });
      }
    } catch (e) {
      console.log(e);
      stageBuildingLock = false;
      res.send({ ok: false, errors: e.message, code: ErrorCodes.SOMETHING_WENT_WRONG });
    }
  });
  
  app.post('/finalize', async function (req, res) {
    try {
      let stageHeight = await this.booster.methods.stageHeight().call();
      stageHeight = parseInt(stageHeight);
      const receipt = await this.infinitechain.finalize();
      if (receipt.status === true || receipt.status === '0x1') {
        await this.storageManager.updateTree({
          column: 'finalizeTxHash',
          value: receipt.transactionHash.substr(-64),
          stageHeight: stageHeight.toString(16).padStart(64, '0')
        });
        res.send(receipt);
      } else {
        res.send({ ok: false, errors: 'Finalize Fail', code: ErrorCodes.SOMETHING_WENT_WRONG });
      }
    } catch (e) {
      console.log(e);
      res.send({ ok: false, errors: e.message, code: ErrorCodes.SOMETHING_WENT_WRONG });
    }
  });

}


app.get('/booster/address', async function (req, res) {
  try {
    res.send({ contractAddress: boosterContractAddress, accountAddress: boosterAccountAddress });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/server/address', async function (req, res) {
  try {
    res.send({ address: serverAccountAddress });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/pending/receipts', async function (req, res) {
  try {
    let pendingLightTxHashesOfReceipts = await this.storageManager.pendingLightTxHashesOfReceipts();
    res.send({ lightTxHashes: pendingLightTxHashesOfReceipts });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

app.get('/assetlist', async function (req, res) {
  try {
    let assetList = await this.storageManager.getAssetList();
    res.send({ assetList: assetList });
  } catch (e) {
    console.log(e);
    res.status(500).send({ errors: e.message });
  }
});

server.listen(boosterPort, async function () {
  try {
    console.log(`App listening on port ${boosterPort}!`);
    console.log(`Gringotts is running on ${mode} mode`);
    connectToWeb3();
  } catch (e) {
    console.error(e.message);
  }
});

server.on('error', function (err) {
  console.error(err);
});

function connectToWeb3 () {
  this.web3 = new Web3(env.web3Url);
  this.booster = new this.web3.eth.Contract(Booster.abi, env.contractAddress);
  this.web3._provider.on('connect', async (eventObj) => {
    this.storageManager = new StorageManager(this.web3);
    this.infinitechain = new Infinitechain(this.web3, this.storageManager);
    // Watch latest block
    this.booster.events.Attach({
      toBlock: 'latest' 
    }, async (err, result) => {
      if (err) console.error(err);
      try {
        let stageHeight = result.returnValues._stageHeight;
        // Remove offchain receipt json
        await this.storageManager.removeOffchainReceipts(parseInt(stageHeight, 16));
        let expectedStageHeight = await this.storageManager.getExpectedStageHeight();
        console.log('expectedStageHeight: ' + expectedStageHeight);
      } catch (e) {
        console.error(e);
      }
    });
  });

  this.web3._provider.on('end', (eventObj) => {
    console.log('Try to reconnect to: ' + env.web3Url + ' ...');
    delay(5000).then(() => {
      connectToWeb3();
    });
  });
}

function delay (millisecond) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve('');
    }, millisecond? millisecond : 1000);
  });
}
