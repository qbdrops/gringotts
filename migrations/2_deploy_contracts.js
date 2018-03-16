var IFC = artifacts.require('./IFC.sol');
var IFCFlexible = artifacts.require('./IFCFlexible.sol');
var argv = require('minimist')(process.argv.slice(2));

module.exports = function(deployer) {
   if (!argv.contract === true || argv.contract == 'general') {
       deployer.deploy(IFC, 100);
   } else if (argv.contract == 'flexible') {
       deployer.deploy(IFCFlexible, 100);
   }
};
