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

    getNodeHashByTid(tid){
        let index = this.calcLeafIndex(tid);
        return this.nodes[index].getContentDigest();
    }
    
    getNodeHashesByIndex(idSet){
        let nodeHash = {};
        let idLength = idSet.length;
        for(let i = 0 ; i < idLength ; i ++){
            let node = idSet.shift();
            nodeHash[node] = {
                'hash' : this.nodes[node].getContentDigest()
            }; 
        }
        return nodeHash;
    }
    getNodeHashByIndex(id){
        return this.nodes[id].getContentDigest();
    }

    getTransactionHashesByIndex(idSet){
        let nodeHashSet = {};
        for(let i = 0 ; i <idSet.length ; i ++){
            let node = idSet.shift();
            if(node < (1 << (this.height - 1))){
                throw new Error('Node ['+node+'] is not leaf.');
            }
            nodeHashSet[node] = {
                'transactionHash' : this.nodes[node].getContent()
            }; 
        }
        return nodeHashSet;
    }
    getTransactionHashByIndex(id){
        if(id < (1 << (this.height - 1))){
            throw new Error('Node ['+id+'] is not leaf.');
        }
        return this.nodes[id].getContent();
    }
    getIds(){
        let idSet = new Array();
        for(let i = 1 ; i < 1 << this.height ; i++){
            idSet.push(i);
        }
        return idSet;
    }

    getLeafIds(){
        let idSet = new Array();
        for(let i = 1 << (this.height - 1) ; i < 1 << this.height ; i++){
            idSet.push(i);
        }
        return idSet;
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

    export() {
        return JSON.parse(JSON.stringify({
            nodes: this.nodes,
            scid: this.scid,
            height: this.height
        }));
    }

    static import(tree) {
        let restoreTree = new MerkleTree(tree.height);
        for(let i = 1 ; i < (1 << tree.height) ; i++) {
            restoreTree.reputData(i,tree.nodes[i].content, tree.nodes[i].contentUser, tree.nodes[i].contentCp, tree.nodes[i].contentDigest);
        }                
        return restoreTree;         
    }


    collectSlices(tidSet){
        let nodeSet = {};
        let idReduce = new Array();
        nodeSet[1] = {
            'id' : this.nodes[1].id,
            'nodeHash' : this.nodes[1].getContentDigest(),
            'hashSet' : this.nodes[1].getContent(),
            'isLeaf' : this.nodes[1].getIsLeaf()
        };
        for(let i = 0 ; i<tidSet.length ; i++){
            let tid = tidSet.shift();
            let index = this.calcLeafIndex(tid);
            if(idReduce.indexOf(index) >= 0){// leaf 抓過直接跳出
                //重複不紀錄
            }else{
                for (;index > 1; index >>= 1) { 
                    if (index % 2 == 0) {
                        if(idReduce.indexOf(index) >= 0) {
                            //重複不紀錄
                        }else{
                            nodeSet[index] = {
                                'id' : this.nodes[index].id,
                                'nodeHash' : this.nodes[index].getContentDigest(),
                                'hashSet' : this.nodes[index].getContent(),
                                'isLeaf' : this.nodes[index].getIsLeaf()
                            };
                            idReduce.push(index);
                        }
                        if(idReduce.indexOf(index + 1) >= 0) {
                            //重複不紀錄
                        }else{
                            nodeSet[index + 1] = {
                                'id' : this.nodes[index + 1].id,
                                'nodeHash' : this.nodes[index + 1].getContentDigest(),
                                'hashSet' : this.nodes[index + 1].getContent(),
                                'isLeaf' : this.nodes[index + 1].getIsLeaf()
                            };
                            idReduce.push(index + 1);
                        }
                    } else {
                        if(idReduce.indexOf(index - 1) >= 0) {
                            //重複不紀錄
                        }else {
                            nodeSet[index - 1] = {
                                'id' : this.nodes[index - 1].id,
                                'nodeHash' : this.nodes[index - 1].getContentDigest(),
                                'hashSet' : this.nodes[index - 1].getContent(),
                                'isLeaf' : this.nodes[index - 1].getIsLeaf()
                            };
                            idReduce.push(index - 1);
                        }
                        if(idReduce.indexOf(index) >= 0) {
                            //重複不紀錄
                        }else{
                            nodeSet[index] = {
                                'id' : this.nodes[index].id,
                                'nodeHash' : this.nodes[index].getContentDigest(),
                                'hashSet' : this.nodes[index].getContent(),
                                'isLeaf' : this.nodes[index].getIsLeaf()
                            };
                            idReduce.push(index + 1);
                        }
                    }
                }
            }
        }
        return nodeSet;
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
    getIsLeaf(){
        return this.isLeaf;
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