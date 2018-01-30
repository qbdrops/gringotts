const EthUtils = require('ethereumjs-util');
let db = require('../db');

class IndexMerkleTree {
    constructor () {
        this.emptyNodeHash = this._sha3('none');
        this.rootHash = '';
    }

    async build (stageHeight, leafElements) {
        let treeHeight = this._computeTreeHeight(leafElements.length);

        // 1. Compute treeNodeIndex for each paymentHash and group them by treeNodeIndex
        let leafElementMap = leafElements.map(e => {
            let index = this._computeLeafIndex(treeHeight, e);
            db.updatePaymentNodeIndex(e, index);
            return { treeNodeIndex: index.toString(), leafElement: e };
        }).reduce((acc, curr) => {
            let index = curr.treeNodeIndex;
            if (acc[index] == undefined) {
                acc[index] = [curr.leafElement];
            } else {
                acc[index].push(curr.leafElement);
            }
            return acc;
        }, {});

        // 2. Compute treeNodeHash for each treeNodeIndex
        Object.keys(leafElementMap).forEach(index => {
            let _concatedElements = leafElementMap[index].sort().reduce((acc, curr) => {
                return acc.concat(curr);
            }, '');
            let treeNodeHash = this._sha3(_concatedElements);
            leafElementMap[index] = treeNodeHash;
        });

        // 3. Make an array of treeNodes
        let nodeQueue = this._getLeafIndexRange(treeHeight).map(index => {
            var treeNodeHash = '';
            if (leafElementMap[index] == undefined) {
                treeNodeHash = this.emptyNodeHash;
            } else {
                treeNodeHash = leafElementMap[index];
            }

            return {
                treeNodeIndex: index,
                treeNodeHash: treeNodeHash
            };
        });

        // 4. Compute rootHash
        while (nodeQueue.length > 1) {
            let node = nodeQueue.shift();
            db.saveTreeNode(node, stageHeight);

            if (node.treeNodeIndex % 2 == 0) {
                nodeQueue.push(node);
            } else {
                let leftNode = nodeQueue.pop();
                let parentNodeHash = this._sha3(leftNode.treeNodeHash.concat(node.treeNodeHash));
                let parentNodeIndex = parseInt(leftNode.treeNodeIndex / 2);
                nodeQueue.push({ treeNodeIndex: parentNodeIndex, treeNodeHash: parentNodeHash});
            }
        }

        // 5. Save rootNode to DB
        db.saveTreeNode(nodeQueue[0], stageHeight);

        this.rootHash = nodeQueue[0].treeNodeHash;
        return this.rootHash;
    }

    async getSlice (stageHeight, leafElement) {
        stageHeight = parseInt(stageHeight);
        let size = await db.getPaymentSize(stageHeight);
        let treeHeight = this._computeTreeHeight(size);
        let index = this._computeLeafIndex(treeHeight, leafElement);
        let sliceIndexes = [];

        let firstTreeNode = await db.getTreeNode(stageHeight, index);

        while (index != 1) {
            if (index % 2 == 0) {
                sliceIndexes.push(index + 1);
            } else {
                sliceIndexes.push(index - 1);
            }
            index = parseInt(index / 2);
        }

        let slice = await db.getSlice(stageHeight, sliceIndexes);

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

    async getAllLeafElements (stageHeight, leafElement) {
        stageHeight = parseInt(stageHeight);
        let size = await db.getPaymentSize(stageHeight);
        let treeHeight = this._computeTreeHeight(size);
        let index = this._computeLeafIndex(treeHeight, leafElement);
        let leafElements = await db.getPaymentByIndex(stageHeight, index);
        leafElements = leafElements.map(e => e.paymentHash).sort();
        return leafElements;
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

    _computeLeafIndex (treeHeight, leafElement) {
        let h = parseInt(this._sha3(leafElement.toString()).substring(0, 12), 16);
        return (1 << (treeHeight - 1)) + Math.abs(h) % (1 << (treeHeight - 1));
    }

    _computeTreeHeight (size) {
        return parseInt(Math.log2(size)) + 1;
    }

    _sha3 (content) {
        return EthUtils.sha3(content).toString('hex');
    }
}

module.exports = IndexMerkleTree;
