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

    calcLeafIndex (paymentHash) {
        // calc leaflocation
        let index ;
        if(EthUtils.sha3(paymentHash.toString()).toString('hex').substring(0,2) === '0x'){
            index = parseInt(EthUtils.sha3(paymentHash.toString()).toString('hex').substring(2,14),16);
        }else{
            index = parseInt(EthUtils.sha3(paymentHash.toString()).toString('hex').substring(0,12),16);
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

    putPaymentInTree (paymentCipher) {
        if (!paymentCipher.stageHeight || paymentCipher.stageHeight != this.stageHeight) {
            throw new Error('Wrong payment cipher.');
        }
        let index = this.calcLeafIndex(paymentCipher.paymentHash);
        this.nodes[index].put(paymentCipher.cipherUser, paymentCipher.cipherCP);
        for (let i = index; i > 0; i >>= 1) {
            this.updateNodeHash(i);
        }
    }

    getRootHash () {
        return this.nodes[1].getNodeHash();
    }

    getPaymentHashArray (paymentHash) {
        let index = this.calcLeafIndex(paymentHash);
        return this.nodes[index].getPaymentHashArray();
    }
    getPaymentHashArrayByIndex (index) {
        return this.nodes[index].getPaymentHashArray();
    }
    
    getNodePaymentCipherUser (paymentHash) {
        let index = this.calcLeafIndex(paymentHash);
        return this.nodes[index].getCipherUserArray();
    }

    getNodePaymentCipherCP (paymentHash) {
        let index = this.calcLeafIndex(paymentHash);
        return this.nodes[index].getCipherCPArray();
    }

    getNodeHashByPaymentHash (paymentHash) {
        let index = this.calcLeafIndex(paymentHash);
        return this.nodes[index].getNodeHash();
    }

    getNodeHashByIndex (index) {
        return this.nodes[index].getNodeHash();
    }

    extractSlice (paymentHash) {
        let index = this.calcLeafIndex(paymentHash);
        let slice = new Array();  
        if (this.nodes.length == 2) {
            slice.push({
                treeNodeID: 1,
                treeNodeHash: this.nodes[1].getNodeHash()
            });
        } else {
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
        }
        return slice;
    }

    reputData (index, paymentHashArray, cipherUserArray, cipherCPArray, NodeHash) {
        this.nodes[index].reput(paymentHashArray, cipherUserArray, cipherCPArray, NodeHash);
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
            restoreTree.reputData(i,tree.nodes[i].paymentHashArray, tree.nodes[i].cipherUserArray, tree.nodes[i].cipherCPArray, tree.nodes[i].NodeHash);
        }                
        return restoreTree;         
    }

    maxCollision () {
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        let max = 0;
        for (let i = leafMin ; i < leafMax ; i++) {
            if(this.nodes[i].getPaymentHashArray() === null) {
                //
            } else {
                if (max < this.nodes[i].getPaymentHashArray().length) {
                    max = this.nodes[i].getPaymentHashArray().length;
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
            if (this.nodes[i].getPaymentHashArray() === null) {
                //
            }else {
                nonEmptyCount += 1;
                total += this.nodes[i].getPaymentHashArray().length;
            }
        }        
        let AVG = parseFloat(total/nonEmptyCount);
        return AVG;
    }

    getAllPaymentCiperCP () {
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

    getAllPaymentCiperUser () {
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
            let paymentHashArray = this.nodes[index].getPaymentHashArray();
            for( let i = 0 ; i < paymentHashArray.length ; i++) {
                mergeT = mergeT.concat(paymentHashArray[i]);
            }
            this.nodes[index].updateNodeHash(EthUtils.sha3(mergeT).toString('hex'));
        } else {
            this.nodes[index].updateNodeHash(EthUtils.sha3(this.nodes[2 * index].getNodeHash().concat(this.nodes[2 * index + 1].getNodeHash())).toString('hex'));
        }
    }
}


class Node {
    constructor(index) {
        this.paymentHashArray = null;
        this.cipherUserArray = null;
        this.cipherCPArray = null;
        this.NodeHash = '';
        this.isLeaf = false;
        this.index = index;
    }
        
    put(cipherUser,cipherCP) {
        if(this.paymentHashArray === null && this.cipherUserArray === null && this.cipherCPArray === null) {
            this.paymentHashArray = new Array();
            this.cipherUserArray = new Array();
            this.cipherCPArray = new Array();
        }
        this.cipherUserArray.push(cipherUser);
        this.cipherCPArray.push(cipherCP);
        this.paymentHashArray.push(EthUtils.sha3(cipherUser.concat(cipherCP)).toString('hex'));
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

    getPaymentHashArray () {
        return this.paymentHashArray;
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

    reput (paymentHashArray, cipherUserArray, cipherCPArray, NodeHash) {// restore merkleTree
        this.paymentHashArray = paymentHashArray;
        this.cipherUserArray = cipherUserArray;
        this.cipherCPArray = cipherCPArray;
        this.NodeHash = NodeHash;
    }
}

module.exports = MerkleTree;
