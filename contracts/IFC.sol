pragma solidity ^0.4.13;

import "./SideChain.sol";

contract IFC {
    address public owner;
    mapping (bytes32 => address) sideChainAddress;
    bytes32[] scidInUse;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function IFC() {
        owner = msg.sender;
    }

    function addSideChainAddress(address addr) onlyOwner returns (bool) {
        bytes32 scid;
        SideChain sc = SideChain(addr);
        scid = sc.sideChainID();
        if (scid == 0x0) {
            return false;
        }
        if (sideChainAddress[scid] != 0x0) {
            return false;
        }
        scidInUse.push(scid);
        sideChainAddress[scid] = addr;
        return true;
    }

    function getSideChainAddress(bytes32 scid) constant returns (address) {
        return sideChainAddress[scid];
    }
}
