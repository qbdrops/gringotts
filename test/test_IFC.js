var IFC = artifacts.require('./IFC.sol');
var SideChain = artifacts.require('./SideChain.sol');
var scid = "0x63d7db5ce060b288ecf5390594d5969bc1a206ceeb24df31cffcc8876df5e44b",
	poe = '0x322e6f92b44ae32152e15f6d2f9469438c6bb353bdb6f2d220254bbd014f06bf',
	treeH = 3;

contract('SideChain', function(accounts) {
	var instance;

	it("construct test", function() {
		return SideChain.deployed().then(function(i) {
			instance = i;
			var getSCID;
			var getRootHash
			return instance.sideChainID();
		}).then(function(_scid) {
			getSCID = _scid;
			return instance.sideChainRootHash();
		}).then(function(_scrh) {
			getRootHash = _scrh;
			return instance.sideChainOwner();
		}).then(function(_scow) {

			assert.equal(getSCID, scid, "scid is not the same");
			assert.equal(getRootHash, poe, "roothash is not the same");
			assert.equal(_scow, accounts[0], "owner is not the same");
		});
	});

	it("strConcat test", function() {
		return instance.strConcat("abc", "def").then(function(result) {
			assert.equal(result, "abcdef", "strConcat failed");
		});
	});

	it("uintToAscii test", function() {
		var arrayA = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf];
		var arrayB = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];
		return arrayA.forEach(function(element, index) {
			instance.uintToAscii(element).then(function(result) {
				assert.equal(result, arrayB[index], "uintToAscii failed");
			});
		});
	});

	it("asciiToUint test", function() {
		var arrayA = [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf];
		var arrayB = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102];
		return arrayB.forEach(function(element, index) {
			instance.asciiToUint(element).then(function(result) {
				assert(result, arrayA[index], "asciiToUint failed");
			});
		});
	});

	it("stringToBytes32 test", function() {
		var strTest = "1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8";
		return instance.stringToBytes32(strTest).then(function(result) {
			assert(result, "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8", "stringToBytes32 failed");
		});
	});

	it("bytes32ToString test", function() {
		var strB32 = "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8";
		return instance.bytes32ToString(strB32).then(function(result) {
			assert(result, "1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8", "bytes32ToString failed");
		});
	});

	it("addressToString test", function() {
		var addrTest = "0xbced5c8042ae9b6362dce796bf33695fba205495";
		return instance.addressToString(addrTest).then(function(result) {
			assert(result, "bced5c8042ae9b6362dce796bf33695fba205495", "addressToString failed");
		});
	});
});

contract('IFC', function(accounts) {
    it('owner should be same as msg.sender', function() {
        return IFC.deployed().then(function(instance) {
            return instance.owner().then(function(owner) {
                assert.equal(accounts[0], owner, 'msg.sender wasn\'t the owner');
            });
        });
    });
});
