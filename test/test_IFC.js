var IFC = artifacts.require("./IFC.sol");

contract("IFC", function(accounts) {
  it("owner should be same as msg.sender", function(){
    return IFC.deployed().then(function(instance) {
      return instance.owner().then(function(owner){
        assert.equal(accounts[0], owner, "msg.sender wasn't the owner");
      });
    });
  });

  it("only owner can call setPOE", function() {
    var origin_poe;
    return IFC.deployed().then(function(instance) {
      return instance.proofOfExistence().then(function(poe) {
        origin_poe = poe;
        return instance.setPOE("0x123", {from: accounts[1]}).then(function() {
          return instance.proofOfExistence().then(function(poe) {
            assert.equal(origin_poe, poe, "poe should not be the same");
          });
        });
      });
    });
  });

  it("after poe was setted, it should not be setted again", function() {
    var first_poe;
    return IFC.deployed().then(function(instance) {
      return instance.setPOE("0x123").then(function() {
        return instance.proofOfExistence().then(function(poe) {
          first_poe = poe;
          return instance.setPOE("0x456").then(function() {
            return instance.proofOfExistence().then(function(poe) {
              assert.equal(first_poe, poe, "poe should not be changed");
            });
          });
        });
      });
    });
  });
  /*
  it("only input enough value can take objection", function() {
    var enough = 100;
    var not_enought = 99;
    var accounts_one = accounts[1];
    var accounts_two = accounts[2];
    var first_length_OA;
    var second_length_OA;
    return IFC.deployed().then(function(instance) {
      return instance.takeObjection({from: accounts_one, value: enough}).then(function() {
        return instance.objectionAddress.length().then(function(o) {
          first_length_OA = o;
          console.log(first_length_OA);
        });
      });
    });
  });
  */
});