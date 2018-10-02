const EthUtils = require('ethereumjs-util');
const keythereum = require('keythereum');
const assert = require('assert');
const Receipt = require('../models/receipt');

class Signer {
  constructor () {
    this.key = null;
  }

  getOrNewKeyPair () {
    if (!this.key) {
      this.key = keythereum.create({ keyBytes: 32, ivBytes: 16 }).privateKey;
    }

    return this.key.toString('hex');
  }

  importPrivateKey (privateKey, options) {
    options = Object.assign({
      encoding: 'hex',
      password: ''
    }, options);
    if (typeof privateKey === 'string') {
      this.key = Buffer.from(privateKey, options.encoding);
    } else if (typeof privateKey === 'object') {
      this.key = keythereum.recover(options.password, privateKey);
      console.log(this.key);
    } else {
      throw new Error('Unsupported private key type.');
    }
  }

  getPrivateKey () {
    assert(this.key != null, 'ECC private key does not exist. Please generate or import your keypair.');
    return this.key.toString('hex');
  }

  getPublicKey () {
    assert(this.key != null, 'ECC private key does not exist. Please generate or import your keypair.');
    return EthUtils.privateToPublic(this.key).toString('hex');
  }

  getAddress () {
    return EthUtils.privateToAddress(this.key).toString('hex');
  }

  signWithBoosterKey (object) {
    return this._sign('booster', object);
  }

  _sign (caller, object) {
    let klass;
    if (object instanceof Receipt) {
      klass = 'receipt';
    } else {
      throw new Error('\'object\' should be instance of \'Receipt\'.');
    }
    if (!this.key) {
      throw new Error('Please set private key first.');
    }

    let hashKey = klass + 'Hash';
    let h = object[hashKey];
    let prefix = new Buffer('\x19Ethereum Signed Message:\n32');
    let message = EthUtils.sha3(Buffer.concat([prefix, Buffer.from(h, 'hex')]));
    let sig = EthUtils.ecsign(message, this.key);

    let postfix = klass.charAt(0).toUpperCase() + klass.slice(1);
    let sigKey = caller + postfix;
    object.sig[sigKey] = {
      r: '0x' + sig.r.toString('hex'),
      s: '0x' + sig.s.toString('hex'),
      v: '0x' + sig.v.toString(16).padStart(64, '0')
    };
    return object;
  }
}

module.exports = Signer;
