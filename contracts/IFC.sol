pragma solidity ^0.4.13;

import "./SideChain.sol";

contract IFC {
    address public owner;
    mapping (bytes32 => address) sideChainAddress;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function IFC() {
        owner = msg.sender;
    }

    function addSideChainAddress(address addr) onlyOwner returns (bool) {
        bytes32 rootHash;
        SideChain sc = SideChain(addr);
        rootHash = sc.proofOfExistence();
        if (rootHash == 0x0) {
            return false;
        }
        if (sideChainAddress[rootHash] != 0x0) {
            return false;
        } else {
            sideChainAddress[rootHash] = addr;
        }
        return true;
    }

    function getSideChainAddress(bytes32 rootHash) constant returns (address) {
        return sideChainAddress[rootHash];
    }
}
