let assert = require('assert');
let IndexedMerkleTree = require('./indexed-merkle-tree');

class TreeManager {
  constructor (chain) {
    this.chain = chain;
    this.tempTrees = {};
    this.lock = false;
  }

  setTrees (stageHeight, receiptTree, accountTree) {
    assert(receiptTree instanceof IndexedMerkleTree, 'Parameter \'receiptTree\' should be instance of \'IndexedMerkleTree\'.');
    assert(accountTree instanceof IndexedMerkleTree, 'Parameter \'accountTree\' should be instance of \'IndexedMerkleTree\'.');
    this.tempTrees[stageHeight.toString()] =  { receiptTree: receiptTree, accountTree: accountTree };
  }

  getTrees (stageHeight) {
    return this.tempTrees[stageHeight.toString()];
  }
}

module.exports = TreeManager;
