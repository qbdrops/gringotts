var IFC = artifacts.require("./IFC.sol");

contract("IFC", function(accounts) {
  it("owner should be same as msg.sender", function(){
    return IFC.deployed()
    .then(instance => (instance) => {
      instance.owner()
      .then(o => {
        owner = o;
        assert.equal(accounts[0], owner, "msg.sender wasn't the owner");
      });
    });
  });
});