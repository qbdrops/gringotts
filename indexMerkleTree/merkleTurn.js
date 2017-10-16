//npm install --save circular-json
const CircularJSON = require('circular-json')
const fs = require('fs');
const MerkleTree = require('./MerkleTree.js');



    writeMerkle = function(tree, path){
        fs.writeFile(path.toString(), CircularJSON.stringify(tree), (err)=> {
        });

    }





    readMerkle = function(path){
        return new Promise((resolve, reject) => {
            fs.readFile(path.toString(), 'utf-8', (err, data)=> {
    
                let refile = CircularJSON.parse(data);
                let restoreTree = new MerkleTree(refile.height);

                for(let i = 1 ; i < (1 << refile.height) ; i++){
                    restoreTree.reputData(i,refile.nodes[i].content, refile.nodes[i].contentPlain, refile.nodes[i].contentDigest);
                }
                

                resolve(restoreTree);
        
  
             
            });

        });   
  }


