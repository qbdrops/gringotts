pragma solidity ^0.4.13;

import "./Stage.sol";
import "./SidechainLibrary.sol";

contract IFC {
    address public owner; // The agent service
    address public lib;
    uint public stageHeight;
    mapping (bytes32 => address) public stageAddress;
    bytes32[] public stages;

    bytes32[10] public list;
    uint public debug;

    event AddStage(bytes32 indexed _stageID, address _stageAddress);

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

    function addNewStage(bytes32 _stageID, bytes32 _rootHash) onlyOwner {
        address newStage = new Stage(_stageID, _rootHash, lib, 300, 0);
        stageAddress[_stageID] = newStage;
        stages.push(_stageID);
        stageHeight += 1;
        AddStage(_stageID, newStage);
    }

    function getStageAddress(bytes32 _stageID) constant returns (address) {
        return stageAddress[_stageID];
    }

    function takeObjection(
        bytes32[] agentResponse,
        //agentResponse[0] = _stageID,
        //agentResponse[1] = _tid,
        //agentResponse[2] = _content,
        uint8 v,
        bytes32 r,
        bytes32 s)
    {
        require (agentResponse.length == 3);
        bytes32 hashMsg = SidechainLibrary(lib).hashArray(agentResponse);
        address signer = SidechainLibrary(lib).verify(hashMsg, v, r, s);
        require (signer == owner);
        Stage(stageAddress[agentResponse[0]]).addObjectionableTID(agentResponse[1], msg.sender, agentResponse[2]);
    }

    function exonerate(bytes32 _stageID, bytes32 _tid, bytes32[] slice, bytes32[] leaf) onlyOwner {
        bytes32 hashResult;
        require (SidechainLibrary(lib).inBytes32Array(Stage(stageAddress[_stageID]).getContent(_tid), leaf));
        // content is in leaf array
        hashResult = SidechainLibrary(lib).hashArray(leaf);
        require (hashResult == slice[0] || hashResult == slice[1]);
        // hash (content concat) = first node (or second one) hash in slice
        hashResult = SidechainLibrary(lib).calculateSliceRootHash(slice);
        require (hashResult == Stage(stageAddress[_stageID]).rootHash());
        Stage(stageAddress[_stageID]).resolveObjections(_tid);
    }

    function finalized(bytes32 _stageID) {
        Stage(stageAddress[_stageID]).setCompleted();
    }
}
