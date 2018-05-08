let assert = require('assert');
let IndexedMerkleTree = require('./indexed-merkle-tree');

class TreeManager {
  constructor (chain) {
    this.chain = chain;
    this.tempTrees = {};
    this.lock = false;
  }

  set (stageHeight, tree) {
    assert(tree instanceof IndexedMerkleTree, 'Parameter \'tree\' should be instance of \'IndexedMerkleTree\'.');
    this.tempTrees[stageHeight.toString()] = tree;
  }

  get (stageHeight) {
    return this.tempTrees[stageHeight.toString()];
  }
}

module.exports = TreeManager;
