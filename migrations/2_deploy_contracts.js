var IFC = artifacts.require("./IFC.sol");
var SideChain = artifacts.require("./SideChain.sol");
// web3.sha3("hello") = "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8"
//var Test = artifacts.require("./Test.sol");
var tgid = "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",
    poe = "0x56cde8ce2a43670bc082485515aa9c443a1d19d8678dfcb555c64f911fec22ff",
    deposit = 400;
module.exports = function(deployer) {
  deployer.deploy(IFC);
  deployer.deploy(SideChain, tgid, poe, {value:deposit});
  //deployer.deploy(Test);
};
