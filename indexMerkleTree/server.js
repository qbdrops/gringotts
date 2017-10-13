const MerkleTree = require('./MerkleTree.js');
const MerkleTurn = require('./MerkleTurn.js');
const Client = require('./clientAudit.js');
const NodeRSA = require('node-rsa');
const fs = require('fs');


let tree = new MerkleTree(3);
let RH1 = tree.getRootHash();
console.log('Initial Roothash : ' +RH1);
tree.putTransactionInTree({
    'tid': 'T002',
    'content': 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000'
});
tree.putTransactionInTree({
    'tid': 'T002',
    'content': 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000'
});
let RH2 = tree.getRootHash();
console.log('Update Roothash : '+RH1+' --> '+RH2);
console.log('Get TransactionHashSet from tree: '+tree.getTransactionHashSet('T002'));


writeMerkle(tree,'./merkletree/tree.json');// write tree to file.


async function restore () {
    let restoreTree = await readMerkle('./merkletree/tree.json');// restore tree
    console.log('-------------------------------------------------------------------------------------------------------------------------------------------------');
    console.log('restore tree .......');
    console.log(tree);
    console.log(restoreTree.getTransactionHashSet('T002'));
    console.log(restoreTree.getTransactionSet('T002'));
    console.log(auditSlice(restoreTree.extractSlice('T002'), restoreTree.getTransactionHashSet('T002'), {
    'tid': 'T002',
    'content': 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000'
    })); //auditslice(slice, orderHashSet, orderPlain);

} 

restore();















// // rsa test  npm install node-rsa

// key gen(privateKey,publicKey) & write to file

// let key = new NodeRSA();
// let user = key.generateKeyPair(2048);
// fs.writeFile('./keypair/userPrivateKey.json', JSON.stringify(user.exportKey('pkcs8-private-pem')), (err)=> {
//         });
// fs.writeFile('./keypair/userPublicKey.json', JSON.stringify(user.exportKey('pkcs8-public-pem')), (err)=> {
//         });




// read keypair from file & encrypt decrypt




// fs.readFile('./keypair/userPublicKey.json', 'utf-8', (err, data1)=> {
//             let readPublic = JSON.parse(data1);
//             let user1 = new NodeRSA();
//             user1.importKey(readPublic, 'pkcs8-public-pem'); 
//             let encrypted = user1.encrypt('Roothash', 'base64');
//             console.log(encrypted);
//             fs.readFile('./keypair/userPrivateKey.json', 'utf-8', (err, data2)=> {
//                 let readPrivate = JSON.parse(data2);
//                 user1.importKey(readPrivate, 'pkcs8-private-pem');
//                 let decrypted = user1.decrypt(encrypted, 'utf8')
//                 console.log(decrypted); 
//             });
           
// });

   



