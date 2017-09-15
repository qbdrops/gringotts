 const MerkleTree = require('./MerkleTree.js');
 keccak256 = require('js-sha3').keccak256;
 let tree = new MerkleTree(10);

  let RH1 = tree.getRootHash();
  console.log("Initial Roothash : " +RH1);



  console.log("-----------Insert some data in Tree-----------");



  console.log("----Put Transaction1----");
  tree.putTransactionInTree("U0x123","T001","to : cp1 , from : U0x123 , video : xx23411 , time : 10 minutes , XPA : 1000000");
  let RH2 = tree.getRootHash();
  console.log("Update Roothash : "+RH1+" --> "+RH2);
  console.log("Get Transaction1 from tree: "+tree.getTransaction("U0x123","T001"));


  console.log("----Put Transaction2----");
  tree.putTransactionInTree("U0x123","T002","to : cp4 , from : U0x123 , video : xx212311 , time : 5 minutes , XPA : 500000");
  let RH3 = tree.getRootHash();
  console.log("Update Roothash : "+RH2+" --> "+RH3);
  console.log("Get Transaction2 from tree: "+tree.getTransaction("U0x123","T002"));


  console.log("----Put Transaction3----");
  tree.putTransactionInTree("U0x123","T003","to : cp2 , from : U0x123 , video : xx112311 , time : 1 minutes , XPA : 100000");
  let RH4 = tree.getRootHash();
  console.log("Update Roothash : "+RH3+" --> "+RH4);
  console.log("Get Transaction3 from tree: "+tree.getTransaction("U0x123","T003"));


  console.log("----Put Transaction4----");
  tree.putTransactionInTree("U0x123","T004","to : cp8 , from : U0x123 , video : xx11891 , time : 3 minutes , XPA : 300000");
  let RH5 = tree.getRootHash();
  console.log("Update Roothash : "+RH4+" --> "+RH5);
  console.log("Get Transaction4 from tree: : "+tree.getTransaction("U0x123","T004"));


  console.log("-------------------------------Client Audit---------------------------------------");
  let slice1 = tree.extractSlice("U0x123","T001");
  let TransactionDetial1 = tree.getTransaction("U0x123","T001");
  console.log(tree.auditSlice("T001",slice1,TransactionDetial1));  //client: Uid & Tid ,Server give: slice & leaf content


  let slice2 = tree.extractSlice("U0x123","T002");
  let TransactionDetial2 = tree.getTransaction("U0x123","T002");
  console.log(tree.auditSlice("T002",slice2,TransactionDetial2));

  let slice3 = tree.extractSlice("U0x123","T003");
  let TransactionDetial3 = tree.getTransaction("U0x123","T003");
  console.log(tree.auditSlice("T003",slice3,TransactionDetial3));

//   let slice4 = tree.extractSlice("U0x123","T004");
//   let TransactionDetial4 = tree.getTransaction("U0x123","T004");
//   console.log(tree.auditSlice("T004",slice4,TransactionDetial4));
// console.log(tree.sha());
  //console.log(tree);

// var fs = require('fs');
// fs.writeFile("./merkletree/tree.json", JSON.stringify(tree), function(err) {
//     if(err) {
//         return console.log(err);
//     }

//     console.log("The file was saved!");
// }); 





// fs.readFile('./merkletree/tree.json', 'utf-8', function(err, data) {
//   if (err) throw err
//   let tree2 = new MerkleTree(10);
//    tree2 = JSON.parse(data);
//    console.log(tree2);
//   console.log(tree2.extractSlice("U0x123","T004"));

// });



