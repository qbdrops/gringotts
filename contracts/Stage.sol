pragma solidity ^0.4.15;

import "./SidechainLibrary.sol";

contract Stage {
    address public owner; //IFC contract
    bytes32 public stageHash;
    bytes32 public rootHash;
    address public lib; // IFC Lib
    bool public completed;
    string public version = "1.0.0";
    uint public objectionTime;
    uint public finalizedTime;

    mapping (bytes32 => ObjectionInfo) public objections;
    bytes32[] public objectionableTxHashes;

    event SidechainEvent(address indexed _owner, bytes32 indexed _stageHash, bytes4 _func);

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
        bytes32 _stageHash,
        bytes32 _rootHash,
        address _lib,
        uint _objectionTimePeriod,
        uint _finalizedTimePeriod)
    {
        owner = msg.sender;
        stageHash = _stageHash;
        rootHash = _rootHash;
        lib = _lib;
        completed = false;
        objectionTime = now + _objectionTimePeriod;
        finalizedTime = objectionTime + _finalizedTimePeriod;
    }

    function addObjectionableTxHash(bytes32 _txHash, address _customer, bytes32 _content) onlyOwner {
        require (now < objectionTime);
        require(SidechainLibrary(lib).inBytes32Array(_txHash, objectionableTxHashes) == false);
        objections[_txHash] = ObjectionInfo(_customer, _content, true, false);
        objectionableTxHashes.push(_txHash);
    }

    function resolveObjections(bytes32 _txHash) onlyOwner {
        require(msg.sender == owner);
        objections[_txHash].objectionSuccess = false;
    }

    function getContent(bytes32 _txHash) constant returns (bytes32) {
        return objections[_txHash].hashOfContent;
    }

    function getObjectionableTxHashes() constant returns (bytes32[]) {
        return objectionableTxHashes;
    }

    function setCompleted() onlyOwner {
        require(now > finalizedTime);
        completed = true;
    }
}