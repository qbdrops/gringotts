pragma solidity ^0.4.15;

contract ScTmp {
    function inBytes32Array(bytes32 data, bytes32[] dataArray) constant returns (bool);
    function hashArray(bytes32[10] dataArray, uint num) constant returns (bytes32);
    function verify(bytes32 _message, uint8 _v, bytes32 _r, bytes32 _s) constant returns (address);
}