pragma solidity ^0.4.13;

contract SideChain {
    bytes32 public sideChainRootHash;
    bytes32 public sideChainID;
    address public sideChainOwner;
    bool public completed;

    uint deposit = 100;
    uint treeHeight;
    uint expire;

    mapping (address => ObjectionInfo) objections;
    address[] objectors;

    mapping (uint => bytes32) indexMerkelTree;
    mapping (uint => bytes32[]) leafNodeData;

    struct ObjectionInfo {
        bytes32 hashOfTID;
        bytes32 hashOfContent;
        bool objectionSuccess;
    }

    function SideChain(bytes32 scid, bytes32 rh, uint th) payable {
        require(msg.value >= (2 ** (th - 1)) * deposit);
        sideChainOwner = msg.sender;
        sideChainID = scid;
        sideChainRootHash = rh;
        treeHeight = th;
        completed = false;
        expire = now + 1 days; 
    }

    function takeObjection(
        bytes32 tid,
        bytes32 scid,
        bytes32 content,
        uint8 v,
        bytes32 r,
        bytes32 s) returns (bool) {
        if (now + 1 hours > expire) { revert(); }
        string memory str;
        str = strConcat(bytes32ToString(tid), bytes32ToString(scid));
        str = strConcat(str, bytes32ToString(content));
        bytes32 hashMsg = sha3(str);
        address signer = verify(hashMsg, v, r, s);
        if (signer != sideChainOwner) { return false; }
        objections[msg.sender] = ObjectionInfo(tid, content, true);
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

    function hashOrder(uint idx) constant returns (uint[]) {
        uint[] memory order = new uint[](treeHeight);
        order[0] = ((idx >> 1) << 1);
        for(uint i = 1; i < treeHeight; i++) {
            order[i] = ((idx >> 1) << 1) + ((idx % 2) ^ 1);
            idx = idx >> 1;
        }
        return order;
    }

    function exonerate() returns (bool) {
        if (msg.sender != sideChainOwner) {
            return false;
        }
        for (uint i = 0; i < objectors.length; i++) {
            address objector = objectors[i];
            uint[] memory idxs = new uint[](treeHeight);
            idxs = hashOrder(getObjectorNodeIndex(objector));
            bytes32 result = indexMerkelTree[idxs[0]];
            require(inLFD(objector));
            for(uint j = 1; j < idxs.length; j++) {
                result = sha3(strConcat(bytes32ToString(result), bytes32ToString(indexMerkelTree[idxs[j]])));
            }
            if (result == sideChainRootHash) {
                objections[objector].objectionSuccess = false;
            }
        }
        return true;
    }

    function inLFD(address objector) constant returns (bool) {
        uint num = getObjectorNodeIndex(objector); 
        if (leafNodeData[num].length < 2) {
            if (objections[objector].hashOfContent == leafNodeData[num][0]) {
                return (indexMerkelTree[num] == sha3(bytes32ToString(leafNodeData[num][0])));
            }
            return false;
        } else {
            for (uint i = 0; i < leafNodeData[num].length; i++) {
                if(objections[objector].hashOfContent == leafNodeData[num][i]) {
                    string memory dataStr = bytes32ToString(leafNodeData[num][0]);
                    for (uint j = 1; j < leafNodeData[num].length; j++) {
                        dataStr = strConcat(dataStr, bytes32ToString(leafNodeData[num][j]));
                    }
                    return (indexMerkelTree[num] == sha3(dataStr));
                }
            }
            return false;
        }
    }

    function setIMT(uint[] idxs, bytes32[] nodeHash) returns (bool) {
        if (msg.sender != sideChainOwner) { return false; }
        if(idxs.length != nodeHash.length) {revert();}
        for (uint i = 0; i < idxs.length; i++) {
            indexMerkelTree[idxs[i]] = nodeHash[i];
        }
        return true;
    }

    function setLFD(uint[] idxs, bytes32[] lfd) returns (bool) {
        uint index_lfd = 0;
        for (uint i = 0; i < idxs.length; i += 2) {
            for (uint j = 0; j < idxs[i+1]; j++) {
                leafNodeData[idxs[i]].push(lfd[index_lfd + j]);
            }
            index_lfd += idxs[i+1];
        }
    }

    function isObjector(address objector) constant returns (bool) {
        for (uint i = 0; i < objectors.length; i++) {
            if (objector == objectors[i]) {
                return true;
            }
        }
        return false;
    }

    function getObjectorsNumber() constant returns (uint) {
        return objectors.length;
    }

    function getObjectionAddress(uint idx) constant returns (address) {
        if (idx >= objectors.length) {
            revert();
        } else {
            return objectors[idx];
        }
    }

    function getObjectorNodeIndex(address objector) constant returns (uint) {
        return (uint(bytes6(objections[objector].hashOfTID)) % (2**(treeHeight-1))) + 2**(treeHeight-1);
    }

    function getIndexMerkelTree(uint idx) constant returns (bytes32) {
        return indexMerkelTree[idx];
    }

    function getLFD(uint idx) constant returns (bytes32[]) {
        return leafNodeData[idx];
    }

    function getObjectionResult(address objector) constant returns (bool) {
        if (!isObjector(objector)) { revert(); }
        return objections[objector].objectionSuccess;
    }

    function judge() {
        if (expire == 0 || expire > now || completed == true) {
            revert();
        } else {
            for (uint i = 0; i < objectors.length; i++) {
                address objector = objectors[i];
                if (objections[objector].objectionSuccess) {
                    objector.transfer(deposit);
                }
            }
            sideChainOwner.transfer(this.balance);
            completed = true;
        }
    }
}
