pragma solidity ^0.4.13;

contract SideChain {
    // owner is the agent
    address public owner;
    // root hash of the transaction tree
    bytes32 public proofOfExistence;

    uint depositPerTx = 100;
    uint treeHeight = 3;
    uint refundExpire;
    bool public judgeFinish;

    mapping (address => ObjectionInfo) objections;
    address[] public objectors;

    mapping (uint => bytes32) indexMerkelTree;

    struct ObjectionInfo {
        bytes32 hashOfReq;
        bytes32 TID;
        bytes32 SCID;
        bytes32 hashOfReceipt;
        bool objectionSuccess;
    }

    function SideChain(bytes32 poe) payable {
        uint transactions = 2**(treeHeight - 1);
        if (msg.value != (transactions*depositPerTx)) {
            revert();
        }
        owner = msg.sender;
        proofOfExistence = poe;
        refundExpire = now + 1 days;
        judgeFinish = false;
    }

    function takeObjection(
        bytes32 hq, // hash of request
        bytes32 tid,
        bytes32 scid,
        string receipt,
        uint8 v,
        bytes32 r,
        bytes32 s) payable returns (bool) {
        // if objection time is expire
        if (now + 1 hours > refundExpire) { revert(); }
        string memory str;
        str = strConcat(bytes32ToString(hq), bytes32ToString(tid));
        str = strConcat(str, bytes32ToString(scid));
        str = strConcat(str, bytes32ToString(sha3(receipt)));
        bytes32 hashMsg = sha3(str);
        address signer = verify(hashMsg, v, r, s);
        if (signer != owner) { return false; }
        objections[msg.sender] = ObjectionInfo(hq, tid, scid, sha3(receipt), true);
        objectors.push(msg.sender);
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

    function hashOrder(address objector) constant returns (uint[]) {
        uint[] memory order = new uint[](treeHeight);
        string memory uid = addressToString(objector);
        string memory tid = bytes32ToString(objections[objector].TID);
        uint idx  = uint(bytes6(sha3(strConcat(uid,tid)))) % (2**(treeHeight-1));
        order[0] = 2**(treeHeight-1) + idx;
        for(uint i = 1; i < treeHeight; i++) {
            order[i] = 2**(treeHeight-i) + ((idx >> 1) << 1) + ((idx % 2) ^ 1);
            idx = idx >> 1;
        }
        return order;
    }

    function exonerate() returns (bool) {
        if (msg.sender != owner) {
            return false;
        }
        for (uint i = 0; i < objectors.length; i++) {
            address objector = objectors[i];
            uint[] memory idxs = new uint[](treeHeight);
            idxs = hashOrder(objector);
            bytes32 result = indexMerkelTree[idxs[0]];
            for(uint j = 1; j < idxs.length; j++) {
                result = sha3(strConcat(bytes32ToString(result), bytes32ToString(indexMerkelTree[idxs[j]])));
            }
            if (result == proofOfExistence) {
                objections[objector].objectionSuccess = false;
            }
        }
        return true;
    }

    function setIMT(uint[] idxs, bytes32[] nodeHash) returns (bool) {
        if (msg.sender != owner) { return false; }
        if(idxs.length != nodeHash.length) {revert();}
        for (uint i = 0; i < idxs.length; i++) {
            indexMerkelTree[idxs[i]] = nodeHash[i];
        }
        return true;
    }

    function isObjector(address objector) constant returns (bool) {
        for (uint i = 0; i < objectors.length; i++) {
            if (objector == objectors[i]) {
                return true;
            }
        }
        return false;
    }

    function getObjectionAddress(uint idx) constant returns (address) {
        if (idx >= objectors.length) {
            revert();
        } else {
            return objectors[idx];
        }
    }

    function getIndexMerkelTree(uint idx) constant returns (bytes32) {
        return indexMerkelTree[idx];
    }

    function getObjectionResult(address objector) constant returns (bool) {
        if (!isObjector(objector)) { revert(); }
        return objections[objector].objectionSuccess;
    }

    // After one day, agent can get his deposit back
    function judge() {
        if (refundExpire > now || judgeFinish == true) {
            revert();
        } else {
            for (uint i = 0; i < objectors.length; i++) {
                address objector = objectors[i];
                if (objections[objector].objectionSuccess) {
                    objector.transfer(depositPerTx);
                }
            }
            owner.transfer(this.balance);
            judgeFinish = true;
        }
    }
}
