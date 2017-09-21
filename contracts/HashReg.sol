pragma solidity ^0.4.13;

contract HashReg {
    address public owner;

    mapping (bytes32 => address) public addressIFC;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function HashReg() {
        owner = msg.sender;
    }

    function addIFCAddress(bytes32 rootHash, address addr) onlyOwner returns (bool) {
        if (addressIFC[rootHash] != 0x0) {
            return false;
        } else {
            addressIFC[rootHash] = addr;
        }
        return true;
    }

    function getIFCAddress(bytes32 rootHash) constant returns (address) {
        return addressIFC[rootHash];
    }
}