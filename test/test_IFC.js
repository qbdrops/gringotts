var IFC = artifacts.require('./IFC.sol');

contract('IFC', function(accounts) {
    it('owner should be same as msg.sender', function() {
        return IFC.deployed().then(function(instance) {
            return instance.owner().then(function(owner) {
                assert.equal(accounts[0], owner, 'msg.sender wasn\'t the owner');
            });
        });
    });
});