// npm install mocha -g            # mocha 執行檔要安裝在 global
// npm install mocha --save-dev
// npm install should --save-dev

const MerkleTree = require('../indexMerkleTree/MerkleTree.js');
// const mocha = require('../node_modules/mocha/mocha.js');
const should = require('should');
const keccak256 = require('js-sha3').keccak256;


let node = new Array(8) // a[0] not use , only use a[1-7]
let tree = new MerkleTree(3);
tree.setSCID(1);

describe('#MerkleTree construct', function(){
    it('initial root hash checking', function(){
        for(let i = 4 ; i < 8 ; i++){// a[4-7] : leaf
            node[i] = keccak256('initial no data');
        }
        //internal node
        for(let i = 3 ; i > 0 ; i--){ 
            node[i] = keccak256(node[i*2].concat(node[i*2+1]));
        }
        // 以上硬幹
        RH = tree.getRootHash();
        RH.should.equal(node[1]);
    })
})

describe('#MerkleTree put one transaction', function(){
    it('Put one transaction and check(leaf hash, root hash)', function(){
        let tid = '0x123';
        let tOrder = 'hello world';
        let index = parseInt(keccak256(tid.toString()).substring(0,12),16);
        let leafLocation =(1 << (3 - 1)) + Math.abs(index) % (1 << (3 - 1));
        let tOrderHash = keccak256(tOrder.concat(tOrder));
        let leafNodeHash = keccak256(tOrderHash);
        node[leafLocation] = leafNodeHash;
        tree.putTransactionInTree({
                    'tid': '0x123',
                    'contentUser': ''+tOrder+'',
                    'contentCp': ''+tOrder+''
                });
        for(let i = 3 ; i > 0 ; i--){ //internal node update
            node[i] = keccak256(node[i*2].concat(node[i*2+1]));
        }

        treeLeafHash = tree.getNodeHash('0x123');
        treeLeafHash.should.equal(node[leafLocation]);// check leaf hash
        RH = tree.getRootHash();
        RH.should.equal(node[1]);// check root hash
    })
})


