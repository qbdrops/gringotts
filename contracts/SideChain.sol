pragma solidity ^0.4.15;

contract SideChain {
    bytes32 public sideChainRootHash;
    bytes32 public sideChainID;
    address public sideChainOwner;
    bool public completed;
    string public version = "0.2.0";

    uint public deposit = 100;
    uint public treeHeight;
    uint public obj_time;
    uint public exr_time;

    mapping (bytes32 => ObjectionInfo) public objections;
    bytes32[] public errorTIDs;

    mapping (uint => bytes32) public indexMerkleTree;
    mapping (uint => bytes32[]) public leafNodeData;

    event SideChainEvent(address indexed _owner, bytes32 indexed _scid, bytes4 _func);

    struct ObjectionInfo {
        address customer;
        bytes32 hashOfContent;
        bool objectionSuccess;
    }

    function SideChain(bytes32 scid, bytes32 rh, uint th, uint objection_time, uint exonerate_time) payable {
        require(msg.value >= (2 ** (th - 1)) * deposit);
        sideChainOwner = msg.sender;
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
        bytes32 s) returns (bool) {
        require (now < obj_time);
        require (inErrorTIDList(tid) == false);
        string memory str;
        str = strConcat(bytes32ToString(tid), bytes32ToString(scid));
        str = strConcat(str, bytes32ToString(content));
        bytes32 hashMsg = sha3(str);
        address signer = verify(hashMsg, v, r, s);
        require (signer == sideChainOwner);
        objections[tid] = ObjectionInfo(msg.sender, content, true);
        errorTIDs.push(tid);
        SideChainEvent(sideChainOwner, sideChainID, 0x7f2585d7);
        return true;
    }

    function verify(bytes32 _message, uint8 _v, bytes32 _r, bytes32 _s) constant returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = sha3(prefix, _message);
        address signer = ecrecover(prefixedHash, _v, _r, _s);
        return signer;
    }

    function strConcat(string _a, string _b) constant returns (string) {
        bytes memory bytes_a = bytes(_a);
        bytes memory bytes_b = bytes(_b);
        string memory length_ab = new string(bytes_a.length + bytes_b.length);
        bytes memory bytes_c = bytes(length_ab);
        uint k = 0;
        for (uint i = 0; i < bytes_a.length; i++) {bytes_c[k++] = bytes_a[i];}
        for (i = 0; i < bytes_b.length; i++) {bytes_c[k++] = bytes_b[i];}
        return string(bytes_c);
    }

    function uintToAscii(uint number) constant returns(byte) {
        if (number < 10) {
            return byte(48 + number);
        } else if (number < 16) {
            // asciicode a = 97 return 10
            return byte(87 + number);
        } else {
            revert();
        }
    }
    
    function asciiToUint(byte char) constant returns (uint) {
        uint asciiNum = uint(char);
        if (asciiNum > 47 && asciiNum < 58) {
            return asciiNum - 48;
        } else if (asciiNum > 96 && asciiNum < 103) {
            return asciiNum - 87;
        } else {
            revert();
        }
    }

    function stringToBytes32(string str) constant returns (bytes32) {
        bytes memory bString = bytes(str);
        uint uintString;
        if (bString.length != 64) { revert(); }
        for (uint i = 0; i < 64; i++) {
            uintString = uintString*16 + uint(asciiToUint(bString[i]));
        }
        return bytes32(uintString);
    }

    function bytes32ToString (bytes32 b32) constant returns (string) {
        bytes memory bytesString = new bytes(64);
        for (uint i = 0; i < 32; i++) {
            byte char = byte(bytes32(uint(b32) * 2 ** (8 * i)));
            bytesString[i*2+0] = uintToAscii(uint(char) / 16);
            bytesString[i*2+1] = uintToAscii(uint(char) % 16);
        }
        return string(bytesString);
    }

    function addressToString(address addr) constant returns (string) {
        bytes memory bytesString = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            byte char = byte(bytes20(uint(addr) * 2 ** (8 * i)));
            bytesString[i*2+0] = uintToAscii(uint(char) / 16);
            bytesString[i*2+1] = uintToAscii(uint(char) % 16);
        }
        return string(bytesString);
    }

    function hashOrder(uint idx) constant returns (uint[]) {
        uint[] memory order = new uint[](treeHeight);
        order[0] = idx;
        for(uint i = 1; i < treeHeight; i++) {
            order[i] = ((idx >> 1) << 1) + ((idx % 2) ^ 1);
            idx = idx >> 1;
        }
        return order;
    }

    function exonerate() returns (bool) {
        require (msg.sender == sideChainOwner);
        for (uint i = 0; i < errorTIDs.length; i++) {
            bytes32 tid = errorTIDs[i];
            uint[] memory idxs = new uint[](treeHeight);
            idxs = hashOrder(getObjectorNodeIndex(tid));
            bytes32 result = indexMerkelTree[idxs[0]];
            if(!inLFD(objector)) {continue;}
            for(uint j = 1; j < idxs.length; j++) {
                if (idxs[j] % 2 == 1) {
                    result = sha3(strConcat(bytes32ToString(result), bytes32ToString(indexMerkleTree[idxs[j]])));
                } else {
                    result = sha3(strConcat(bytes32ToString(indexMerkleTree[idxs[j]]), bytes32ToString(result)));
                }
            }
            if (result == sideChainRootHash) {
                objections[tid].objectionSuccess = false;
            }
        }
        return true;
    }

    function inLFD(bytes32 tid) constant returns (bool) {
        uint idx = getObjectorNodeIndex(tid);
        if (leafNodeData[idx].length < 2) {
            if (objections[tid].hashOfContent == leafNodeData[idx][0]) {
                return (indexMerkleTree[idx] == sha3(bytes32ToString(leafNodeData[idx][0])));
            }
            return false;
        } else {
            for (uint i = 0; i < leafNodeData[idx].length; i++) {
                if(objections[tid].hashOfContent == leafNodeData[idx][i]) {
                    string memory dataStr = bytes32ToString(leafNodeData[idx][0]);
                    for (uint j = 1; j < leafNodeData[idx].length; j++) {
                        dataStr = strConcat(dataStr, bytes32ToString(leafNodeData[idx][j]));
                    }
                    return (indexMerkleTree[idx] == sha3(dataStr));
                }
            }
            return false;
        }
    }

    function setIMT(uint[] idxs, bytes32[] nodeHash) returns (bool) {
        require (msg.sender == sideChainOwner);
        require (idxs.length == nodeHash.length);
        for (uint i = 0; i < idxs.length; i++) {
            indexMerkleTree[idxs[i]] = nodeHash[i];
        }
        SideChainEvent(sideChainOwner, sideChainID, 0x7b527e2f);
        return true;
    }

    function setLFD(uint[] idxs, bytes32[] lfd) returns (bool) {
        require (msg.sender == sideChainOwner);
        uint index_lfd = 0;
        for (uint i = 0; i < idxs.length; i += 2) {
            for (uint j = 0; j < idxs[i+1]; j++) {
                leafNodeData[idxs[i]].push(lfd[index_lfd + j]);
            }
            index_lfd += idxs[i+1];
        }
        SideChainEvent(sideChainOwner, sideChainID, 0xd8e820e8);
        return true;
    }

    function inErrorTIDList(bytes32 tid) constant returns (bool) {
        for (uint i = 0; i < errorTIDs.length; i++) {
            if (tid == errorTIDs[i]) {
                return true;
            }
        }
        return false;
    }

    function getObjectorNodeIndex(bytes32 tid) constant returns (uint) {
        return (uint(bytes6(tid)) % (2**(treeHeight-1))) + 2**(treeHeight-1);
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
