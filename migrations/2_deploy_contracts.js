var IFC = artifacts.require('./IFC.sol');
var SideChainTemplate = artifacts.require('./SideChainTemplate.sol');

module.exports = function(deployer) {
    deployer.deploy(IFC);
    deployer.deploy(SideChainTemplate);
};
