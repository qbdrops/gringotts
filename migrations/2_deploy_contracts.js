var IFC = artifacts.require('./IFC.sol');
var SideChain = artifacts.require('./SideChain.sol');
var scid = "0x63d7db5ce060b288ecf5390594d5969bc1a206ceeb24df31cffcc8876df5e44b",
	poe = '0x322e6f92b44ae32152e15f6d2f9469438c6bb353bdb6f2d220254bbd014f06bf',
    treeH = 3;

module.exports = function(deployer) {
    deployer.deploy(IFC);
    deployer.deploy(SideChain, scid, poe, treeH, {value:400});
};
