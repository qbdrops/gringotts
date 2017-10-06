const MerkleTree = require('./MerkleTree.js');
let tree = new MerkleTree(10);

let RH1 = tree.getRootHash();
console.log('Initial Roothash : ' +RH1);
console.log('-----------Insert some data in Tree-----------');

console.log('----Put Transaction1----');

tree.putTransactionInTree({
    'tid': 'T001',
    'content': 'to : cp1 , from : U0x123 , video : xx23411 , time : 10 minutes , XPA : 1000000'
});
let RH2 = tree.getRootHash();
console.log('Update Roothash : '+RH1+' --> '+RH2);
console.log('Get Transaction1 from tree: '+tree.getTransaction('U0x123','T001'));

console.log('----Put Transaction2----');
tree.putTransactionInTree({
    'tid': 'T002',
    'content': 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000'
});
let RH3 = tree.getRootHash();
console.log('Update Roothash : '+RH2+' --> '+RH3);
console.log('Get Transaction2 from tree: '+tree.getTransaction('U0x123','T002'));
