const MerkleTree = require('./MerkleTree.js');
// const Client = require('./clientAudit.js');
const RSAencrypt = require('./RSAencrypt.js');
const keccak256 = require('js-sha3').keccak256;
async function restore () {
    let tree = new MerkleTree(3);
    // let RH1 = tree.getRootHash();
    tree.setSCID(10);
    // console.log('Initial Roothash : ' +RH1);
    let content = 'to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000 , scid = 1, tid = T002';
    let publicUser = await RSAencrypt.readPublic('./indexMerkleTree/keypair/userPublicKey.json');
    let publicCp = await RSAencrypt.readPublic('./indexMerkleTree/keypair/cpPublicKey.json');    
    let ciphertextUser = await RSAencrypt.encrypt(content, publicUser.publicKey);// encrypt by user key
    let ciphertextCp = await RSAencrypt.encrypt(content, publicCp.publicKey);// encrypt by user key
    tree.putTransactionInTree({
        'tid': 'T00kdopsckpkopqwwqopd2',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T06666602',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T0cdwvwegretrwqcvweefw02',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T0loowowqodwqodkqmk02',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T00qowdpowqfpwqjdqwjd2',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T0dfgdfgegwre02',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T002',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T00w21w122',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    tree.putTransactionInTree({
        'tid': 'T0jwqodjwqoidwqj02',
        'contentUser': ''+ciphertextUser+'',
        'contentCp': ''+ciphertextCp+''
    });
    // let RH2 = tree.getRootHash();
    // console.log('Update Roothash : '+RH1+' --> '+RH2);
    // console.log('Get TransactionHashSet from tree: '+tree.getTransactionHashSet('T002'));

    let tJson = tree.export();
    let restoreTree = MerkleTree.import(tJson);
    console.log(restoreTree);
    // console.log('肉粽 ： ', restoreTree.getTransactionHashSet('T002'));







    try{
        let tidSet = new Array();
        for(let i = 0 ; i < 10 ; i++) {
            tidSet.push(keccak256('1412dwd' + i+ 'wefewfjewlifjeo'));
        }
        let idSet = restoreTree.calcLeafIndexByTidHash(tidSet);
        console.log(idSet);
        let result = restoreTree.collectSlices(idSet);
        console.log(result);
    }catch(e){
        console.log(e);
    }





    // let order = {
    //     'tid': 'T002',
    //     'orderCipherUser': 'WLruvki2TcpiR9I9zuz364vizWpWC5RX2AfAH4cD9GUHA4u3/mtlo3FBB6fik+j25gevBMYujBOPAzTsuo6zu3Ip8D0dwb7NcQG+W2Qp1xGi+MDA81xwTTXZpIf2u5XWJxZZpy2d0aKETEUCnJgpfxgwK4PZNC9CG5VWcFJqMynAd8jikm39+vGwZUMo45YzdwgEkY6lRBIAsaPgLt8dFe5oxegxYDH98GWrdcc9k5cPMJ0cYEbPJDNGZmcv1sbzPLJ35jUePiUYUiRxZgXW4uOhjGNUuJMjfoaePEzB/9109bSP0ad0nwMG5wWwZrSuqYwp0oTjbNAX81/1r27KDw==',
    //     'orderCipherCp': 'NfzXkMdnpvpTGBuyDFaIYuCR43rOPzZuSZd4GS8uFnQnv5W/nZSCp0arLwI8pPRpdvEVPYnAvjG7VE97E5yhSwu3PFOVc3WENMS65lunUiC8VXT/0TAFCaJTcX3OgCHiNfyxfUDQ+nVgc5AYxEQXEr6y7oLJ4RDpQ8pq9S07KSyfJA+ti8ArPPlbwyer6pe6pzvRIWE/zYNnqLxzzKa8LkprnK5nQnt5MchVAg9xaa1KkZQi2WpmuTXlpoqMpLLKVQddRgfvLNU7OrjyOrMIuBHwXih8sajrhUGMSc416SRNpW6iaM2Osj26iLAver8DRuVLifKkNGG5EggFKif9mA=='
    
    // };

    // console.log(Client.auditSlice(restoreTree.extractSlice('T002'), restoreTree.getTransactionHashSet('T002'),order)); //auditslice(slice, orderHashSet, order);
} 

restore();



