const EthUtils = require('ethereumjs-util');

class GetSlice {
  constructor (stageHeight, receiptHash, receiptTree) {
    this.stageHeight = stageHeight;
    this.receiptHash = receiptHash;
    this.receiptTree = receiptTree;
    this.treeHeight = receiptTree.treeHeight;
    this.index = this.computeLeafIndex(this.receiptHash);
  }

  build () {
    return {
      slice: this.getSlice(this.receiptHash),
      receiptHashArray: this.getAllLeafHashes(this.receiptHash)
    };
  }

  getSlice (receiptHash) {
    let index = this.computeLeafIndex(receiptHash);
    let sliceIndexes = [];
    let firstTreeNode = this._getTreeNode(index);

    while (index != 1) {
      if (index % 2 == 0) {
        sliceIndexes.push(index + 1);
      } else {
        sliceIndexes.push(index - 1);
      }
      index = parseInt(index / 2);
    }
    // console.log(sliceIndexes);
    let slice = this._getSlice(sliceIndexes);
    // Put firstNode as the first element of slice
    slice.unshift(firstTreeNode);

    slice = slice.map(treeNode => {
      return {
        treeNodeIndex: treeNode.treeNodeIndex,
        treeNodeHash: treeNode.treeNodeHash
      };
    });
    return slice;
  }

  getAllLeafHashes (receiptHash) {
    let index = this.computeLeafIndex(receiptHash);
    let leafHashes = this._getTreeNode(index).treeNodeElements.sort();
    return leafHashes;
  }

  computeLeafIndex (receiptHash) {
    let h = parseInt(this._sha3(receiptHash.toString()).substring(0, 12), 16);
    let index = (1 << (this.treeHeight - 1)) + Math.abs(h) % (1 << (this.treeHeight - 1));
    return index;
  }

  _getTreeNode (index) {
    return this.receiptTree.treeNodes.filter(treeNode => treeNode.treeNodeIndex.toString() == index.toString())[0];
  }

  _getSlice (indexes) {
    let result = [];
    let unSortSlice = this.receiptTree.treeNodes.filter(treeNode => indexes.includes(treeNode.treeNodeIndex));
    unSortSlice.map(sliceElement => {
      result[indexes.indexOf(sliceElement.treeNodeIndex)] = sliceElement;
    });
    return result;
  }

  _getLeafIndexRange () {
    let l = 2 ** (this.treeHeight - 1);
    let u = 2 ** (this.treeHeight) - 1;
    var s = [];
    for (let i = l; i <= u; i++) {
      s.push(i);
    }
    return s;
  }
  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }
}

module.exports = GetSlice;
