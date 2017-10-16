const MerkleTree = require('./MerkleTree.js');
const MerkleTurn = require('./MerkleTurn.js');
const Client = require('./clientAudit.js');
const RSAencrypt = require('./RSAencrypt.js');
const NodeRSA = require('node-rsa');
const fs = require('fs');
var constants = require('constants');

async function restore () {
    let tree = new MerkleTree(3);
    let RH1 = tree.getRootHash();
    console.log('Initial Roothash : ' +RH1);
    let content = 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000';
    let ciphertext = await encrypt(content, './keypair/userPublicKey.json');// encrypt by user key
    tree.putTransactionInTree({
        'tid': 'T002',
        'content': ''+ciphertext+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'content': ''+ciphertext+''
    });
    let RH2 = tree.getRootHash();
    console.log('Update Roothash : '+RH1+' --> '+RH2);
    console.log('Get TransactionHashSet from tree: '+tree.getTransactionHashSet('T002'));


    writeMerkle(tree,'./merkletree/tree.json');// write tree to file.




    let restoreTree = await readMerkle('./merkletree/tree.json');// restore tree
    console.log('-------------------------------------------------------------------------------------------------------------------------------------------------');
    console.log('restore tree .......');
    console.log(tree);
    console.log(restoreTree.getTransactionHashSet('T002'));
    console.log(restoreTree.getTransactionSet('T002'));



    console.log(auditSlice(restoreTree.extractSlice('T002'), restoreTree.getTransactionHashSet('T002'), {
        'tid': 'T002',
        'orderCipher': 'WLruvki2TcpiR9I9zuz364vizWpWC5RX2AfAH4cD9GUHA4u3/mtlo3FBB6fik+j25gevBMYujBOPAzTsuo6zu3Ip8D0dwb7NcQG+W2Qp1xGi+MDA81xwTTXZpIf2u5XWJxZZpy2d0aKETEUCnJgpfxgwK4PZNC9CG5VWcFJqMynAd8jikm39+vGwZUMo45YzdwgEkY6lRBIAsaPgLt8dFe5oxegxYDH98GWrdcc9k5cPMJ0cYEbPJDNGZmcv1sbzPLJ35jUePiUYUiRxZgXW4uOhjGNUuJMjfoaePEzB/9109bSP0ad0nwMG5wWwZrSuqYwp0oTjbNAX81/1r27KDw=='
        })); //auditslice(slice, orderHashSet, ordercipher);

    } 

    restore();












// //key gen(privateKey,publicKey) & write to file

// let key = new NodeRSA({encryptionScheme:{scheme:'pkcs1', padding: constants.RSA_NO_PADDING}});
// fs.writeFile('./keypair/cpPrivateKey.json', JSON.stringify(key.exportKey('pkcs8-private-pem')), (err)=> {
//         });
// fs.writeFile('./keypair/cpPublicKey.json', JSON.stringify(key.exportKey('pkcs8-public-pem')), (err)=> {
//         });








// // read keypair from file & encrypt decrypt

// fs.readFile('./keypair/userPublicKey.json', 'utf-8', (err, data1)=> {// encrypt
//             let readPublic = JSON.parse(data1);
//             let user1 = new NodeRSA(readPublic,{encryptionScheme:{scheme:'pkcs1', padding: constants.RSA_NO_PADDING}});
//             let encrypted = user1.encrypt('Roothash', 'base64');
//             console.log('encrypt : '+encrypted);



//             // decrypt
//             fs.readFile('./keypair/userPrivateKey.json', 'utf-8', (err, data2)=> {
//                 let readPrivate = JSON.parse(data2);
//                 user1.importKey(readPrivate, 'pkcs8-private-pem');
//                 let decrypted = user1.decrypt(encrypted, 'utf8')
//                 console.log('restore : '+decrypted); 
//             });
           
// });

   



