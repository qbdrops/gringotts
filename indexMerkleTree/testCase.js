const MerkleTree = require('./MerkleTree.js');
const MerkleTurn = require('./MerkleTurn.js');
const Client = require('./clientAudit.js');
const RSAencrypt = require('./RSAencrypt.js');

async function restore () {
    let tree = new MerkleTree(3);
    let RH1 = tree.getRootHash();
    console.log('Initial Roothash : ' +RH1);
    let content = 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000';
    let public_user = await RSAencrypt.readPublic('./indexMerkleTree/keypair/userPublicKey.json');
    let public_cp = await RSAencrypt.readPublic('./indexMerkleTree/keypair/cpPublicKey.json');    
    let ciphertext_user = await RSAencrypt.encrypt(content, public_user);// encrypt by user key
    let ciphertext_cp = await RSAencrypt.encrypt(content, public_cp);// encrypt by user key
    tree.putTransactionInTree({
        'tid': 'T002',
        'content_user': ''+ciphertext_user+'',
        'content_cp': ''+ciphertext_cp+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'content_user': ''+ciphertext_user+'',
        'content_cp': ''+ciphertext_cp+''
    });
    let RH2 = tree.getRootHash();
    console.log('Update Roothash : '+RH1+' --> '+RH2);
    console.log('Get TransactionHashSet from tree: '+tree.getTransactionHashSet('T002'));


    MerkleTurn.writeMerkle(tree,'./indexMerkleTree/merkletree/tree.json');// write tree to file.



    let restorefile = await MerkleTurn.readJSONfile('./indexMerkleTree/merkletree/tree.json');// restore tree
    let restoreTree = await MerkleTurn.restoreMerkle(restorefile);// restore tree
    console.log('-------------------------------------------------------------------------------------------------------------------------------------------------');
    console.log('restore tree .......');
    console.log(tree);
    console.log(restoreTree.getTransactionHashSet('T002'));
    console.log(restoreTree.getTransactionSet_user('T002'));
    console.log(restoreTree.getTransactionSet_cp('T002'));


    console.log(Client.auditSlice(restoreTree.extractSlice('T002'), restoreTree.getTransactionHashSet('T002'), {
        'tid': 'T002',
        'orderCipher_user': 'WLruvki2TcpiR9I9zuz364vizWpWC5RX2AfAH4cD9GUHA4u3/mtlo3FBB6fik+j25gevBMYujBOPAzTsuo6zu3Ip8D0dwb7NcQG+W2Qp1xGi+MDA81xwTTXZpIf2u5XWJxZZpy2d0aKETEUCnJgpfxgwK4PZNC9CG5VWcFJqMynAd8jikm39+vGwZUMo45YzdwgEkY6lRBIAsaPgLt8dFe5oxegxYDH98GWrdcc9k5cPMJ0cYEbPJDNGZmcv1sbzPLJ35jUePiUYUiRxZgXW4uOhjGNUuJMjfoaePEzB/9109bSP0ad0nwMG5wWwZrSuqYwp0oTjbNAX81/1r27KDw==',
        'orderCipher_cp': 'NfzXkMdnpvpTGBuyDFaIYuCR43rOPzZuSZd4GS8uFnQnv5W/nZSCp0arLwI8pPRpdvEVPYnAvjG7VE97E5yhSwu3PFOVc3WENMS65lunUiC8VXT/0TAFCaJTcX3OgCHiNfyxfUDQ+nVgc5AYxEQXEr6y7oLJ4RDpQ8pq9S07KSyfJA+ti8ArPPlbwyer6pe6pzvRIWE/zYNnqLxzzKa8LkprnK5nQnt5MchVAg9xaa1KkZQi2WpmuTXlpoqMpLLKVQddRgfvLNU7OrjyOrMIuBHwXih8sajrhUGMSc416SRNpW6iaM2Osj26iLAver8DRuVLifKkNGG5EggFKif9mA=='
    })); //auditslice(slice, orderHashSet, ordercipher);
} 

restore();






   



