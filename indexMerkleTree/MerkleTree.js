const EthUtils = require('ethereumjs-util');
class MerkleTree {
    constructor(height) {
        this.nodes;
        this.height = height;
        this.stageHeight;
        this.makeTreeTime;
        if (this.height <= 0) {
            console.log('Tree height should be more than 1.');
        }       
        //initial node  bottom-up
        this.nodes = new Array(1 << height);
        for (let i = this.nodes.length - 1; i > 0; i--) {
            if (i >= (1 << (height - 1))) {
                // leaf node
                this.nodes[i] = new Node(i);
                this.nodes[i].setIsLeaf(true);
                // initial hash value 
                this.nodes[i].updateNodeHash(EthUtils.sha3('initial no data').toString('hex'));
            } else {
                // internal node
                this.nodes[i] = new Node(i);
                this.nodes[i].setIsLeaf(false);
                // concat(leftchild,rightchild)
                this.nodes[i].updateNodeHash(EthUtils.sha3(this.nodes[2 * i].getNodeHash().concat(this.nodes[2 * i + 1].getNodeHash())).toString('hex'));
            }
        } 
    } 

    calcLeafIndex (txHash) {
        // calc leaflocation
        let index ;
        if(EthUtils.sha3(txHash.toString()).toString('hex').substring(0,2) === '0x'){
            index = parseInt(EthUtils.sha3(txHash.toString()).toString('hex').substring(2,14),16);
        }else{
            index = parseInt(EthUtils.sha3(txHash.toString()).toString('hex').substring(0,12),16);
        }
        //calc the leaf node id
        return (1 << (this.height - 1)) + Math.abs(index) % (1 << (this.height - 1));
    }

    setStageHeight (stageHeight) {
        this.stageHeight = stageHeight;
    }

    setTime (makeTreeTime) {
        this.makeTreeTime = makeTreeTime;
    }

    leafTotalNode (height) {
        return 1 << (height -1);
    }
    
    getHeight () {
        return this.height;
    }

    putTransactionInTree (txCipher) {
        if (!txCipher.stageHeight || txCipher.stageHeight != this.stageHeight) {
            throw new Error('Wrong tx cipher.');
        }
        let index = this.calcLeafIndex(txCipher.txHash);
        this.nodes[index].put(txCipher.cipherUser, txCipher.cipherCP);
        for (let i = index; i > 0; i >>= 1) {
            this.updateNodeHash(i);
        }
    }

    getRootHash () {
        return this.nodes[1].getNodeHash();
    }

    getTxHashArray (txHash) {
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getTxHashArray();
    }
    getTxHashArrayByIndex (index) {
        return this.nodes[index].getTxHashArray();
    }
    
    getNodeTxCipherUser (txHash) {
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getCipherUserArray();
    }

    getNodeTxCipherCP (txHash) {
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getCipherCPArray();
    }

    getNodeHashByTxHash (txHash) {
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getNodeHash();
    }

    getNodeHashByIndex (index) {
        return this.nodes[index].getNodeHash();
    }

    extractSlice (txHash) {
        let index = this.calcLeafIndex(txHash);
        let slice = new Array();        
        if (index % 2 == 0) {
            slice.push({
                treeNodeID: index,
                treeNodeHash: this.nodes[index].getNodeHash()
            });
            slice.push({
                treeNodeID: index + 1,
                treeNodeHash: this.nodes[index + 1].getNodeHash()
            });
        } else {
            slice.push({
                treeNodeID: index,
                treeNodeHash: this.nodes[index].getNodeHash()
            });
            slice.push({
                treeNodeID: index - 1,
                treeNodeHash: this.nodes[index - 1].getNodeHash()
            });
        }
        index >>= 1;
        for (;index > 1; index >>= 1) { 
            if (index % 2 == 0) {
                slice.push({
                    treeNodeID: index + 1,
                    treeNodeHash: this.nodes[index + 1].getNodeHash()
                });
            } else {
                slice.push({
                    treeNodeID: index - 1,
                    treeNodeHash: this.nodes[index - 1].getNodeHash()
                });
            }   
        }
        return slice;
    }

    reputData (index, txHashArray, cipherUserArray, cipherCPArray, NodeHash) {
        this.nodes[index].reput(txHashArray, cipherUserArray, cipherCPArray, NodeHash);
    }

    export () {
        return {
            nodes: this.nodes,
            time: this.makeTreeTime,
            height: this.height
        };
    }

    static import (tree) {
        let restoreTree = new MerkleTree(tree.height);
        for(let i = 1 ; i < (1 << tree.height) ; i++) {
            restoreTree.reputData(i,tree.nodes[i].txHashArray, tree.nodes[i].cipherUserArray, tree.nodes[i].cipherCPArray, tree.nodes[i].NodeHash);
        }                
        return restoreTree;         
    }

    maxCollision () {
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        let max = 0;
        for (let i = leafMin ; i < leafMax ; i++) {
            if(this.nodes[i].getTxHashArray() === null) {
                //
            } else {
                if (max < this.nodes[i].getTxHashArray().length) {
                    max = this.nodes[i].getTxHashArray().length;
                }else { 
                    // 
                }                
            }               
        }         
        return max;
    }
     
    avgCollision () {
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        let total = 0;
        let nonEmptyCount = 0;
        for (let i = leafMin ; i < leafMax ; i++) {
            if (this.nodes[i].getTxHashArray() === null) {
                //
            }else {
                nonEmptyCount += 1;
                total += this.nodes[i].getTxHashArray().length;
            }
        }        
        let AVG = parseFloat(total/nonEmptyCount);
        return AVG;
    }

    getAllTxCiperCP () {
        let mergeAll = new Array();
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        for(let i = leafMin ; i < leafMax ; i++) {
            if (this.nodes[i].getCipherCPArray() === null) {
                //
            }else {
                mergeAll = mergeAll.concat(this.nodes[i].getCipherCPArray());
            }
        }
        return mergeAll;
    }

    getAllTxCiperUser () {
        let mergeAll = new Array();
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        for(let i = leafMin ; i < leafMax ; i++) {
            if (this.nodes[i].getCipherUserArray() === null) {
                //
            }else {
                mergeAll = mergeAll.concat(this.nodes[i].getCipherUserArray());
            }
        }
        return mergeAll;
    }

     
    updateNodeHash (index) {
        let mergeT = '';
        if (this.nodes[index].getIsLeaf() === true) {
            let txHashArray = this.nodes[index].getTxHashArray();
            for( let i = 0 ; i < txHashArray.length ; i++) {
                mergeT = mergeT.concat(txHashArray[i]);
            }
            this.nodes[index].updateNodeHash(EthUtils.sha3(mergeT).toString('hex'));
        } else {
            this.nodes[index].updateNodeHash(EthUtils.sha3(this.nodes[2 * index].getNodeHash().concat(this.nodes[2 * index + 1].getNodeHash())).toString('hex'));
        }
    }
}


class Node {
    constructor(index) {
        this.txHashArray = null;
        this.cipherUserArray = null;
        this.cipherCPArray = null;
        this.NodeHash = '';
        this.isLeaf = false;
        this.index = index;
    }
        
    put(cipherUser,cipherCP) {
        if(this.txHashArray === null && this.cipherUserArray === null && this.cipherCPArray === null) {
            this.txHashArray = new Array();
            this.cipherUserArray = new Array();
            this.cipherCPArray = new Array();
        }
        this.cipherUserArray.push(cipherUser);
        this.cipherCPArray.push(cipherCP);
        this.txHashArray.push(EthUtils.sha3(cipherUser.concat(cipherCP)).toString('hex'));
    }

    getNodeHash () {
        return this.NodeHash;
    }
    getIsLeaf () {
        return this.isLeaf;
    }

    setIsLeaf (newIsLeaf) {
        this.isLeaf = newIsLeaf;
    }

    getTxHashArray () {
        return this.txHashArray;
    }

    getCipherUserArray () {
        return this.cipherUserArray;
    }

    getCipherCPArray () {
        return this.cipherCPArray;
    }

    updateNodeHash (newHash) {
        this.NodeHash = newHash;
    }

    reput (txHashArray, cipherUserArray, cipherCPArray, NodeHash) {// restore merkleTree
        this.txHashArray = txHashArray;
        this.cipherUserArray = cipherUserArray;
        this.cipherCPArray = cipherCPArray;
        this.NodeHash = NodeHash;
    }
}

module.exports = MerkleTree;