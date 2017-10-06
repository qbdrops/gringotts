var keccak256 = require('js-sha3').keccak256;
const LinkedHashMap = require('./LinkedHashMap.js');

class MerkleTree {
    constructor(height) {
        this.nodes;
        this.height = height;
        this.index = 0;
        this.slice;

        if (this.height <= 0) {
            console.log('Tree height should be more than 1.');
        }
        
        //initial node  bottom-up
        this.nodes = new Array(1 << height);
        for (let i = this.nodes.length - 1; i > 0; i--) {
            if (i >= (1 << (height - 1))) {
                // leaf node
                this.nodes[i] = new Node(i, null, null);
            } else {
                // internal node
                this.nodes[i] = new Node(i, this.nodes[i * 2], this.nodes[(i * 2) + 1]);
            }
        } 
    }
    
    //functions
    calcLeafIndex(UidADDTid) {
    //calc leaflocation  
        this.index = parseInt(keccak256(UidADDTid.toString()).substring(2,14),16);
        //calc the leaf node id
        return (1 << (this.height - 1)) + Math.abs(this.index) % (1 << (this.height - 1));
    }
  
    leafTotalNode(height) {
        return 1 << (height -1);
    }

    putTransactionInTree(order) {
    //將交易放進樹當中
        let tid = order.tid || '';
        let content = order.content || '';
        this.index = this.calcLeafIndex(tid);
        this.nodes[this.index].put(tid, content);
        
        for (let i = this.index; i > 0; i >>= 1) {
            this.nodes[i].updateContentDigest();
        }
    }
    
    //    containsInTree(Uid,Tid) {
    //      this.index = this.calcLeafIndex(Uid.concat(Tid));
    //     return this.nodes[this.index].contains(Tid);
    // }
    
    //    removeInTree(Uid,Tid) {
    //     this.index = this.calcLeafIndex(Uid.concat(Tid));
    //     this.nodes[this.index].remove(Tid);
    //         for (let i = leaflocation; i > 0; i >>= 1) {
    //                this.nodes[i].updateContentDigest();
    //     }
    // }
    
    getRootHash () {
    //拿到交易證據(代表所有交易紀錄256bits的唯一證據)
        return this.nodes[1].getContentDigest();
    }
    
    //    getNodeHash(i) {
    //     return this.nodes[i].getContentDigest();
    // }
       
    getTransaction(Uid,Tid) {
    //拿到交易內容
        this.index = this.calcLeafIndex(Uid.concat(Tid));
        return this.nodes[this.index].getContent();
    }

    extractSlice(Uid,Tid) {
    //拿到證據切片
        this.index = this.calcLeafIndex(Uid.concat(Tid));
        this.slice = new Array();
        let left = '';
        let right = '';
        for (;this.index > 1; this.index >>= 1) { 
            left = right = this.nodes[this.index].getContentDigest();
            if (this.index % 2 == 0) {
                right = this.nodes[this.index + 1].getContentDigest();
            } else {
                left = this.nodes[this.index - 1].getContentDigest();
            }

            this.slice.push(left);
            this.slice.push(right);
        }
        this.slice.push(this.nodes[1].getContentDigest());
        return this.slice;
    }

    auditSlice(Tid, slice, content) {//稽核交易內容是否存在於切片及切片是否正確(用戶端核心程式碼)
        let contentDigest = keccak256(content.toString());
        let leftChild = '';
        let rightChild = '';
        if(content.get(Tid) !== null) {
            if(contentDigest === slice[0] || contentDigest === slice[1]) { 
                while(slice.length > 1) {
                    leftChild = slice.shift();
                    rightChild = slice.shift();
                    if(!keccak256(leftChild.concat(rightChild)) === slice[0] && !keccak256(leftChild.concat(rightChild)) === slice[1]) {
                        return 'auditing have problem at : ' + leftChild + ' and ' + rightChild;
                    }
                }
                return Tid+' audit complete , roothash = '+slice[0];
            } else {
                return 'Hash value error, data incorrect.';    
            }
        } else {
            return 'Transaction not in the leaf.';
        }
    }
}

class Node {
    constructor(id,leftChild,rightChild) {
        this.content;
        this.contentDigest = '';
        this.isLeaf = false;
        this.id = id;
        this.leftChild = leftChild;
        this.rightChild = rightChild;

        if(leftChild === null || rightChild === null) {
            // leaf node
            this.isLeaf = true;
            //initial hash value 
            this.contentDigest = keccak256('initial no data');       
        } else {
            // internal node
            this.isLeaf = false;
            //concat(a,b)
            this.contentDigest = keccak256(leftChild.contentDigest.concat(rightChild.contentDigest));
        }
        this.content = null;
    }
        
    put(Tid,Treceipt) {
        if(this.content === null) {
            this.content = new LinkedHashMap();
        }
        this.content.put(Tid, Treceipt);    
    }
    // contains(Tid) {
    //     if (this.content !== null) {
    //          if(this.content.get(Tid) !== null){
    //              return true;
    //          }
    //     } else {
    //         return false;
    //     }
    // };
    
    
    
    //  remove(Tid) {
    
    //     if (Tid >= 0) {
    //         this.content.put(Tid,null); 
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }

    updateContentDigest() {
        if (this.isLeaf === true) {
            this.contentDigest = keccak256(this.content.toString());
        } else {
            this.contentDigest = keccak256(this.leftChild.contentDigest.concat(this.rightChild.contentDigest));
        }
    }

    getContentDigest() {
        return this.contentDigest;
    }

    getContent() {
        return this.content;
    }
}

module.exports = MerkleTree;