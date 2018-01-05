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
                this.nodes[i].updateNodeHash(EthUtils.sha3(this.nodes[2 * i].getContentDigest().concat(this.nodes[2 * i + 1].getContentDigest())).toString('hex'));  
            }
        } 
    } 

    calcLeafIndex(txHash) {
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

    setTime(makeTreeTime) {
        this.makeTreeTime = makeTreeTime;
    }

    leafTotalNode(height) {
        return 1 << (height -1);
    }
    
    getHeight() {
        return this.height;
    }

    putTransactionInTree(txCipher) {
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
    //拿到交易證據(代表所有交易紀錄256bits的唯一證據)
        return this.nodes[1].getContentDigest();
    }

    getTransactionHashSet(txHash) {
    //拿到交易內容的雜湊值(包含其他collision的雜湊)
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getContent();
    }
    getNodeHashSet(id) {
        //拿到交易內容的雜湊值(包含其他collision的雜湊)
        return this.nodes[id].getContent();
    }
    
    getTransactionSetUser(txHash) {
    //拿到用戶公鑰加密的交易內容(包含其他collision的交易)
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getContentUser();
    }

    getTransactionSetCP(txHash) {
    //拿到ＣＰ公鑰加密的交易內容(包含其他collision的交易)
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getContentCP();
    }

    getNodeHashByTid(txHash) {
        // 訂單編號找葉節點雜湊
        let index = this.calcLeafIndex(txHash);
        return this.nodes[index].getContentDigest();
    }
    
    getNodeHashesByIndex(idSet) {
        // 透過id找葉節點雜湊（多個）
        let ids = idSet.slice();
        let nodeHash = {};
        let idLength = ids.length;
        for(let i = 0 ; i < idLength ; i ++) {
            let node = ids.shift();
            nodeHash[node] = {
                'hash' : this.nodes[node].getContentDigest()
            }; 
        }
        return nodeHash;
    }
    getNodeHashByIndex(id) {
        // 透過id找葉節點雜湊（單個）
        return this.nodes[id].getContentDigest();
    }

    getTransactionHashesByIndex(idSet) {
        // 透過id在葉節點找訂單雜湊值（多個）（若存在則回傳）
        let ids = idSet.slice();
        let nodeHashSet = {};
        let idLength = ids.length;
        for(let i = 0 ; i < idLength ; i ++) {
            let node = ids.shift();
            if(node < (1 << (this.height - 1))) {
                throw new Error('Node ['+node+'] is not leaf.');
            }
            nodeHashSet[node] = {
                'transactionHash' : this.nodes[node].getContent()
            }; 
        }
        return nodeHashSet;
    }
    getTransactionHashByIndex(id) {
        // 透過id在葉節點找訂單雜湊值（單個）（若存在則回傳）
        if(id < (1 << (this.height - 1))) {
            throw new Error('Node ['+id+'] is not leaf.');
        }
        return this.nodes[id].getContent();
    }
    getTreeIds() {
        // 拿樹的所有節點id
        let idSet = new Array();
        for(let i = 1 ; i < 1 << this.height ; i++){
            idSet.push(i);
        }
        return idSet;
    }

    getLeafIds() {
        // 拿樹的所有葉節點id
        let idSet = new Array();
        for(let i = 1 << (this.height - 1) ; i < 1 << this.height ; i++) {
            idSet.push(i);
        }
        return idSet;
    }

    extractSlice(txHash) { //拿到證據切片
        let index = this.calcLeafIndex(txHash);
        let slice = new Array();        
        if (index % 2 == 0) {
            slice.push({
                treeNodeID: index,
                treeNodeHash: this.nodes[index].getContentDigest()
            });
            slice.push({
                treeNodeID: index + 1,
                treeNodeHash: this.nodes[index + 1].getContentDigest()
            });
        } else {
            slice.push({
                treeNodeID: index,
                treeNodeHash: this.nodes[index].getContentDigest()
            });
            slice.push({
                treeNodeID: index - 1,
                treeNodeHash: this.nodes[index - 1].getContentDigest()
            });
        }
        index >>= 1;
        for (;index > 1; index >>= 1) { 
            if (index % 2 == 0) {
                slice.push({
                    treeNodeID: index + 1,
                    treeNodeHash: this.nodes[index + 1].getContentDigest()
                });
            } else {
                slice.push({
                    treeNodeID: index - 1,
                    treeNodeHash: this.nodes[index - 1].getContentDigest()
                });
            }   
        }
        return slice;
    }

    reputData(id, hashSet, contentUser, contentCP, NodeHash) { 
        // restore merkleTree
        this.nodes[id].reput(hashSet, contentUser, contentCP, NodeHash);
    }

    export() {
        // 以JSON格式輸出整棵樹
        return {
            nodes: this.nodes,
            time: this.makeTreeTime,
            height: this.height
        };
    }

    static import(tree) {
        //將整顆樹還原
        let restoreTree = new MerkleTree(tree.height);
        for(let i = 1 ; i < (1 << tree.height) ; i++) {
            restoreTree.reputData(i,tree.nodes[i].hashSet, tree.nodes[i].contentUser, tree.nodes[i].contentCP, tree.nodes[i].NodeHash);
        }                
        return restoreTree;         
    }

    calcLeafIndexByTidHash(txHashSet) { // 自清專用（算所有要稽核的葉節點id）
        let idSet = new Array();
        let txLength = txHashSet.length;
        for(let i = 0 ; i < txLength ; i++) {
            let index ;
            let txHash = txHashSet.shift();
            if(txHash.toString().substring(0,2) === '0x') {
                index = parseInt(txHash.toString().substring(2,14),16);
            }else{
                index = parseInt(txHash.toString().substring(0,12),16);
            }
            let leafLocation = (1 << (this.height - 1)) + Math.abs(index) % (1 << (this.height - 1));
            if(this.getNodeHashSet(leafLocation) === null) {
                // 底下沒肉粽
                throw new Error('Node ['+leafLocation+'] dont have hashSet.');
            }else {
                idSet.push((1 << (this.height - 1)) + Math.abs(index) % (1 << (this.height - 1)));
            }
        }
        return idSet;
    }

    collectSlices(idSet) {
        let ids = idSet.slice();
        let nodeSet = {};
        let idReduce = new Array();
        let txHashLength = ids.length;
        for(let i = 0 ; i < txHashLength ; i++) {
            let id = ids.shift();
            let index = id;
            if(idReduce.indexOf(index) >= 0) {// leaf 抓過直接跳出
                // 重複不紀錄
            }else { 
                for (;index > 1; index >>= 1) { 
                    if (index % 2 == 0) {
                        if(idReduce.indexOf(index) >= 0) {
                            // 重複不紀錄
                        }else {
                            if(index >= (1 << (this.height - 1))) {
                                nodeSet[index] = {
                                    'id' : this.nodes[index].id,
                                    'nodeHash' : this.nodes[index].getContentDigest(),
                                    'hashSet' : this.nodes[index].getContent(),
                                    'isLeaf' : this.nodes[index].getIsLeaf()
                                };
                                idReduce.push(index);
                            }
                        }
                        if(idReduce.indexOf(index + 1) >= 0) {
                            // 重複不紀錄
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
                            // 重複不紀錄
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
                            // 重複不紀錄
                        }else {
                            if(index >= (1 << (this.height - 1))) {
                                nodeSet[index] = {
                                    'id' : this.nodes[index].id,
                                    'nodeHash' : this.nodes[index].getContentDigest(),
                                    'hashSet' : this.nodes[index].getContent(),
                                    'isLeaf' : this.nodes[index].getIsLeaf()
                                };
                                idReduce.push(index);
                            }
                        }
                    }
                }
            }
        }
        return nodeSet;
    }

    maxCollision() {
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        let max = 0;
        for (let i = leafMin ; i < leafMax ; i++) {
            if(this.nodes[i].getContent() === null) {
                //
            } else {
                if (max < this.nodes[i].getContent().length) {
                    max = this.nodes[i].getContent().length;  
                }else { 
                    // 
                }                
            }               
        }         
        return max;
    }
     
    avgCollision() {
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        let total = 0;
        let nonEmptyCount = 0;
        for (let i = leafMin ; i < leafMax ; i++) {
            if (this.nodes[i].getContent() === null) {
                //
            }else {
                nonEmptyCount += 1;
                total += this.nodes[i].getContent().length;
            }
        }        
        let AVG = parseFloat(total/nonEmptyCount);
        return AVG;
    }

    getAllTransactionCiperCP(){
        // 拿到所有CP密文
        let mergeAll = new Array();
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        for(let i = leafMin ; i < leafMax ; i++) {
            if (this.nodes[i].getContentCP() === null) {
                //
            }else {
                mergeAll = mergeAll.concat(this.nodes[i].getContentCP());
            }
        }
        return mergeAll;
    }

    getAllTransactionCiperUser() {
        // 拿到所有User密文
        let mergeAll = new Array();
        let leafMin = 1 << (this.height - 1);
        let leafMax = 1 << (this.height);
        for(let i = leafMin ; i < leafMax ; i++) {
            if (this.nodes[i].getContentUser() === null) {
                //
            }else {
                mergeAll = mergeAll.concat(this.nodes[i].getContentUser());
            }
        }
        return mergeAll;
    }

     
    updateNodeHash(index) {
        let mergeT = '';
        if (this.nodes[index].getIsLeaf() === true) {
            let hashSet = this.nodes[index].getContent();
            for( let i = 0 ; i < hashSet.length ; i++) {
                mergeT = mergeT.concat(hashSet[i]);// 串肉粽
            }
            this.nodes[index].updateNodeHash(EthUtils.sha3(mergeT).toString('hex'));
        } else {
            this.nodes[index].updateNodeHash(EthUtils.sha3(this.nodes[2 * index].getContentDigest().concat(this.nodes[2 * index + 1].getContentDigest())).toString('hex'));
        }
    }
}


class Node {
    constructor(id) {
        this.hashSet = null;
        this.contentUser = null;
        this.contentCP = null;
        this.NodeHash = '';
        this.isLeaf = false;
        this.id = id;
    }
        
    put(cipherUser,cipherCP) {
        if(this.hashSet === null && this.contentUser === null && this.contentCP === null) {
            this.hashSet = new Array();
            this.contentUser = new Array();
            this.contentCP = new Array();
        }
        this.contentUser.push(cipherUser);
        this.contentCP.push(cipherCP);
        this.hashSet.push(EthUtils.sha3(cipherUser.concat(cipherCP).toString('hex')));     
    }

    getContentDigest() {
        return this.NodeHash;
    }
    getIsLeaf() {
        return this.isLeaf;
    }

    setIsLeaf(newIsLeaf) {
        this.isLeaf = newIsLeaf;
    }

    getContent() {
        return this.hashSet;
    }

    getContentUser() {
        return this.contentUser;
    }

    getContentCP() {
        return this.contentCP;
    }

    updateNodeHash(newHash) {
        this.NodeHash = newHash;
    }

    reput(hashSet, contentUser, contentCP, NodeHash) {// restore merkleTree
        this.hashSet = hashSet;
        this.contentUser = contentUser;
        this.contentCP = contentCP;
        this.NodeHash = NodeHash;
    }
}

module.exports = MerkleTree;