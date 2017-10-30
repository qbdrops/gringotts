const MerkleTree = require('./MerkleTree.js');
// const Client = require('./clientAudit.js');
const RSAencrypt = require('./RSAencrypt.js');

async function restore () {
    let tree = new MerkleTree(4);
    // let RH1 = tree.getRootHash();
    tree.setSCID(10);
    // console.log('Initial Roothash : ' +RH1);
    let content = 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000 , scid = 1, tid = T002';
    let publicUser = await RSAencrypt.readPublic('./indexMerkleTree/keypair/userPublicKey.json');
    let publicCp = await RSAencrypt.readPublic('./indexMerkleTree/keypair/cpPublicKey.json');    
    let ciphertextUser = await RSAencrypt.encrypt(content, publicUser.publicKey);// encrypt by user key
    let ciphertextCp = await RSAencrypt.encrypt(content, publicCp.publicKey);// encrypt by user key
    tree.putTransactionInTree({
        'tid': 'T002',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    // let RH2 = tree.getRootHash();
    // console.log('Update Roothash : '+RH1+' --> '+RH2);
    // console.log('Get TransactionHashSet from tree: '+tree.getTransactionHashSet('T002'));

    let tJson = tree.export();
    let restoreTree = MerkleTree.import(tJson);
    // console.log(restoreTree);
    // console.log('肉粽 ： ', restoreTree.getTransactionHashSet('T002'));







    try{
        // let result1 = restoreTree.getNodeHashesByIndex([1,2,3,4]);
        // let result2 = restoreTree.getTransactionHashesByIndex([16]);
        // let result3 = restoreTree.getNodeHashByIndex(1);
        // let result4 = restoreTree.getTransactionHashByIndex(18);
        // console.log(result1);
        // console.log(result2);
        // console.log(result3);
        // console.log(result4);
        console.log(restoreTree.getLeafIds());
        console.log(restoreTree.getIds());
    }catch(e){
        console.log(e);
    }
    // let tidSet = new Array();
    // tidSet.push('T002');
    // tidSet.push('T0021232131');
    // tidSet.push('T0023213122');
    // tidSet.push('T002122wq2');
    // tidSet.push('T124324wd002');
    // tidSet.push('T002');
    // tidSet.push('T012412ddfewr2r1302');
    // tidSet.push('T00ewqe2e2');
    // let result = restoreTree.collectSlices(tidSet);
    // console.log(result);





    // let order = {
    //     'tid': 'T002',
    //     'orderCipherUser': 'WLruvki2TcpiR9I9zuz364vizWpWC5RX2AfAH4cD9GUHA4u3/mtlo3FBB6fik+j25gevBMYujBOPAzTsuo6zu3Ip8D0dwb7NcQG+W2Qp1xGi+MDA81xwTTXZpIf2u5XWJxZZpy2d0aKETEUCnJgpfxgwK4PZNC9CG5VWcFJqMynAd8jikm39+vGwZUMo45YzdwgEkY6lRBIAsaPgLt8dFe5oxegxYDH98GWrdcc9k5cPMJ0cYEbPJDNGZmcv1sbzPLJ35jUePiUYUiRxZgXW4uOhjGNUuJMjfoaePEzB/9109bSP0ad0nwMG5wWwZrSuqYwp0oTjbNAX81/1r27KDw==',
    //     'orderCipherCp': 'NfzXkMdnpvpTGBuyDFaIYuCR43rOPzZuSZd4GS8uFnQnv5W/nZSCp0arLwI8pPRpdvEVPYnAvjG7VE97E5yhSwu3PFOVc3WENMS65lunUiC8VXT/0TAFCaJTcX3OgCHiNfyxfUDQ+nVgc5AYxEQXEr6y7oLJ4RDpQ8pq9S07KSyfJA+ti8ArPPlbwyer6pe6pzvRIWE/zYNnqLxzzKa8LkprnK5nQnt5MchVAg9xaa1KkZQi2WpmuTXlpoqMpLLKVQddRgfvLNU7OrjyOrMIuBHwXih8sajrhUGMSc416SRNpW6iaM2Osj26iLAver8DRuVLifKkNGG5EggFKif9mA=='
    
    // };

    // console.log(Client.auditSlice(restoreTree.extractSlice('T002'), restoreTree.getTransactionHashSet('T002'),order)); //auditslice(slice, orderHashSet, order);
} 

restore();



