pragma solidity ^0.4.13;

import "./IFC.sol";

contract HashReg {
    address public owner;
    mapping (bytes32 => address) IFCaddress;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function HashReg() {
        owner = msg.sender;
    }

    function addIFCAddress(address addr) onlyOwner returns (bool) {
        bytes32 rootHash;
        IFC ifc = IFC(addr);
        rootHash = ifc.proofOfExistence();
        if (rootHash == 0x0) {
            return false;
        }
        if (IFCaddress[rootHash] != 0x0) {
            return false;
        } else {
            IFCaddress[rootHash] = addr;
        }
        return true;
    }

    function getIFCAddress(bytes32 rootHash) constant returns (address) {
        return IFCaddress[rootHash];
    }
}