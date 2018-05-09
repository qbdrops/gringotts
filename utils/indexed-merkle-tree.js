const EthUtils = require('ethereumjs-util');
let assert = require('assert');

class IndexedMerkleTree {
  constructor (stageHeight, leafElements) {
    this.stageHeight = stageHeight;
    this.leafElements = leafElements;
    this.emptyNodeHash = this._sha3('none');
    this.rootHash = '';
    this.treeHeight = null;
    this.treeNodes = [];
    this._build();
  }

  _build () {
    try {
      this.treeHeight = this._computeTreeHeight(this.leafElements.length);
      let treeHeight = this.treeHeight;

      // 1. Compute treeNodeIndex for each element and group them by treeNodeIndex
      let leafElementsWithIndex = this.leafElements.map(element => {
        let index = this.computeLeafIndex(element);
        return { treeNodeIndex: index.toString(), leafElement: element };
      });

      let leafElementMap = leafElementsWithIndex.reduce((acc, curr) => {
        let index = curr.treeNodeIndex;
        if (acc[index] == undefined) {
          acc[index] = [curr.leafElement];
        } else {
          acc[index].push(curr.leafElement);
        }
        return acc;
      }, {});

      // 2. Compute treeNodeHash for each treeNodeIndex
      let computedLeafElements = {};
      Object.keys(leafElementMap).forEach(index => {
        let _concatedElements = leafElementMap[index].sort().reduce((acc, curr) => {
          return acc.concat(curr);
        }, '');
        let treeNodeHash = this._sha3(_concatedElements);
        computedLeafElements[index] = treeNodeHash;
      });

      // 3. Make an array of treeNodes
      let nodeQueue = this._getLeafIndexRange(treeHeight).map(index => {
        var treeNodeHash = '';
        if (computedLeafElements[index] == undefined) {
          treeNodeHash = this.emptyNodeHash;
        } else {
          treeNodeHash = computedLeafElements[index];
        }

        return {
          treeNodeIndex: index,
          treeNodeHash: treeNodeHash,
          treeNodeElements: (leafElementMap[index] || [])
        };
      });

      // 4. Compute rootHash
      while (nodeQueue.length > 1) {
        let node = nodeQueue.shift();
        this.treeNodes.push(node);

        if (node.treeNodeIndex % 2 == 0) {
          nodeQueue.push(node);
        } else {
          let leftNode = nodeQueue.pop();
          let parentNodeHash = this._sha3(leftNode.treeNodeHash.concat(node.treeNodeHash));
          let parentNodeIndex = parseInt(leftNode.treeNodeIndex / 2);
          nodeQueue.push({ treeNodeIndex: parentNodeIndex, treeNodeHash: parentNodeHash });
        }
      }

      this.treeNodes.push(nodeQueue[0]);
      this.rootHash = this._sha3(nodeQueue[0].treeNodeHash + this.stageHeight.toString(16).padStart(64, '0'));
    } catch (e) {
      console.log(e);
    }
  }

  getSlice (leafElement) {
    let index = this.computeLeafIndex(leafElement);
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

  getAllLeafElements (leafElement) {
    let index = this.computeLeafIndex(leafElement);
    let leafElements = this._getTreeNode(index).treeNodeElements.sort();
    return leafElements;
  }

  computeLeafIndex (leafElement) {
    assert(this.treeHeight, 'Tree is not built yet.');
    let h = parseInt(this._sha3(leafElement.toString()).substring(0, 12), 16);
    let res = (1 << (this.treeHeight - 1)) + Math.abs(h) % (1 << (this.treeHeight - 1));
    return res;
  }

  _getTreeNode (index) {
    return this.treeNodes.filter(treeNode => treeNode.treeNodeIndex.toString() == index.toString())[0];
  }

  _getSlice (indexes) {
    return this.treeNodes.filter(treeNode => indexes.includes(treeNode.treeNodeIndex));
  }

  _getLeafIndexRange(treeHeight) {
    let l = 2 ** (treeHeight - 1);
    let u = 2 ** (treeHeight) - 1;
    var s = [];
    for (let i = l; i <= u; i++) {
      s.push(i);
    }
    return s;
  }

  _computeTreeHeight (size) {
    return parseInt(Math.log2(size)) + 1;
  }

  _sha3 (content) {
    return EthUtils.sha3(content).toString('hex');
  }
}

module.exports = IndexedMerkleTree;
