const keccak256 = require('js-sha3').keccak256;
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
    calcLeafIndex(Tid) {
    //calc leaflocation  
        this.index = parseInt(keccak256(Tid.toString()).substring(0,12),16);
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
        this.nodes[this.index].put(content);         
        for (let i = this.index; i > 0; i >>= 1) {
            this.nodes[i].updateContentDigest();
        }
       
    }

    getRootHash () {
    //拿到交易證據(代表所有交易紀錄256bits的唯一證據)
        return this.nodes[1].getContentDigest();
    }

    getTransactionHashSet(Tid) {
    //拿到交易內容的雜湊值(包含其他collision的雜湊)
        this.index = this.calcLeafIndex(Tid);
        return this.nodes[this.index].getContent();
    }
    getTransactionSet(Tid) {
    //拿到交易內容(包含其他collision的交易)
        this.index = this.calcLeafIndex(Tid);
        return this.nodes[this.index].getContentPlain();
    }
    extractSlice(Tid) {
    //拿到證據切片
        this.index = this.calcLeafIndex(Tid);
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



    //restore merkleTree
    reputData(id, content, contentPlain, contentDigest){
        this.nodes[id].reput(content, contentPlain, contentDigest);
    }



}

class Node {
    constructor(id,leftChild,rightChild) {
        this.content = null;
        this.contentPlain = null;
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
        
    put(orderplain) {
        if(this.content === null && this.contentPlain === null) {
            this.content = new Array();
            this.contentPlain = new Array();
        }
        this.contentPlain.push(orderplain);
        this.content.push(keccak256(orderplain));    
    }
    

    updateContentDigest() {
        let mergeT = '';
        if (this.isLeaf === true) {
            for( let i = 0 ; i < this.content.length ; i++){
                mergeT = mergeT.concat(this.content[i]);//串肉粽
            }
            this.contentDigest = keccak256(mergeT);
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
    getContentPlain() {
        return this.contentPlain;
    }
    reput(content, contentPlain, contentDigest){//restore merkleTree
        this.content = content;
        this.contentPlain = contentPlain;
        this.contentDigest = contentDigest;
    }

}

module.exports = MerkleTree;