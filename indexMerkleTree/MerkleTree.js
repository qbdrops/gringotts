const keccak256 = require('js-sha3').keccak256;
class MerkleTree {
    constructor(height) {
        this.nodes;
        this.height = height;
        this.scid;
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

    calcLeafIndex(tid) { // calc leaflocation  
        let index = parseInt(keccak256(tid.toString()).substring(0,12),16);
        //calc the leaf node id
        return (1 << (this.height - 1)) + Math.abs(index) % (1 << (this.height - 1));
    } 

    setSCID(scid) {
        this.scid = scid;
    }

    leafTotalNode(height) {
        return 1 << (height -1);
    }
    
    getHeight(){
        return this.height;
    }
    putTransactionInTree(order) { // 將交易放進樹當中
        if(!this.scid){
            throw new Error('you should set scid.');
        }
        let tid = order.tid || '';
        let contentUser = order.contentUser || '';
        let contentCp = order.contentCp || ''; 
        let index = this.calcLeafIndex(tid);
        this.nodes[index].put(contentUser, contentCp);         
        for (let i = index; i > 0; i >>= 1) {
            this.nodes[i].updateContentDigest();
        }       
    }

    getRootHash () {
    //拿到交易證據(代表所有交易紀錄256bits的唯一證據)
        return this.nodes[1].getContentDigest();
    }

    getTransactionHashSet(tid) {
    //拿到交易內容的雜湊值(包含其他collision的雜湊)
        let index = this.calcLeafIndex(tid);
        return this.nodes[index].getContent();
    }
    
    getTransactionSetUser(tid) {
    //拿到用戶公鑰加密的交易內容(包含其他collision的交易)
        let index = this.calcLeafIndex(tid);
        return this.nodes[index].getContentUser();
    }

    getTransactionSetCp(tid) {
    //拿到ＣＰ公鑰加密的交易內容(包含其他collision的交易)
        let index = this.calcLeafIndex(tid);
        return this.nodes[index].getContentCp();
    }

    getNodeHash(tid){
        let index = this.calcLeafIndex(tid);
        return this.nodes[index].getContentDigest();
    }

    extractSlice(tid) { //拿到證據切片
        let index = this.calcLeafIndex(tid);
        let slice = new Array();
        let left = '';
        let right = '';
        for (;index > 1; index >>= 1) { 
            left = right = this.nodes[index].getContentDigest();
            if (index % 2 == 0) {
                right = this.nodes[index + 1].getContentDigest();
            } else {
                left = this.nodes[index - 1].getContentDigest();
            }

            slice.push(left);
            slice.push(right);
        }
        slice.push(this.nodes[1].getContentDigest());
        return slice;
    }

    reputData(id, content, contentUser, contentCp, contentDigest){ // restore merkleTree
        this.nodes[id].reput(content, contentUser, contentCp, contentDigest);
    }
}

class Node {
    constructor(id,leftChild,rightChild) {
        this.content = null;
        this.contentUser = null;
        this.contentCp = null;
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
        
    put(cipherUser,cipherCp) {
        if(this.content === null && this.contentUser === null && this.contentCp === null) {
            this.content = new Array();
            this.contentUser = new Array();
            this.contentCp = new Array();
        }
        this.contentUser.push(cipherUser);
        this.contentCp.push(cipherCp);
        this.content.push(keccak256(cipherUser.concat(cipherCp)));     
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

    getContentUser() {
        return this.contentUser;
    }

    getContentCp() {
        return this.contentCp;
    }

    reput(content, contentUser, contentCp, contentDigest){//restore merkleTree
        this.content = content;
        this.contentUser = contentUser;
        this.contentCp = contentCp;
        this.contentDigest = contentDigest;
    }
}

module.exports = MerkleTree;