pragma solidity ^0.4.13;

import "./Stage.sol";
import "./SidechainLibrary.sol";

contract IFC {
    address public owner; // The agent service
    address public lib;
    uint public stageHeight;
    mapping (bytes32 => address) public stageAddress;
    bytes32[] public stages;

    event AddStage(bytes32 indexed _stageHash, address _stageAddress);

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function IFC() {
        owner = msg.sender;
        lib = new SidechainLibrary();
        // initial stage
        address newStage = new Stage(0x0, 0x0, 0x0, 0, 0);
        stageAddress[0x0] = newStage;
        stages.push(0x0);
    }

    function addNewStage(bytes32 _stageHash, bytes32 _rootHash) onlyOwner {
        address newStage = new Stage(_stageHash, _rootHash, lib, 300, 0);
        stageAddress[_stageHash] = newStage;
        stages.push(_stageHash);
        stageHeight += 1;
        AddStage(_stageHash, newStage);
    }

    function getStageAddress(bytes32 _stageHash) constant returns (address) {
        return stageAddress[_stageHash];
    }

    function takeObjection(
        bytes32[] agentResponse,
        //agentResponse[0] = _stageHash,
        //agentResponse[1] = _txHash,
        uint8 v,
        bytes32 r,
        bytes32 s)
    {
        require (agentResponse.length == 2);
        bytes32 hashMsg = SidechainLibrary(lib).hashArray(agentResponse);
        address signer = SidechainLibrary(lib).verify(hashMsg, v, r, s);
        require (signer == owner);
        Stage(stageAddress[agentResponse[0]]).addObjectionableTxHash(agentResponse[1], msg.sender);
    }

    function exonerate(bytes32 _stageHash, bytes32 _txHash, uint _idx, bytes32[] slice, bytes32[] leaf) onlyOwner {
        bytes32 hashResult;
        require (SidechainLibrary(lib).inBytes32Array(_txHash, leaf));
        // content is in leaf array
        hashResult = SidechainLibrary(lib).hashArray(leaf);
        require (hashResult == slice[0]);
        // hash (content concat) = first node (or second one) hash in slice
        hashResult = SidechainLibrary(lib).calculateSliceRootHash(_idx, slice);
        require (hashResult == Stage(stageAddress[_stageHash]).rootHash());
        Stage(stageAddress[_stageHash]).resolveObjections(_txHash);
    }

    function finalize(bytes32 _stageHash) {
        Stage(stageAddress[_stageHash]).setCompleted();
    }
}
