pragma solidity ^0.4.13;

import "./SideChainBlock.sol";

contract IFC {
    address public owner;
    mapping (bytes32 => address) public BlockAddress;
    bytes32[] public blockID;
    uint public blockNumber;

    event SideChainAddEvent(bytes32 _blkID, address _addr);

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function IFC() {
        owner = msg.sender;
    }

    function addBlockAddress(address addr) onlyOwner {
        bytes32 blkID;
        SideChainBlock sc = SideChainBlock(addr);
        blkID = sc.sideChainID();
        require(blkID != 0x0 && BlockAddress[blkID] == 0x0);
        blockID.push(blkID);
        BlockAddress[blkID] = addr;
        blockNumber += 1;
        SideChainAddEvent(blkID, addr);
    }

    function getBlockAddress(bytes32 blkID) constant returns (address) {
        return BlockAddress[blkID];
    }

    // for test
    function reset() onlyOwner {
        for(uint i = 0; i < blockID.length; i++) {
            BlockAddress[blockID[i]] = 0x0;
        }
        delete blockID;
    }
}
