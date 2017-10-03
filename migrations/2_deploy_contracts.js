var IFC = artifacts.require('./IFC.sol');
var SideChain = artifacts.require('./SideChain.sol');
var hscid = '0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
    // poe = sha3(roothash||hscid)
    // poe = "0x56cde8ce2a43670bc082485515aa9c443a1d19d8678dfcb555c64f911fec22ff",
    poe = '0xe0936cc9130e93c272485df786d172902ecf048d44767e3ceb7add67be0b9a6f',
    deposit = 400;

module.exports = function(deployer) {
    deployer.deploy(IFC);
    deployer.deploy(SideChain, hscid, poe, {value:deposit});
};
