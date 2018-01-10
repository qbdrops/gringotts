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

    struct ObjectionInfo {
        address customer;
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
        if (_stageHash == 0x0 && _rootHash == 0x0) { 
            completed = true;
        } else {
            completed = false;
        }
        objectionTime = now + _objectionTimePeriod;
        finalizedTime = objectionTime + _finalizedTimePeriod;
    }

    function addObjectionableTxHash(bytes32 _txHash, address _customer) onlyOwner {
        require (now < objectionTime);
        require(SidechainLibrary(lib).inBytes32Array(_txHash, objectionableTxHashes) == false);
        objections[_txHash] = ObjectionInfo(_customer, true, false);
        objectionableTxHashes.push(_txHash);
    }

    function resolveObjections(bytes32 _txHash) onlyOwner {
        objections[_txHash].objectionSuccess = false;
    }

    function resolveCompensation(bytes32 _txHash) onlyOwner {
        objections[_txHash].getCompensation = true;
    }

    function setCompleted() onlyOwner {
        require(now > finalizedTime);
        completed = true;
    }

    function getObjectionableTxHashes() constant returns (bytes32[]) {
        return objectionableTxHashes;
    }

    function isSettle() constant returns (bool) {
        for (uint i = 0; i < objectionableTxHashes.length; i++) {
            if (objections[objectionableTxHashes[i]].objectionSuccess && !objections[objectionableTxHashes[i]].getCompensation) {
                return false;
            }
        }
        return true;
    }
}