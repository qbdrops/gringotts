const MerkleTree = require('../indexMerkleTree/MerkleTree.js');
// const mocha = require('../node_modules/mocha/mocha.js');
const should = require('should');

describe('#MerkleTree testing', function(){
    it('initial root hash checking', function(done){
        let tree = new MerkleTree(3);
        RH = tree.getRootHash();
        RH.should.equal('b8f31bb93378d0bd9e3f210fe886432814442275a5b52c9937df4d0815337e25');
        done();
    })
})