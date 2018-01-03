pragma solidity ^0.4.15;

import "./SidechainLibrary.sol";

contract Stage {
    address public owner; //IFC contract
    bytes32 public stageID;
    bytes32 public rootHash;
    address public lib; // IFC Lib
    bool public completed;
    string public version = "1.0.0";
    uint public objectionTime;
    uint public exonerateTime;

    mapping (bytes32 => ObjectionInfo) public objections;
    bytes32[] public objectionableTIDs;

    event SideChainEvent(address indexed _owner, bytes32 indexed _stageID, bytes4 _func);

    struct ObjectionInfo {
        address customer;
        bytes32 hashOfContent;
        bool objectionSuccess;
        bool getCompensation;
    }
   
    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function Stage(
        bytes32 _stageID,
        bytes32 _rootHash,
        address _lib,
        uint _objectionTimePeriod,
        uint _exonerateTimePeriod) 
    {
        owner = msg.sender;
        stageID = _stageID;
        rootHash = _rootHash;
        lib = _lib;
        completed = false;
        objectionTime = now + _objectionTimePeriod;
        exonerateTime = objectionTime + _exonerateTimePeriod;
    }

    function addObjectionableTID(bytes32 _tid, address _customer, bytes32 _content) onlyOwner {
        require (now < objectionTime);
        require(SidechainLibrary(lib).inBytes32Array(_tid, objectionableTIDs) == false);
        objections[_tid] = ObjectionInfo(_customer, _content, true, false);
        objectionableTIDs.push(_tid);
    }

    function resolveObjections(bytes32 _tid) onlyOwner {
        require(msg.sender == owner);
        objections[_tid].objectionSuccess = false;
    }

    function getContent(bytes32 _tid) constant returns (bytes32) {
        return objections[_tid].hashOfContent;
    }

    function getObjectionableTIDs() constant returns (bytes32[]) {
        return objectionableTIDs;
    }

    function setCompleted() onlyOwner {
        //require(now > exonerateTime);
        completed = true;
    }
}