pragma solidity ^0.4.15;

import "./SidechainLibrary.sol";

contract Stage {
    address public owner; //IFC contract
    bytes32 public stageHash;
    bytes32 public rootHash;
    address public lib; // IFC Lib
    bool public completed;
    string public version = "1.0.1";
    uint public objectionTime;
    uint public finalizedTime;
    string public data;

    mapping (bytes32 => ObjectionInfo) public objections;
    bytes32[] public objectionablePaymentHashes;

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
        uint _finalizedTimePeriod,
        string _data)
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
        data = _data;
    }

    function addObjectionablePaymentHash(bytes32 _paymentHash, address _customer) onlyOwner {
        require (now < objectionTime);
        require(SidechainLibrary(lib).inBytes32Array(_paymentHash, objectionablePaymentHashes) == false);
        objections[_paymentHash] = ObjectionInfo(_customer, true, false);
        objectionablePaymentHashes.push(_paymentHash);
    }

    function resolveObjections(bytes32 _paymentHash) onlyOwner {
        objections[_paymentHash].objectionSuccess = false;
    }

    function resolveCompensation(bytes32 _paymentHash) onlyOwner {
        objections[_paymentHash].getCompensation = true;
    }

    function setCompleted() onlyOwner {
        require(now > finalizedTime);
        completed = true;
    }

    function getObjectionablePaymentHashes() constant returns (bytes32[]) {
        return objectionablePaymentHashes;
    }

    function isSettle() constant returns (bool) {
        for (uint i = 0; i < objectionablePaymentHashes.length; i++) {
            if (objections[objectionablePaymentHashes[i]].objectionSuccess && !objections[objectionablePaymentHashes[i]].getCompensation) {
                return false;
            }
        }
        return true;
    }
}