pragma solidity ^0.4.15;

import "./SideChainStandard.sol";

contract SideChainBlock {
    bytes32 public sideChainRootHash;
    bytes32 public sideChainID;
    address public sideChainOwner;
    address public sideChainTemplate;
    bool public completed;
    string public version = "0.2.0";

    uint public deposit = 100;
    uint public treeHeight;
    uint public obj_time;
    uint public exr_time;

    mapping (bytes32 => ObjectionInfo) public objections;
    bytes32[] public errorTIDs;
    mapping (uint => bytes32) public indexMerkleTree;
    mapping (uint => leafNodeData) public leafNode;

    bytes32[10] public list;

    event SideChainEvent(address indexed _owner, bytes32 indexed _scid, bytes4 _func);

    struct ObjectionInfo {
        address customer;
        bytes32 hashOfContent;
        bool objectionSuccess;
    }

    struct leafNodeData {
        uint dataLength;
        bytes32[10] data;
    }

    function SideChain(address _addr, bytes32 scid, bytes32 rh, uint th, uint objection_time, uint exonerate_time) payable {
        require(msg.value >= (2 ** (th - 1)) * deposit);
        sideChainOwner = msg.sender;
        sideChainTemplate = _addr;
        sideChainID = scid;
        sideChainRootHash = rh;
        treeHeight = th;
        completed = false;
        obj_time = now + objection_time;
        exr_time = obj_time + exonerate_time;
    }

    function takeObjection(
        bytes32 tid,
        bytes32 scid,
        bytes32 content,
        uint8 v,
        bytes32 r,
        bytes32 s) {
        require (now < obj_time);
        //require (inErrorTIDList(tid) == false);
        require(SideChainStandard(sideChainTemplate).inBytes32Array(tid, errorTIDs) == false);
        list[0] = tid;
        list[1] = scid;
        list[2] = content;
        bytes32 hashMsg = SideChainStandard(sideChainTemplate).hashArray(list, 3);
        address signer = SideChainStandard(sideChainTemplate).verify(hashMsg, v, r, s);
        require (signer == sideChainOwner);
        objections[tid] = ObjectionInfo(msg.sender, content, true);
        errorTIDs.push(tid);
        SideChainEvent(sideChainOwner, sideChainID, 0x7f2585d7);
    }

    function exonerate() {
        require (msg.sender == sideChainOwner);
        for (uint i = 0; i < errorTIDs.length; i++) {
            bytes32 tid = errorTIDs[i];
            uint idx = getObjectorNodeIndex(tid);
            bytes32 result = indexMerkleTree[idx];
            if (SideChainStandard(sideChainTemplate).inBytes32Array10(objections[tid].hashOfContent, leafNode[idx].data) != true) {
                continue;
            }
            if (result != SideChainStandard(sideChainTemplate).hashArray(leafNode[idx].data, leafNode[idx].dataLength)) {
                continue;
            }
            while (idx > 1) {
                list[idx % 2] = result;
                list[(idx % 2) ^ 1] = indexMerkleTree[getSibling(idx)];
                result = SideChainStandard(sideChainTemplate).hashArray(list, 2);
                idx = idx >> 1;
            }
            if (result == sideChainRootHash) {
                objections[tid].objectionSuccess = false;
            }
        }
        SideChainEvent(sideChainOwner, sideChainID, 0x01490ac1);
    }

    function setting(uint[] IMTidx, bytes32[] IMTnodeHash, uint[] LFDidx, bytes32[] lfd) {
        require (msg.sender == sideChainOwner);
        require (IMTidx.length == IMTnodeHash.length);
        for (uint i = 0; i < IMTidx.length; i++) {
            indexMerkleTree[IMTidx[i]] = IMTnodeHash[i];
        }
        uint index_lfd = 0;
        for (i = 0; i < LFDidx.length; i += 2) {
            leafNode[LFDidx[i]].dataLength = LFDidx[i+1];
            for (uint j = 0; j < LFDidx[i+1]; j++) {
                leafNode[LFDidx[i]].data[j] = lfd[index_lfd + j];
            }
            index_lfd += LFDidx[i+1];
        }
        SideChainEvent(sideChainOwner, sideChainID, 0x9d630d23);
    }

    function getObjectorNodeIndex(bytes32 tid) constant returns (uint) {
        return (uint(bytes6(tid)) % (2**(treeHeight-1))) + 2**(treeHeight-1);
    }

    function getSibling(uint idx) constant returns (uint) {
        return ((idx >> 1) << 1) + ((idx % 2) ^ 1);
    }

    function judge() {
        require (exr_time < now && completed == false);
        for (uint i = 0; i < errorTIDs.length; i++) {
            bytes32 tid = errorTIDs[i];
            if (objections[tid].objectionSuccess) {
                objections[tid].customer.transfer(deposit);
            }
        }
        sideChainOwner.transfer(this.balance);
        completed = true;
    }
}
