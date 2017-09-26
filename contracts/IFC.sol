pragma solidity ^0.4.13;

contract IFC {
    // owner is the agent
    address public owner;
    // root hash of the transaction tree
    bytes32 public proofOfExistence;
    // hash of the transaction group id
    bytes32 public hashOfTGID;
    address[] public objectionAddress;
    bytes32[] indexMerkelTree;
    uint deposit;
    uint treeHeight;
    uint start;

    function IFC(bytes32 tgid, bytes32 poe, uint dps, uint th) {
        owner = msg.sender;
        hashOfTGID = tgid;
        proofOfExistence = poe;
        deposit = dps;
        treeHeight = th;
        start = now;
    }

    function takeObjection(string tgid) payable returns (bool) {
        if (msg.value < deposit || sha3(tgid) != hashOfTGID) {
            return false;
        }
        objectionAddress.push(msg.sender);
        return true;
    }

    function verify(bytes32 _message, uint8 _v, bytes32 _r, bytes32 _s) constant returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = sha3(prefix, _message);
        address signer = ecrecover(prefixedHash, _v, _r, _s);
        return signer;
    }

    function concat(string _a, string _b) constant returns (string) {
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

    function hashStringToIMT(string a){
        bytes memory b = bytes(a);
        uint hashUint;
        uint hashNum = b.length/64;
        for(uint i = 0; i < hashNum; i++){
            hashUint = 0;
            for(uint j = 64*i ; j < 64*(i+1); j++){
                hashUint = uint(hashUint)*16 + uint(asciiToUint(b[j]));
            }
            indexMerkelTree.push(bytes32(hashUint));
        }
    }

    function bytes32ToString (bytes32 data) constant returns (string) {
        bytes memory bytesString = new bytes(64);
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(data) * 2 ** (8 * j)));
            bytesString[j*2+0] = uintToAscii(uint(char) / 16);
            bytesString[j*2+1] = uintToAscii(uint(char) % 16);
        }
        return string(bytesString);
    }

    function isEqualToRootHash() constant returns (bool) {
        string memory hashMsg;
        hashMsg = bytes32ToString(indexMerkelTree[0]);
        for (uint i = 1; i < treeHeight; i++) {
            hashMsg = bytes32ToString(sha3(concat(hashMsg, bytes32ToString(indexMerkelTree[i]))));
        }
        return (sha3(hashMsg) == sha3(bytes32ToString(proofOfExistence)));
    }

    function setIMT(bytes32 hashMsg, uint8 v, bytes32 r, bytes32 s, string hashConcatString) returns (bool) {
        if (sha3(hashConcatString) != hashMsg) {
            return false;
        }
        if (!isInObjection(msg.sender)) {
            return false;
        }
        address verifySigner = verify(hashMsg, v, r, s);
        if (verifySigner != owner) {
            return false;
        }
        hashStringToIMT(hashConcatString);
        return true;
    }

    function isInObjection(address consumer) constant returns (bool) {
        for (uint i = 0; i < objectionAddress.length; i++) {
            if (consumer == objectionAddress[i]) {
                return true;
            }
        }
        return false;
    }

    function getObjectionAddress(uint idx) constant returns (address) {
        if (idx >= objectionAddress.length) {
            revert();
        } else {
            return objectionAddress[idx];
        }
    }

    function getIndexMerkelTree(uint idx) constant returns (bytes32) {
        if (idx >= indexMerkelTree.length) {
            revert();
        } else {
            return indexMerkelTree[idx];
        }
    }
    // After one day, agent can get his deposit back
    function refund() {
        if (start + 1 days < now) {
            revert();
        } else {
            selfdestruct(owner);
        }
    }
}
