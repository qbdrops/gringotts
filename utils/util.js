const EthUtils = require('ethereumjs-util');
const assert = require('assert');
const BN = EthUtils.BN;

var is0xPrefixed = (value) => {
  return value.toString().slice(0, 2) === '0x';
}

var remove0xPrefixed = (value) => {
  value = value.toString();
  if (is0xPrefixed(value)) {
    value = value.replace('0x', '');
  }
  return value;
}

var add0xPrefixed = (value) => {
  value = value.toString();
  if (!is0xPrefixed(value)) {
    value = '0x' + value;
  }
  return value;
}

var isHex = (value) => {
  if (is0xPrefixed(value) && /^[0-9A-Fa-f]+$/.test(remove0xPrefixed(value))) return true;
  if (/[a-fA-F]/.test(value) && /^[0-9A-Fa-f]+$/.test(value)) return true;
  return false;
}

var toHex = (value) => {
  if (typeof value === 'number') return '0x' + value.toString(16);
  return '0x' + toBN(value).toString(16);
}

var isInteger = (object) => {
  return /^[0-9]+$/.test(object);
}

var isBN = (object) => {
  return (object && (object instanceof BN || (object.constructor && object.constructor.name === 'BN')));
}

var toBN = (value, base) => {
  value = value || 0;
  if (base) return new BN(value, base);
  if (isBN(value)) return value;
  if (typeof value === 'string') {
    if (isHex(value)) return new BN(remove0xPrefixed(value), 16);
    if (isInteger(value)) return new BN(value.toString(10), 10);
  } else if (typeof value === 'number') {
    if (isInteger(value.toString())) return new BN(value.toString(10), 10);
  }
  throw new Error('Please pass integer as parameter');
}

var isByte32 = (value) => {
  return (/^(0x)?[0-9A-Fa-f]+$/.test(value) && remove0xPrefixed(value).length === 64);
}

var toByte32 = (value) => {
  let byte32Value = isByte32(value)? value : remove0xPrefixed(toHex(value)).padStart(64, '0').slice(-64);
  return remove0xPrefixed(byte32Value).toLowerCase();
}

var toWei = (value, decimals = 18) => {
  assert(typeof value === 'string', 'Please pass number as string to avoid precision errors.');
  assert(/^(\d)+e(\+|-)?(\d)+$/i.test(value) === false, 'Do not pass numbers as scientific notation.');
  let sm = value.split('.');
  if (sm.length > 1) {
    assert(sm[1].length <= decimals, 'The fraction number is out of limit.');
    decimals -= sm[1].length;
  }
  let base = toBN(10).pow(toBN(decimals));
  sm = toBN(sm.join(''));
  value = sm.mul(base);
  return value;
}

var sha3 = (content) => {
  return EthUtils.sha3(content).toString('hex');
}

module.exports = {
  is0xPrefixed: is0xPrefixed,
  remove0xPrefixed: remove0xPrefixed,
  add0xPrefixed: add0xPrefixed,
  isHex: isHex,
  toHex: toHex,
  isInteger: isInteger,
  BN: BN,
  isBN: isBN,
  toBN: toBN,
  isByte32: isByte32,
  toByte32: toByte32,
  toWei: toWei,
  sha3: sha3
};