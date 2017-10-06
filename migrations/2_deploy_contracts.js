var IFC = artifacts.require('./IFC.sol');
var SideChain = artifacts.require('./SideChain.sol');
var scid = "0xabc",
	poe = '0xe0936cc9130e93c272485df786d172902ecf048d44767e3ceb7add67be0b9a6f',
    treeH = 3;

module.exports = function(deployer) {
    deployer.deploy(IFC);
    deployer.deploy(SideChain, scid, poe, treeH);
};
