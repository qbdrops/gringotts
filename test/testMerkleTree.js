// npm install mocha -g            # mocha 執行檔要安裝在 global
// npm install mocha --save-dev
// npm install should --save-dev

const MerkleTree = require('../indexMerkleTree/MerkleTree.js');
const should = require('should');
const keccak256 = require('js-sha3').keccak256;
const clientAudit = require('../indexMerkleTree/clientAudit.js');
let node = new Array(8) //testArray :simulated merkletree of height 3 have 7 nodes
let tree = new MerkleTree(3);
tree.setSCID(1);

describe('#MerkleTree test', function(){
    it('initial root hash checking', function(){
        // Arrange
        RH = tree.getRootHash();
        // Act
        for(let i = 4 ; i < 8 ; i++){// put hash to initial leaf nodes
            node[i] = keccak256('initial no data');
        }
        for(let i = 3 ; i > 0 ; i--){// put hash to initial internal nodes 
            node[i] = keccak256(node[i * 2].concat(node[i * 2 + 1]));
        }
        // Assert
        RH.should.equal(node[1]);
    })

    it('put one transaction and check(leaf hash, root hash)', function(){
        // Arrange
        let order = {
            'tid': '0x123',
            'contentUser': 'hello world',
            'contentCp': 'hello world'
        };
        tree.putTransactionInTree(order);
        RH = tree.getRootHash();
        // Act
        let subHash = parseInt(keccak256(order.tid.toString()).substring(0, 12), 16);
        let leafLocation =(1 << (3 - 1)) + Math.abs(subHash) % (1 << (3 - 1));
        let orderHash = keccak256(order.contentUser.concat(order.contentCp));
        let leafNodeHash = keccak256(orderHash); // compute orderHash to leafNodeHash
        node[leafLocation] = leafNodeHash;
        for(let i = 3 ; i > 0 ; i--){ //simulated merkletree's internal node update
            node[i] = keccak256(node[i * 2].concat(node[i * 2 + 1]));
        }
        treeLeafHash = tree.getNodeHashByTid(order.tid);
        // Assert
        treeLeafHash.should.equal(node[leafLocation]);// check leaf hash
        RH.should.equal(node[1]);// check root hash
    })

    it('put two transactions(test collision) and check(leaf hash, root hash)', function(){
        // Arrange
        let order = {
            'tid': '0x123',
            'contentUser': 'hello world',
            'contentCp': 'hello world'
        };
        tree.putTransactionInTree(order);
        RH = tree.getRootHash();
        // Act
        let subHash = parseInt(keccak256(order.tid.toString()).substring(0, 12), 16);
        let leafLocation =(1 << (3 - 1)) + Math.abs(subHash) % (1 << (3 - 1));
        let orderHash = keccak256(order.contentUser.concat(order.contentCp));
        let leafNodeHash = keccak256(orderHash.concat(orderHash)); // compute orderHash to leafNodeHash
        node[leafLocation] = leafNodeHash;
        for(let i = 3 ; i > 0 ; i--){ //simulated merkletree's internal node update
            node[i] = keccak256(node[i * 2].concat(node[i * 2 + 1]));
        }
        treeLeafHash = tree.getNodeHashByTid(order.tid);
        // Assert
        treeLeafHash.should.equal(node[leafLocation]);// check leaf hash
        RH.should.equal(node[1]);// check root hash
    })

    // it('collectSlices in tree height 5', function(){
    //     // Arrange
    //     let tree5 = new MerkleTree(5);
    //     let idSet = [];
    //     let idSetCopy = [];
    //     for(let i = 0 ; i < 16 ; i++) { // 隨機產生16筆tid抓交集切片
    //         let faket = 'qdqdq' + i + (i + 1) + (2 * i) + 'qdqwdq';
    //         idSet.push(tree5.calcLeafIndex(faket));
    //         idSetCopy.push(tree5.calcLeafIndex(faket));
    //     }
    //     // Act
    //     let nodeSet = tree5.collectSlices(idSet);
    //     // Assert
    //     let idSetLength = idSetCopy.length;
    //     for(let i = 0 ; i < idSetLength ; i++) { // audit leaf node id 在nodeSet中？
    //         let id = idSetCopy.shift();
    //             id.should.equal(nodeSet[i]);      
    //       }
    // })
})

describe('#ClientAudit test', function(){
    it('slice audit test', function(){
        // Arrange
        let order = {
            'tid': '0x123',
            'contentUser': 'hello world',
            'contentCp': 'hello world'
        };
        let orderHash = keccak256(order.contentUser.concat(order.contentCp));
        let slice = tree.extractSlice('0x123');// get slice which tid = 0x123
        let hashSet = tree.getTransactionHashSet('0x123');// get hsahset which below that slice
        let location = tree.calcLeafIndex('0x123');// get transaction's slice location

        let left;
        let right;
        let testSlice = new Array();
        let testSet = new Array();
        // Act        
        // push orderHash to testSet for simulating the real hashSet 
        testSet.push(orderHash);
        testSet.push(orderHash);
        //get the audit node from simulation tree for simulating the real slice 
        for (;location > 1; location >>= 1) { 
            left = right = node[location];
            if (location % 2 == 0) {
                right = node[location + 1];
            } else {
                left = node[location - 1];
            }
            testSlice.push(left);
            testSlice.push(right);
        }
        testSlice.push(node[1]);        
        // Assert
       let origin = clientAudit.auditSlice(slice, hashSet, order);
       let test = clientAudit.auditSlice(testSlice, testSet, order);
       origin.should.equal(test);
    })
})