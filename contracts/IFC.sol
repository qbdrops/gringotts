pragma solidity ^0.4.13;

contract IFC {
    address public owner;
    bytes32 public proofOfExistence;
    bool record = false;

    event InformPOE(bytes32 POE, bytes32 id);

    function IFC() {
        owner = msg.sender;
    } 

    function setPOE(bytes32 rootHash) returns (bool) {
        if (owner != msg.sender || record == true) {
            return false;
        }
        proofOfExistence = rootHash;
        record = true;
        return true;
    }

    function takeObjection(address consumer) returns (bool) {
        
    }
}
