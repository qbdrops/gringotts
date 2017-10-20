// npm install mocha -g            # mocha 執行檔要安裝在 global
// npm install mocha --save-dev
// npm install should --save-dev

const MerkleTree = require('../indexMerkleTree/MerkleTree.js');
// const mocha = require('../node_modules/mocha/mocha.js');
const should = require('should');
const keccak256 = require('js-sha3').keccak256;
const clientAudit = require('../indexMerkleTree/clientAudit.js');
let node = new Array(8) // a[0] not use , only use a[1-7]
let tree = new MerkleTree(3);
tree.setSCID(1);

describe('#MerkleTree test', function(){
    it('initial root hash checking', function(){
        // Arrange
        RH = tree.getRootHash();
        // Act
        for(let i = 4 ; i < 8 ; i++){// a[4-7] : leaf
            node[i] = keccak256('initial no data');
        }
        for(let i = 3 ; i > 0 ; i--){ 
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
        // Act
        let index = parseInt(keccak256(order.tid.toString()).substring(0, 12), 16);
        let leafLocation =(1 << (3 - 1)) + Math.abs(index) % (1 << (3 - 1));
        let tOrderHash = keccak256(order.contentUser.concat(order.contentCp));
        let leafNodeHash = keccak256(tOrderHash);
        node[leafLocation] = leafNodeHash;
        tree.putTransactionInTree(order);
        for(let i = 3 ; i > 0 ; i--){ // internal node update
            node[i] = keccak256(node[i * 2].concat(node[i * 2 + 1]));
        }
        treeLeafHash = tree.getNodeHash(order.tid);
        RH = tree.getRootHash();
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
        // Act
        let index = parseInt(keccak256(order.tid.toString()).substring(0, 12), 16);
        let leafLocation =(1 << (3 - 1)) + Math.abs(index) % (1 << (3 - 1));
        let tOrderHash = keccak256(order.contentUser.concat(order.contentCp));
        let leafNodeHash = keccak256(tOrderHash.concat(tOrderHash));
        node[leafLocation] = leafNodeHash;
        tree.putTransactionInTree(order);
        for(let i = 3 ; i > 0 ; i--){ // internal node update
            node[i] = keccak256(node[i * 2].concat(node[i * 2 + 1]));
        }
        treeLeafHash = tree.getNodeHash(order.tid);
        RH = tree.getRootHash();
        // Assert
        treeLeafHash.should.equal(node[leafLocation]);// check leaf hash
        RH.should.equal(node[1]);// check root hash
    })
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
        let slice = tree.extractSlice('0x123');
        let hashSet = tree.getTransactionHashSet('0x123');
        let location = tree.calcLeafIndex('0x123');

        let left;
        let right;
        let testSlice = new Array();
        let testSet = new Array();
        // Act
        testSet.push(orderHash);
        testSet.push(orderHash);
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