const CircularJSON = require('circular-json');
const fs = require('fs');
const MerkleTree = require('./MerkleTree.js');

let writeMerkle = function(tree, path){
    fs.writeFile(path.toString(), CircularJSON.stringify(tree), ()=> {
    });
};

let readJSONfile = function(path){
    return new Promise((resolve) => {
        fs.readFile(path.toString(), 'utf-8', (err, data)=> {   
            let refile = CircularJSON.parse(data);            
            resolve(refile);             
        });
    });   
};

let restoreMerkle = function(refile){
    return new Promise((resolve) => {     
        let restoreTree = new MerkleTree(refile.height);
        for(let i = 1 ; i < (1 << refile.height) ; i++){
            restoreTree.reputData(i,refile.nodes[i].content, refile.nodes[i].contentUser, refile.nodes[i].contentCp, refile.nodes[i].contentDigest);
        }                
        resolve(restoreTree);                    
    });
};

module.exports = {
    writeMerkle : writeMerkle,
    restoreMerkle : restoreMerkle,
    readJSONfile : readJSONfile
};