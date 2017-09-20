var IFC = artifacts.require("./IFC.sol");
// web3.sha3("hello") = "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8"
module.exports = function(deployer) {
  deployer.deploy(IFC, "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8");
};
