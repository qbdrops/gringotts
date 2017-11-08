const MerkleTree = require('./MerkleTree.js');
// const Client = require('./clientAudit.js');
// const RSAencrypt = require('./RSAencrypt.js');
// const keccak256 = require('js-sha3').keccak256;
async function restore () {




    // let countAVG = 0;
    // let countMax = 0;
    // for(let j = 0 ; j < 100 ; j++) {
    let height = 5;
    let tree = new MerkleTree(height);
    tree.setSCID(10);
    let sample;
    for(let i = 0 ; i < (1 << height - 1) ; i ++) {
        sample = Math.random().toString();
        tree.putTransactionInTree({
            'tid': sample,
            'contentUser': ''+sample+'',
            'contentCp': ''+sample+''
        });
            
    }
    console.log(tree.getAllTransactionCiperCp());
    //     console.log(tree);         
    //     countAVG = countAVG + tree.avgCollision();
    //     countMax = countMax + tree.maxCollision(); 
    // }

    
    // console.log('avg : ' + countAVG / 100);
    // console.log('max : ' + countMax / 100); 



    // let tree = new MerkleTree(17);
    // console.log(tree.export());





} 

restore();



