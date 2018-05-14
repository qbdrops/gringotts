let assert = require('assert');
let IndexedMerkleTree = require('./indexed-merkle-tree');

class TreeManager {
  constructor (db) {
    this.db = db;
    this.trees = {};
  }

  async initialize(stageHeight) {
    if (stageHeight == 1) {
      this.trees[stageHeight.toString()] = await this.db.loadTrees(stageHeight);
    } else {
      let prevStageHeight = stageHeight - 1;
      this.trees[prevStageHeight.toString()] = await this.db.loadTrees(prevStageHeight);
      this.trees[stageHeight.toString()] = await this.db.loadTrees(stageHeight);
    }
  }

  async dump () {
    Object.keys(this.trees).forEach(async stageHeight => {
      await this.db.dumpTrees(this.trees[stageHeight], stageHeight);
    });
  }

  setTrees (stageHeight, receiptTree, accountTree) {
    assert(receiptTree instanceof IndexedMerkleTree, 'Parameter \'receiptTree\' should be instance of \'IndexedMerkleTree\'.');
    assert(accountTree instanceof IndexedMerkleTree, 'Parameter \'accountTree\' should be instance of \'IndexedMerkleTree\'.');
    this.trees[stageHeight.toString()] =  { receiptTree: receiptTree, accountTree: accountTree };
  }

  getTrees (stageHeight) {
    return this.trees[stageHeight.toString()];
  }
}

module.exports = TreeManager;
