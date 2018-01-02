pragma solidity ^0.4.15;

contract SidechainLibrary{
    string public version = "1.0.0";

    function inBytes32Array(bytes32 data, bytes32[] dataArray) constant returns (bool){
        for (uint i = 0; i < dataArray.length; i++) {
            if (data == dataArray[i]) {
                return true;
            }
        }
        return false;
    }

    function hashArray(bytes32[] dataArray) constant returns (bytes32) {
        require(dataArray.length > 0);
        string memory str = bytes32ToString(dataArray[0]);
        for (uint i = 1; i < dataArray.length; i++) {
            str = strConcat(str, bytes32ToString(dataArray[i]));
        }
        return sha3(str);
    }

    function calculateSliceRootHash(uint idx, bytes32[] slice) constant returns (bytes32) {
        require(slice.length > 0);
        bytes32 rootHash = slice[0];
        string memory str;
        for (uint i = 1; i < slice.length; i++) {
            str = bytes32ToString(rootHash);
            if (idx % 2 == 0) {
                str = strConcat(str, bytes32ToString(slice[i]));
            } else {
                str = strConcat(bytes32ToString(slice[i]), str);
            }
            rootHash = sha3(str);
            idx = idx >> 1;
        }
        return rootHash;
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

    function bytes32ToString (bytes32 b32) constant returns (string) {
        bytes memory bytesString = new bytes(64);
        for (uint i = 0; i < 32; i++) {
            byte char = byte(bytes32(uint(b32) * 2 ** (8 * i)));
            bytesString[i*2+0] = uintToAscii(uint(char) / 16);
            bytesString[i*2+1] = uintToAscii(uint(char) % 16);
        }
        return string(bytesString);
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

    function verify(bytes32 _message, uint8 _v, bytes32 _r, bytes32 _s) constant returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = sha3(prefix, _message);
        address signer = ecrecover(prefixedHash, _v, _r, _s);
        return signer;
    }
}
