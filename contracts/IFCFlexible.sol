pragma solidity ^0.4.13;

import "./Stage.sol";
import "./SidechainLibrary.sol";

contract IFCFlexible {
    address public owner; // The agent service
    address public lib;
    uint public stageHeight;
    mapping (bytes32 => address) public stageAddress;
    bytes32[] public stages;
    uint compensation;
    string public version = "1.0.1";

    event AddNewStage(bytes32 indexed _stageHash, address _stageAddress, bytes32 _rootHash);
    event TakeObjection(bytes32 indexed _stageHash, bytes32 _paymentHash);
    event Exonerate(bytes32 indexed _stageHash, bytes32 _paymentHash);
    event Finalize(bytes32 indexed _stageHash);

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    function IFCFlexible(uint _compensation) payable {
        owner = msg.sender;
        lib = new SidechainLibrary();
        // initial stage
        address newStage = new Stage(0x0, 0x0, 0x0, 0, 0, 'initial block');
        stageAddress[0x0] = newStage;
        stages.push(0x0);
        compensation = _compensation;
    }

    function() payable {}

    function addNewStage(
        bytes32 _stageHash,
        bytes32 _rootHash,
        uint _objectionTimePeriod,
        uint _finalizedTimePeriod,
        string _data
    ) 
        onlyOwner 
    {
        // require(Stage(stageAddress[stages[stages.length - 1]]).completed());
        address newStage = new Stage(_stageHash, _rootHash, lib, _objectionTimePeriod, _finalizedTimePeriod, _data);
        stageAddress[_stageHash] = newStage;
        stages.push(_stageHash);
        stageHeight += 1;
        AddNewStage(_stageHash, newStage, _rootHash);
    }

    function getStageAddress(bytes32 _stageHash) constant returns (address) {
        return stageAddress[_stageHash];
    }

    function takeObjection(
        bytes32[] agentResponse,
        //agentResponse[0] = _stageHash,
        //agentResponse[1] = _paymentHash,
        uint8 v,
        bytes32 r,
        bytes32 s)
    {
        require (agentResponse.length == 2);
        bytes32 hashMsg = SidechainLibrary(lib).hashArray(agentResponse);
        address signer = SidechainLibrary(lib).verify(hashMsg, v, r, s);
        require (signer == owner);
        Stage(stageAddress[agentResponse[0]]).addObjectionablePaymentHash(agentResponse[1], msg.sender);
        TakeObjection(agentResponse[0], agentResponse[1]);
    }

    function exonerate(bytes32 _stageHash, bytes32 _paymentHash, uint _idx, bytes32[] slice, bytes32[] leaf) onlyOwner {
        bytes32 hashResult;
        require (SidechainLibrary(lib).inBytes32Array(_paymentHash, leaf));
        // content is in leaf array
        hashResult = SidechainLibrary(lib).hashArray(leaf);
        require (hashResult == slice[0]);
        // hash (content concat) = first node (or second one) hash in slice
        hashResult = SidechainLibrary(lib).calculateSliceRootHash(_idx, slice);
        require (hashResult == Stage(stageAddress[_stageHash]).rootHash());
        Stage(stageAddress[_stageHash]).resolveObjections(_paymentHash);
        Exonerate(_stageHash, _paymentHash);
    }

    function payPenalty(bytes32 _stageHash, bytes32[] paymentHashes) onlyOwner {
        address customer;
        bool objectionSuccess;
        bool getCompensation;
        for (uint i = 0; i < paymentHashes.length; i++) {
            (customer, objectionSuccess, getCompensation) = Stage(stageAddress[_stageHash]).objections(paymentHashes[i]);
            if (objectionSuccess && !getCompensation) {
                customer.transfer(compensation);
                Stage(stageAddress[_stageHash]).resolveCompensation(paymentHashes[i]);
            }
        }
    }

    function finalize(bytes32 _stageHash) onlyOwner {
        require(Stage(stageAddress[_stageHash]).isSettle());
        Stage(stageAddress[_stageHash]).setCompleted();
        Finalize(_stageHash);
    }
}
