# Gringotts API
Total api amount: 16

1. get:/balance/:address
2. get:/slice/:stageHeight/:receiptHash
3. get:/accounts/:stageHeight
4. get:/receipts/:stageHeight
5. get:/receipt/:lightTxHash
6. get:/receipt_by_gsn/:GSN
7. get:/personalreceipt/:address
8. post:/send/light_tx
9. get:/roothash/:stageHeight
10. get:/trees/:stageHeight
11. get:/booster/address
12. get:/server/address
13. get:/pending/receipts
14. get:/assetlist
15. post:/attach //for testing only
16. post:/finalize' //for testing only


## 1. get balance by address
Gets balances of the given address. If with a given assetID, gets balance of the given adress and assetID.

**URL** : `/balance/:address`

**Method** : `GET`

**Auth required** : NO

**Permissions require** : NO

**URL constraints**

```
address: string
```

**URL example**: 

```
/balance/49aabbbe9141fe7a80804bdf01473e250a3414cb
```

**Data constraints** : Data type is required to be json format.

```
{
	assetID: string
}
```

**Data example** All fields must be sent.

```json
{
	"assetID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

### Success Response

**Condition** : If everything is OK and without a given assetID.

**Content example**

The balances of all kinds of assets in the given address.
```json
[
    {
        "assetID": "0000000000000000000000000000000000000000000000000000000000000000",
        "balance": "1000000000000000000"
    }, 
    {
        "assetID": "0000000000000000000000000000000000000000000000000000000000000001",
        "balance": "2000000000000000000"
    }
]
```

### Or

**Condition** : If everything is OK and with a given assetID.

**Content example**

The balance of the given asset in the given address.
```json
{
    "balance": "1000000000000000000"
}
```

### Error Responses

**Condition** : Parameter address is missing.

**Code** : `400`

**Content example**

```json
{
    "errors": "Parameter address is missing."
}
```

### Or

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "errors": ""
}
```

## 2. get slice by stage height and receipt hash
Gets slice by receipt hash in a specific stage.

**URL** : `/slice/:stageHeight/:receiptHash`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
stageHeight: int, 
receiptHash: string
```

**URL example**: 

```
/slice/1/e7038f0d8a1f767c351a9ac745ae0d8a7949945dbec48fa35d44e8131564606f
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "ok": true,
    "slice": {
        "slice": [
            {
                "treeNodeIndex": 14,
                "treeNodeHash": "92449b6004bb1d302969cb4bdbc40fced78332be641e3fd8986d0b02a98ce3ed"
            },
            {
                "treeNodeIndex": 15,
                "treeNodeHash": "91f16db6d8df44c5c9fec697549c95597389a1543f8ac315aa2c840bff03e512"
            },
            {
                "treeNodeIndex": 6,
                "treeNodeHash": "efb0f41875522caa3c1ad563489abd4bfe32633a8142a1a45abbcc6013b05d64"
            },
            {
                "treeNodeIndex": 2,
                "treeNodeHash": "0038011b09e0d7b018da8c6208bcab26da59740861d14564e56cf865a91f8011"
            }
        ],
        "receiptHashArray": [
            "cefa3ac4eb500f52f940f1bcfba0b47d4a1b16fa75b8c7bd417980bfddf11b36",
            "e7038f0d8a1f767c351a9ac745ae0d8a7949945dbec48fa35d44e8131564606f"
        ]
    }
}
```

### Error Responses

**Condition** : Other errors.

**Content example** :

```json
{
    "ok": false
    "message": ""
}
```

## 3. get accounts by stage height
Get balances of all addresses of the given stage.

**URL** : `/accounts/:stageHeight`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
stageHeight: int
```

**URL example**: 

```
/accounts/1
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "0000000000000000000000000000000000000000000000000000000000000001": {
        "0000000000000000000000000000000000000000000000000000000000000000": "000000000000000000000000000000000000000000000000002386f26fc10000",
        "0000000000000000000000006365433bf804808045adda28b2f719f90e87a013": "000000000000000000000000000000000000000000000000002386f26fc10000"
    },
    "0000000000000000000000002acc0478a1d650a75181c15ec06454253f946c2f": {
        "0000000000000000000000000000000000000000000000000000000000000000": "00000000000000000000000000000000000000000000000035f880e52b7e8000",
        "0000000000000000000000006365433bf804808045adda28b2f719f90e87a013": "00000000000000000000000000000000000000000000043b102b824794c48000"
    }
}
```

### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "ok": false
    "errors": ""
}
```

## 4. get receipts by stage height
Gets all receipts in the given stage. If with a given address, gets all receipts of the given address in the given stage.

**URL** : `/receipts/:stageHeight`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
stageHeight: int
```

**URL example**: 

```
/receipts/1
```

**Data constraints** : Data type is required to be json format.

```
{
    address: string
}
```

**Data example** All fields must be sent.

```json
{
    "address": "2acc0478a1d650a75181c15ec06454253f946c2f"
}
```

### Success Response

**Condition** : If everything is OK and without a given address.

**Content example**

All receipts in the given stage.
```json
[
    {
        "lightTxHash": "43c46e6810a8de157c3e1c6f957683ffccb08c2a521b1f54c2994cea9a7fc6df",
        "lightTxData": {
            "from": "0000000000000000000000002acc0478a1d650a75181c15ec06454253f946c2f",
            "to": "0000000000000000000000000000000000000000000000000000000000000001",
            "assetID": "0000000000000000000000006365433bf804808045adda28b2f719f90e87a013",
            "value": "000000000000000000000000000000000000000000000000002386f26fc10000",
            "fee": "00000000000000000000000000000000000000000000000000038d7ea4c68000",
            "nonce": "b266e33a8973959c2b309939905041fdc5e3d26d3a0f693f646dd2ad92611cec",
            "logID": "0000000000000000000000000000000000000000000000000000000000000000",
            "clientMetadataHash": "84d414da05f8d746a6f31c26d68329af947ae2e07ccfb8814ad5092cd739a71f"
        },
        "receiptHash": "cd4df618832a61cf7319d7fc30fd54b8df938188d8194378aac678ee9268a92f",
        "receiptData": {
            "stageHeight": "0000000000000000000000000000000000000000000000000000000000000001",
            "GSN": "0000000000000000000000000000000000000000000000000000000000000007",
            "fromPreGSN": "0000000000000000000000000000000000000000000000000000000000000005",
            "toPreGSN": "0000000000000000000000000000000000000000000000000000000000000000",
            "lightTxHash": "43c46e6810a8de157c3e1c6f957683ffccb08c2a521b1f54c2994cea9a7fc6df",
            "fromBalance": "00000000000000000000000000000000000000000000043c25b9c850a8948000",
            "toBalance": "000000000000000000000000000000000000000000000000002386f26fc10000",
            "serverMetadataHash": "3ab1135759cc9ffe1bdd27d66ef0876d6f06c58f2c07a9c8783e0936de5abdc3"
        },
        "sig": {
            "clientLightTx": {
                "r": "0x4734317b5f548342ce6e367860c5dfd81e0b9748ce3a3a1f950b9f8a5144398a",
                "s": "0x352ce4725b0a9ed9d7a3f3ae448683d45d630e244ccdcfb48fab66219c36b0d4",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "serverLightTx": {
                "r": "0x4734317b5f548342ce6e367860c5dfd81e0b9748ce3a3a1f950b9f8a5144398a",
                "s": "0x352ce4725b0a9ed9d7a3f3ae448683d45d630e244ccdcfb48fab66219c36b0d4",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "boosterReceipt": {
                "r": "0x7d72c1e5afd172693c77e048062badcd6c6ad373231c05b6d2e8b560fa73cc8d",
                "s": "0x5fc7aaf43d639edc291480cc8e216b7a542ef533586d3fa342d93cf97b994306",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            }
        },
        "metadata": {
            "client": "11111",
            "server": "{\"a\":111}"
        }
    },
    {...}
]
```

### Or

**Condition** : If everything is OK and with a given address.

**Content example**

All receipts of the given address in the given stage.
```json
[
    {
        "lightTxHash": "43c46e6810a8de157c3e1c6f957683ffccb08c2a521b1f54c2994cea9a7fc6df",
        "lightTxData": {
            "from": "0000000000000000000000002acc0478a1d650a75181c15ec06454253f946c2f",
            "to": "0000000000000000000000000000000000000000000000000000000000000001",
            "assetID": "0000000000000000000000006365433bf804808045adda28b2f719f90e87a013",
            "value": "000000000000000000000000000000000000000000000000002386f26fc10000",
            "fee": "00000000000000000000000000000000000000000000000000038d7ea4c68000",
            "nonce": "b266e33a8973959c2b309939905041fdc5e3d26d3a0f693f646dd2ad92611cec",
            "logID": "0000000000000000000000000000000000000000000000000000000000000000",
            "clientMetadataHash": "84d414da05f8d746a6f31c26d68329af947ae2e07ccfb8814ad5092cd739a71f"
        },
        "receiptHash": "cd4df618832a61cf7319d7fc30fd54b8df938188d8194378aac678ee9268a92f",
        "receiptData": {
            "stageHeight": "0000000000000000000000000000000000000000000000000000000000000001",
            "GSN": "0000000000000000000000000000000000000000000000000000000000000007",
            "fromPreGSN": "0000000000000000000000000000000000000000000000000000000000000005",
            "toPreGSN": "0000000000000000000000000000000000000000000000000000000000000000",
            "lightTxHash": "43c46e6810a8de157c3e1c6f957683ffccb08c2a521b1f54c2994cea9a7fc6df",
            "fromBalance": "00000000000000000000000000000000000000000000043c25b9c850a8948000",
            "toBalance": "000000000000000000000000000000000000000000000000002386f26fc10000",
            "serverMetadataHash": "3ab1135759cc9ffe1bdd27d66ef0876d6f06c58f2c07a9c8783e0936de5abdc3"
        },
        "sig": {
            "clientLightTx": {
                "r": "0x4734317b5f548342ce6e367860c5dfd81e0b9748ce3a3a1f950b9f8a5144398a",
                "s": "0x352ce4725b0a9ed9d7a3f3ae448683d45d630e244ccdcfb48fab66219c36b0d4",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "serverLightTx": {
                "r": "0x4734317b5f548342ce6e367860c5dfd81e0b9748ce3a3a1f950b9f8a5144398a",
                "s": "0x352ce4725b0a9ed9d7a3f3ae448683d45d630e244ccdcfb48fab66219c36b0d4",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "boosterReceipt": {
                "r": "0x7d72c1e5afd172693c77e048062badcd6c6ad373231c05b6d2e8b560fa73cc8d",
                "s": "0x5fc7aaf43d639edc291480cc8e216b7a542ef533586d3fa342d93cf97b994306",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            }
        },
        "metadata": {
            "client": "11111",
            "server": "{\"a\":111}"
        }
    },
    {...}
]
```


### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "ok": false
    "errors": "
}
```

## 5. get receipt by lightTxHash
Get the receipt of a light transaction by its light transaction hash.

**URL** : `/receipt/:lightTxHash`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
lightTxHash: string
```

**URL example**: 

```
/receipt/bda3a6cf1e606a300961c6a852ca8a938361219175bf1b4813253c9d97ba107b
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "id": "9",
    "gsn": "0000000000000000000000000000000000000000000000000000000000000009",
    "log_id": "69fcba47f45d93e7442ad09c68bd30c36ad4f272665f42e24be98b82bc472702",
    "stage_height": "0000000000000000000000000000000000000000000000000000000000000001",
    "light_tx_hash": "bda3a6cf1e606a300961c6a852ca8a938361219175bf1b4813253c9d97ba107b",
    "receipt_hash": "e7038f0d8a1f767c351a9ac745ae0d8a7949945dbec48fa35d44e8131564606f",
    "from": "0000000000000000000000002acc0478a1d650a75181c15ec06454253f946c2f",
    "to": "0000000000000000000000000000000000000000000000000000000000000000",
    "value": "000000000000000000000000000000000000000000000001158e460913d00000",
    "fee": "0000000000000000000000000000000000000000000000000000000000000000",
    "asset_id": "0000000000000000000000006365433bf804808045adda28b2f719f90e87a013",
    "onchain": true,
    "data": {
        "lightTxHash": "bda3a6cf1e606a300961c6a852ca8a938361219175bf1b4813253c9d97ba107b",
        "lightTxData": {
            "from": "0000000000000000000000002acc0478a1d650a75181c15ec06454253f946c2f",
            "to": "0000000000000000000000000000000000000000000000000000000000000000",
            "assetID": "0000000000000000000000006365433bf804808045adda28b2f719f90e87a013",
            "value": "000000000000000000000000000000000000000000000001158e460913d00000",
            "fee": "0000000000000000000000000000000000000000000000000000000000000000",
            "nonce": "5d62feb6228595df90ef18dc7cf18e4b6a18c035ab7f78bcc6f05d51cde45c96",
            "logID": "69fcba47f45d93e7442ad09c68bd30c36ad4f272665f42e24be98b82bc472702",
            "clientMetadataHash": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        },
        "receiptHash": "e7038f0d8a1f767c351a9ac745ae0d8a7949945dbec48fa35d44e8131564606f",
        "receiptData": {
            "stageHeight": "0000000000000000000000000000000000000000000000000000000000000001",
            "GSN": "0000000000000000000000000000000000000000000000000000000000000009",
            "fromPreGSN": "0000000000000000000000000000000000000000000000000000000000000007",
            "toPreGSN": "0000000000000000000000000000000000000000000000000000000000000000",
            "lightTxHash": "bda3a6cf1e606a300961c6a852ca8a938361219175bf1b4813253c9d97ba107b",
            "fromBalance": "00000000000000000000000000000000000000000000043b102b824794c48000",
            "toBalance": "0000000000000000000000000000000000000000000000000000000000000000",
            "serverMetadataHash": "3ab1135759cc9ffe1bdd27d66ef0876d6f06c58f2c07a9c8783e0936de5abdc3"
        },
        "sig": {
            "clientLightTx": {
                "r": "0x41e519ed95ae8e39a2aba623411d91bd9a4cc04d5b4a20c2cf0fd7a184999dd4",
                "s": "0x40d1ea80f9564bb8873246228701a8cf36d88abcb1c1e7be4035c993a552e317",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "serverLightTx": {
                "r": "0x41e519ed95ae8e39a2aba623411d91bd9a4cc04d5b4a20c2cf0fd7a184999dd4",
                "s": "0x40d1ea80f9564bb8873246228701a8cf36d88abcb1c1e7be4035c993a552e317",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "boosterReceipt": {
                "r": "0x5146933e0ebd05392e260c4b3816eac565096b240bca4aae1f63ce3378b551b7",
                "s": "0x02cd03151675b6cee44eca2935c5d5e33b2865ea26738821457def3014497c2e",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            }
        },
        "metadata": {
            "client": "",
            "server": "{\"a\":111}"
        }
    }
}
```

### Error Responses

**Condition** : The receipt can not be found.

**Code** : `404`

**Content example**

```json
{
    "ok": false
    "errors": "Not found"
}
```

### Or

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "ok": false
    "errors": ""
}
```

## 6. get receipt by gsn
Get the receipt of a given gsn

**URL** : `/receipt_by_gsn/:GSN`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
GSN: int
```

**URL example**: 

```
/receipt_by_gsn/19
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "id": "25",
    "gsn": "0000000000000000000000000000000000000000000000000000000000000019",
    "log_id": "0000000000000000000000000000000000000000000000000000000000000000",
    "stage_height": "0000000000000000000000000000000000000000000000000000000000000004",
    "light_tx_hash": "cce06b6867fb8d3d126e53361e78c2978a3a2d1dd711e00703b68ddad7515ff4",
    "receipt_hash": "83785021d968cc7024cc71f99a3b501adfb2a24645a1f6f6d05c3e104fdfcd1b",
    "from": "0000000000000000000000005aca469494fe25977b81b954ae84f55cf8bf3d63",
    "to": "0000000000000000000000005aca469494fe25977b81b954ae84f55cf8bf3d63",
    "value": "0000000000000000000000000000000000000000000000000000000000000000",
    "fee": "0000000000000000000000000000000000000000000000000000000000000000",
    "asset_id": "0000000000000000000000000000000000000000000000000000000000000000",
    "onchain": true,
    "data": {
        "lightTxHash": "cce06b6867fb8d3d126e53361e78c2978a3a2d1dd711e00703b68ddad7515ff4",
        "lightTxData": {
            "from": "0000000000000000000000005aca469494fe25977b81b954ae84f55cf8bf3d63",
            "to": "0000000000000000000000005aca469494fe25977b81b954ae84f55cf8bf3d63",
            "assetID": "0000000000000000000000000000000000000000000000000000000000000000",
            "value": "0000000000000000000000000000000000000000000000000000000000000000",
            "fee": "0000000000000000000000000000000000000000000000000000000000000000",
            "nonce": "fa3318b3a6413cfecb48d4c97870cdac7a862bebe0b8f4f53101f60513a5ef27",
            "logID": "0000000000000000000000000000000000000000000000000000000000000000",
            "clientMetadataHash": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        },
        "receiptHash": "83785021d968cc7024cc71f99a3b501adfb2a24645a1f6f6d05c3e104fdfcd1b",
        "receiptData": {
            "stageHeight": "0000000000000000000000000000000000000000000000000000000000000004",
            "GSN": "0000000000000000000000000000000000000000000000000000000000000019",
            "fromPreGSN": "000000000000000000000000000000000000000000000000000000000000000a",
            "toPreGSN": "0000000000000000000000000000000000000000000000000000000000000019",
            "lightTxHash": "cce06b6867fb8d3d126e53361e78c2978a3a2d1dd711e00703b68ddad7515ff4",
            "fromBalance": "0000000000000000000000000000000000000000000000000000000000000000",
            "toBalance": "0000000000000000000000000000000000000000000000000000000000000000",
            "serverMetadataHash": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        },
        "sig": {
            "clientLightTx": {
                "r": "0x4b6e96685e394546c1c42b0ddb92d94eadf0e85d6a09ea8c1fc72cd1952e6bfa",
                "s": "0x6ac4c9b33b176d5bef997d81b332a6257d854f6bd293dc27f6961a40b1cb2511",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001c"
            },
            "serverLightTx": {
                "r": "0x148a4008d5a9d6eaf357d6d76b01b39f2292a293de93db2bad6ccc6325341ba7",
                "s": "0x10406ddf4e894ddced51f1eb4cf48b53bc083fb57c2da7a03ffaf7161d4b7aa0",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "boosterReceipt": {
                "r": "0x2061ca57c4502c400836b11dd3f0a60771cd92be4226b6f52039e0d9c505cd6f",
                "s": "0x18d8d139716ecf9382264dab8f2d4e6c2ee5da3de2e0566e605c7c7a91e0797d",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            }
        },
        "metadata": {
            "client": "",
            "server": ""
        }
    }
}
```

### Error Responses

**Condition** : The receipt can not be found.

**Code** : `404`

**Content example** :
```json
{
    "ok": false
    "errors": "Not found"
}
```

### Or

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "ok": false
    "erros": ""
}
```

## 7. get receipts by address
Get receipts of an address.

**URL** : `/personalreceipt/:address`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
address: string
```

**URL example**: 

```
/personalreceipt/2acc0478a1d650a75181c15ec06454253f946c2f
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
[
    {
        "lightTxHash": "e8b4eee3bded9f95a05dfb81596a04149336953beb8eb4700e82c4741baea053",
        "lightTxData": {
            "from": "0000000000000000000000000000000000000000000000000000000000000000",
            "to": "0000000000000000000000002acc0478a1d650a75181c15ec06454253f946c2f",
            "assetID": "0000000000000000000000000000000000000000000000000000000000000000",
            "value": "000000000000000000000000000000000000000000000000d02ab486cedc0000",
            "fee": "0000000000000000000000000000000000000000000000000000000000000000",
            "nonce": "12098b63accb517efd6caac8723b2d15a9990a654ed88b7339101fff2567a9a5",
            "logID": "0000000000000000000000000000000000000000000000000000000000000001",
            "clientMetadataHash": "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
        },
        "receiptHash": "06a232123eeab9f9fcffdd1ecd286633e7a6268fb4a57f232a579d3736c7f4f9",
        "receiptData": {
            "stageHeight": "0000000000000000000000000000000000000000000000000000000000000001",
            "GSN": "0000000000000000000000000000000000000000000000000000000000000001",
            "fromPreGSN": "0000000000000000000000000000000000000000000000000000000000000000",
            "toPreGSN": "0000000000000000000000000000000000000000000000000000000000000000",
            "lightTxHash": "e8b4eee3bded9f95a05dfb81596a04149336953beb8eb4700e82c4741baea053",
            "fromBalance": "0000000000000000000000000000000000000000000000000000000000000000",
            "toBalance": "000000000000000000000000000000000000000000000000d02ab486cedc0000",
            "serverMetadataHash": "3ab1135759cc9ffe1bdd27d66ef0876d6f06c58f2c07a9c8783e0936de5abdc3"
        },
        "sig": {
            "clientLightTx": {
                "r": "0x37ae0b4833e13a41d2fa125214d0d182396b3ff28447148337349191f34ec525",
                "s": "0x50d342d96d0437ee1b3042dc0a8cdbfa9091720bf5d8471cb102400330c7ae96",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "serverLightTx": {
                "r": "0x37ae0b4833e13a41d2fa125214d0d182396b3ff28447148337349191f34ec525",
                "s": "0x50d342d96d0437ee1b3042dc0a8cdbfa9091720bf5d8471cb102400330c7ae96",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001b"
            },
            "boosterReceipt": {
                "r": "0x5b2ac700ae58dcb6334144b2b4dbb03a0cac846d348b6db47705b8c513ca45ed",
                "s": "0x7e0bb596f479d4ae03f95212fff44038091a41386341b6a2458988ecde1ea7cf",
                "v": "0x000000000000000000000000000000000000000000000000000000000000001c"
            }
        },
        "metadata": {
            "client": "",
            "server": "{\"a\":111}"
        }
    }
]
```

### Error Responses

**Condition** : Parameter address is missing.

**Code** : `400`

**Content example**

```json
{
    "errors": "Parameter address is missing."
}
```

### Or

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "ok": false
    "message": ""
    "errors": "",
    "code": 100
}
```


## 8. send light transacton
Send a signed light transaction and get its receipt.

**URL** : `/send/light_tx`

**Method** : `POST`

**Auth required** : NO

**Permissions required** : NO

**Data constraints** : Data type is required to be json format.

```
LightTransaction {
    lightTxData: {
        from: 'address',
        to: 'address',
        assetID: 'assetID',
        value: 'value',
        fee: 'fee',
        nonce: 'random number',
        logID: DSN / WSN / 0,
        clientMetadataHash: 'string'
    },
    sig: {
        clientLightTx: {
            r: 'r',
            s: 's',
            v: 'v'
        },
        serverLightTx: {
            r: 'r',
            s: 's',
            v: 'v'
        },
    },
    lightTxHash: 'lightTxHash',
    metadata: {
    	client:'string',
        server:'string'
    }
}
```

**Data example** All fields must be sent.

```json
LightTransaction {
  lightTxHash: 'cf8f03c0609356713583cadff189f88577fd78f9149af8791e003fecd5a16414',
  lightTxData:
   { from: '000000000000000000000000e422277c7333020f8dd254b7e8bdfb63c83465be',
     to: '0000000000000000000000004d8a4d6f40fe89843d60f0fe4d85defa900f720c',
     assetID: '0000000000000000000000000000000000000000000000000000000000000000',
     value: '000000000000000000000000000000000000000000000000001ff973cafa8000',
     fee: '00000000000000000000000000000000000000000000000000038d7ea4c68000',
     nonce: '06ec684903c0effa9c8a3b078911e714ab447bc93fd0d6ac2f853322470c6484',
     logID: '0000000000000000000000000000000000000000000000000000000000000000',
     clientMetadataHash: '84d414da05f8d746a6f31c26d68329af947ae2e07ccfb8814ad5092cd739a71f' },
  sig:
   { clientLightTx:
      { r: '0x1646d89c52451912da681292ea7dc6884a8fda34c9968aee83bdfc6cd2efda77',
        s: '0x79a8d6b615b1dca03b00bcd7b8964c3311ffa57c6e040fe1f1ab27e7ef39e9f8',
        v: '0x000000000000000000000000000000000000000000000000000000000000001c' },
     serverLightTx:
      { r: '0xa84875dc02071ef4eb294b929d0d2fe732e9735951993467cdab1dd9352937f5',
        s: '0x4c07f5230c42ff9f97316d85887f3c67a35d55c3e502511bfc9cdb0fe8d1075e',
        v: '0x000000000000000000000000000000000000000000000000000000000000001c' } },
  metadata: { client: '11111', server: 'add by server' } }
```

### Success Response

**Condition** : If everything is OK and server available.

**Content example**

```json
Receipt {
  lightTxHash: 'cf8f03c0609356713583cadff189f88577fd78f9149af8791e003fecd5a16414',
  lightTxData:
   { from: '000000000000000000000000e422277c7333020f8dd254b7e8bdfb63c83465be',
     to: '0000000000000000000000004d8a4d6f40fe89843d60f0fe4d85defa900f720c',
     assetID: '0000000000000000000000000000000000000000000000000000000000000000',
     value: '000000000000000000000000000000000000000000000000001ff973cafa8000',
     fee: '00000000000000000000000000000000000000000000000000038d7ea4c68000',
     nonce: '06ec684903c0effa9c8a3b078911e714ab447bc93fd0d6ac2f853322470c6484',
     logID: '0000000000000000000000000000000000000000000000000000000000000000',
     clientMetadataHash: '84d414da05f8d746a6f31c26d68329af947ae2e07ccfb8814ad5092cd739a71f' },
  receiptHash: 'b1835cade3e161c56c3f26b0960a62e73acf172f28a51e8205fc05d1e93dc239',
  receiptData:
   { stageHeight: '0000000000000000000000000000000000000000000000000000000000000006',
     GSN: '000000000000000000000000000000000000000000000000000000000000005c',
     fromPreGSN: '0000000000000000000000000000000000000000000000000000000000000057',
     toPreGSN: '0000000000000000000000000000000000000000000000000000000000000059',
     lightTxHash: 'cf8f03c0609356713583cadff189f88577fd78f9149af8791e003fecd5a16414',
     fromBalance: '000000000000000000000000000000000000000000000000006a94d74f430000',
     toBalance: '00000000000000000000000000000000000000000000000001351609ff758000',
     serverMetadataHash: 'c304cb0194cad2a3d2c3264ee52e6325fb4cc5a8966f947ea88e8b7992de2686' },
  sig:
   { clientLightTx:
      { r: '0x1646d89c52451912da681292ea7dc6884a8fda34c9968aee83bdfc6cd2efda77',
        s: '0x79a8d6b615b1dca03b00bcd7b8964c3311ffa57c6e040fe1f1ab27e7ef39e9f8',
        v: '0x000000000000000000000000000000000000000000000000000000000000001c' },
     serverLightTx:
      { r: '0xa84875dc02071ef4eb294b929d0d2fe732e9735951993467cdab1dd9352937f5',
        s: '0x4c07f5230c42ff9f97316d85887f3c67a35d55c3e502511bfc9cdb0fe8d1075e',
        v: '0x000000000000000000000000000000000000000000000000000000000000001c' },
     boosterReceipt:
      { r: '0x14fb404b27caa6a672680d3fa4edf79c9f7d037bd556f349d6dee04a38819e24',
        s: '0x2a90d803970294f815a4bd813dc2f084062dfc5352a81e3e4905c2451a5dd4bc',
        v: '0x000000000000000000000000000000000000000000000000000000000000001c' } },
  metadata: { client: '11111', server: 'add by server' } }
```

### Error Responses

**Condition** : If fields has wrong format or miss fields.

**Content example** :
```json
{
    "ok": false
    "message": ""
    "code": ""
}
```

### Or

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "ok": false
    "message": ""
    "errors": ""
    "code": 100
}
```

## 9. get root hash by stage height
Get root hash of receipt tree and account balance tree of a given stage.

**URL** : `/roothash/:stageHeight`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
stageHeight: int
```

**URL example**: 

```
/roothash/1
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "ok": true,
    "receiptRootHash": "efad11b76f9cf535899501a99df5a1a09c6f89ae223c5fd0f39c2d0a626a9ed0",
    "accountRootHash": "cb14fcc3931625250c1252b33b5c150e30e13350af47aa38607425d8a9fe63ce"
}
```

### Error Responses

**Condition** : If stage height does not exist.

**Content example** :
```json
{
    "ok": false
    "message": "StageHeight does not exist."
}
```

### Or

**Condition** : Other errors

**Content example** :

```json
{
    "ok": false
    "message": ""
}
```

## 10. get trees by stage height
Get the receipt tree and the account tree of a given stage.

**URL** : `/trees/:stageHeight`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints**

```
stageHeight: int
```

**URL example**: 

```
/trees/1
```

### Success Response

**Condition** : If everything is OK and server available.

**Content example**

```json
{
    "ok": true,
    "receiptTree": {
        "stageHeight": 1,
        "leafElements": [
            "0ea9b3c0ded1fa93f0a13a0ea25a795a1edf5d47259ca6b9bb17b9ec73591b33",
            "42e19370b36ba26ef1bd098ed8b2dd7e04de014620256958c9e67ec1c5f719c4",
            "4fa6dd812b363eae272a232be8725765a35843851e9a805da83fee78ee406bbb",
            "ea7aedc9f34b23769f9f7cefd09310f78e6048ae218c92d95e33a517dc794817",
            "0e20ece72d7fa84efd190c58d03c6868be31c9fd77573c64d1842a7b7c9aadb4",
            "eb462d04dfba60d86740591d9ebcc5844ee223734aa45c04f17d3639ba519dad",
            "527a6cea251ebb3096bdf74acf86858a800d2474a1c0eaed82f35abf10a52e43",
            "2eb93d11fefca30dda3b6f9e4a31b590976f3aef2c844bc4a75809eebc7f2b6d",
            "0924409166c14c885795856962ddfda05e588aaf0e1c3a3e1be6dbde60b15e5d"
        ],
        "treeHeight": 4,
        "emptyNodeHash": "f4915122cc2b3d2dae9e7d77a78c2eb0cef7b55de5c725eea56e2027332489e1",
        "treeNodes": [
            {
                "treeNodeIndex": 8,
                "treeNodeHash": "f4915122cc2b3d2dae9e7d77a78c2eb0cef7b55de5c725eea56e2027332489e1",
                "treeNodeElements": []
            },
            {
                "treeNodeIndex": 9,
                "treeNodeHash": "f4915122cc2b3d2dae9e7d77a78c2eb0cef7b55de5c725eea56e2027332489e1",
                "treeNodeElements": []
            },
            {
                "treeNodeIndex": 10,
                "treeNodeHash": "f4915122cc2b3d2dae9e7d77a78c2eb0cef7b55de5c725eea56e2027332489e1",
                "treeNodeElements": []
            },
            {
                "treeNodeIndex": 11,
                "treeNodeHash": "fff96ef673031987366f2c9690edb5b8479a0a6abb3709bc520c798009c34b06",
                "treeNodeElements": [
                    "42e19370b36ba26ef1bd098ed8b2dd7e04de014620256958c9e67ec1c5f719c4"
                ]
            },
            {
                "treeNodeIndex": 12,
                "treeNodeHash": "f4915122cc2b3d2dae9e7d77a78c2eb0cef7b55de5c725eea56e2027332489e1",
                "treeNodeElements": []
            },
            {
                "treeNodeIndex": 13,
                "treeNodeHash": "21ce601d97ed4de5117df697035ba1efeb5139cecca88720879ec179df6348eb",
                "treeNodeElements": [
                    "527a6cea251ebb3096bdf74acf86858a800d2474a1c0eaed82f35abf10a52e43"
                ]
            },
            {
                "treeNodeIndex": 14,
                "treeNodeHash": "cf2688c332b10d80b580b651867148db76aa5f3ea8444011ccbb6302f44545c8",
                "treeNodeElements": [
                    "0e20ece72d7fa84efd190c58d03c6868be31c9fd77573c64d1842a7b7c9aadb4",
                    "0ea9b3c0ded1fa93f0a13a0ea25a795a1edf5d47259ca6b9bb17b9ec73591b33",
                    "2eb93d11fefca30dda3b6f9e4a31b590976f3aef2c844bc4a75809eebc7f2b6d",
                    "4fa6dd812b363eae272a232be8725765a35843851e9a805da83fee78ee406bbb",
                    "ea7aedc9f34b23769f9f7cefd09310f78e6048ae218c92d95e33a517dc794817",
                    "eb462d04dfba60d86740591d9ebcc5844ee223734aa45c04f17d3639ba519dad"
                ]
            },
            {
                "treeNodeIndex": 15,
                "treeNodeHash": "ccab261942ef3813440102568c4c5af40d0af69d773c2ff4d673aa7f370b01e3",
                "treeNodeElements": [
                    "0924409166c14c885795856962ddfda05e588aaf0e1c3a3e1be6dbde60b15e5d"
                ]
            },
            {
                "treeNodeIndex": 4,
                "treeNodeHash": "7e61347ec07753f909ad97df2c4d6ee835159d07b41c565ac1ee03e5732618d6"
            },
            {
                "treeNodeIndex": 5,
                "treeNodeHash": "9eb97d6a6521ba72ea37088c1670fed56dc8cab41cab7cf8583bd7afbfb4f18a"
            },
            {
                "treeNodeIndex": 6,
                "treeNodeHash": "2a37e6cde4c270bcf3cdcd6bdbc4cbf298a71edb23f6c3d54b8709c0daad3a4a"
            },
            {
                "treeNodeIndex": 7,
                "treeNodeHash": "2caeaf432051e1f5256a9b228261159350f68dcb385e8c809c71a14b005d49f3"
            },
            {
                "treeNodeIndex": 2,
                "treeNodeHash": "d168cda1adf0c4d0a14cedbbec549f772e5019e8b21c7a4bb689394c48d7ae7f"
            },
            {
                "treeNodeIndex": 3,
                "treeNodeHash": "9d742f3390871f01648f6c742f55654ed4b1fe22c38217651b12f40bbf7a5fe2"
            },
            {
                "treeNodeIndex": 1,
                "treeNodeHash": "493629520cc028f23871905b88f10db5d4e174fc3608790b0d80ab7d7345f4df"
            }
        ],
        "rootHash": "efad11b76f9cf535899501a99df5a1a09c6f89ae223c5fd0f39c2d0a626a9ed0"
    },
    "accountTree": {
        "stageHeight": 1,
        "leafElements": [
            "43889633f1482f08ad039a6ea7f952d2122c028dbd7ca59fc96657480502b86b",
            "a03067cc8943906056c8404b00f31c0a6ba59641044a109f135527d279c465b1"
        ],
        "treeHeight": 2,
        "emptyNodeHash": "f4915122cc2b3d2dae9e7d77a78c2eb0cef7b55de5c725eea56e2027332489e1",
        "treeNodes": [
            {
                "treeNodeIndex": 2,
                "treeNodeHash": "8ec029a2153a47acde10c1c4c50a8980c54d35ca7c3cc66d2641e1b7f9c97a5d",
                "treeNodeElements": [
                    "a03067cc8943906056c8404b00f31c0a6ba59641044a109f135527d279c465b1"
                ]
            },
            {
                "treeNodeIndex": 3,
                "treeNodeHash": "52583c8aaedb4dcc33fecd470ebb629c24f073014d107767ecf846445600a8bc",
                "treeNodeElements": [
                    "43889633f1482f08ad039a6ea7f952d2122c028dbd7ca59fc96657480502b86b"
                ]
            },
            {
                "treeNodeIndex": 1,
                "treeNodeHash": "7c00af6ab68239437b18951bf7da6c79e0142637a7667820843a00a69e275011"
            }
        ],
        "rootHash": "cb14fcc3931625250c1252b33b5c150e30e13350af47aa38607425d8a9fe63ce"
    }
}
```

### Error Responses

**Condition** : If the given stage height does not exist.

**Content example** :
```json
{
    "ok": false
    "message": "StageHeight does not exist."
}
```

### Or

**Condition** : Other errors

**Content example**

```json
{
    "ok": false
    "message": ""
}
```

## 11. get booster address
Get the address of booster.

**URL** : `/booster/address`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints** : None

**URL example**: 

```
/booster/address
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "contractAddress": "0xf4C990a6c7B4ee6f16E8964Fd732e7B23BC35254",
    "accountAddress": "0x5aca469494fe25977b81b954ae84f55cf8bf3d63"
}
```

### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "errors": ""
}
```

## 12. get server address
Get the address of server.

**URL** : `/server/address`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints** : None

**URL example**: 

```
/server/address
```


### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "address": "0x2acc0478a1d650a75181c15ec06454253f946c2f"
}
```

### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "errors": ""
}
```

## 13. get lightTxHashes of pending receipts
Gets light transactions hashes of the receipts which do not be attached yet.

**URL** : `/pending/receipts`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints** : None

**URL example**: 

```
/pending/receipts
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "lightTxHashes": [
        "2ffb69b6ff198846bb26dfc6faefe03cd637b00e45edab3d31146a6790ffbedb",
        "4e97848c6b5333f224e123c91aabcd3159ad9908eb3a952062ab4c216cc495be",
        "312b5a43976f81a27b44a8d8e8a005c979eb5da0c177f7495e46088fa0fda08c",
        "1c885edef8607375cf8802912ce1581811daf2f9302180ac3cec2aa6820a2175",
        "0c056e9b774fc0840e20c3390281d0bf5265c0de786a3f64d31c636f5f5d0bbf",
        "61855da97e40e33c85ffef2f0de5fb2b7932c69244661d4ee08f92785e7bebff",
        "3b0cf70c8ff3636ba98bf303014b8f0ed147f732a96e386677df75b20c470da8",
        "f8ea751707a6143fb3f7b2568d95b67625e2c3b72da4ec45c98af595306f5b24",
        "87f225a2159720695a4691ee79a2fe7788ea40cf783d7e4fbd77ff3408104ead",
        "d2170e55d80bdd8ffd7aab727456fb5ee7182d1a8c29db3f109b8d225630dde9",
        "3cc1657fb8520783c1d9479ce49a04ee9b715db5fb44eec3cc84185cefac2712",
        "757424a9582ce0090cc27663546ab795e6cdf6fead8917a5d5d7a5743bf74ad3",
        "a325491fb8ee1bc01dec63b7cce4f3bf104639ae644e71d7f2feb40c50fb4958",
        "17dfd84d54f616293cef6d32fb83b04bf5912afecb276d340f3227f4555a8792",
        "14e8fae83d8959581f2b40d10e10e7333027dc41641e997def703fe1ed65f66c",
        "848b1ce9631b15b4490386a5b4b43244f8f47399482207715bf9f77ffcacb3d4",
        "b79bb562e9977faa5c81e0fbd7f129523f076cb3dc8c6834816d304e2dde2ece",
        "a893f17226fc6eace8f00f65f9165d0ceef3ab9f9199c051875951fbfc74cf54",
        "4e73b3c00c5c9bf466dd5a2b15ebca8eaf359a7ccba515bc1fac4948569f1111",
        "168cc49cf0ef799fae36e16d6759d94a19852087d2d6b2260a356d8592ce096b",
        "a8633c0f8749a6438254792d1283437199254c97e7606b46376312d8b58a8919",
        "eed3a44d3db92a6173ea723e0f429c49ce10417fc251d2ba0a580edd7a8a3fbb",
        "34e4238c9f1ced839cebcb9aad997d9feeb3b201458710a568934fa8a12de1dc",
        "6b5c457d4897847a96bc0d5296ec455f584aeae0dd73da7ac679f6d1a9d4beff",
        "edb24b9011ccd6801526d24ce2a35545a1c99b0ab08a39ede2f7f9981b217531",
        "41dee53cd20f6800b86b3fb683184fa523f821fbed9991d6cee5b5543df7cb4f",
        "f84203b1d15dc35472a214b596832b1524f4f7148c38dea1096016497f84c174",
        "fe706a7419a635ac716253441c30c936442136cb738cc3e88ed24eebc27ce1af",
        "a4d6d7d9c4f3705bfc6469df582b78d51ba5c2834a6d2d38ed7b0079744aaf68",
        "9193fb0fa57549face506226141ac45424e2b5ff45fa70a6cf0fdd12a51f4deb",
        "2e6ac2af48bcdb46f8fe8c8ca26f15ff26ede6682bf210dff313975832f2175e",
        "8ae614c14aed546c62addca8a9e324a97cd7533bce12266906c99e5422944b00",
        "6b2705a37b97ab98b67a84de68f8ddc9b79c63a08af4d6e979846d47026d7220",
        "4bd7ed20eacb0fe54d472f8e05a6b97c4fd50658742ebce8a40fcaeeb7e3cfef",
        "20b7d4c1f65381b980a03df84800b51ed524e8767a72830aaad70c5e5471d2d1",
        "63f9b245ec4aa5fce575c82a87370557dc8fb6a39e1812dbf0d855f999bfc8ae",
        "cf8f8a3423504f2880a34eb452e3d186d21b3d012e9f8c2f8e84a2fc69881ace",
        "11fb52ced9a326161fa3ebafdcf38b80e2a310af65e54c7391e081c0dc4e8cb8",
        "69c88dbb066b03e0026cc209378974a040a2cbc7b4d89157c77e28e9c3ebb1c0",
        "7b6cafb76445858745dff5c32439f83eff1f1cff696c34a2f820b91750cbdd97",
        "68d44b6039e41dd302e9e20ecf3ffddb84605d1fbf9d28460f4c354533aa6b70",
        "c648e2f9fe7d157b0b87bf5f9dc84bca112ff069c71ae05f8f538a3395507322",
        "4ca340ee1443c2c4bbbd7917b0bc9d5dd021215af1ec7002a6c05956ff985952",
        "b1835cade3e161c56c3f26b0960a62e73acf172f28a51e8205fc05d1e93dc239"
    ]
}
```

### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "errors": ""
}
```

## 14. get asset list
Get the asset list of booster.

**URL** : `/assetlist`

**Method** : `GET`

**Auth required** : NO

**Permissions required** : NO

**URL constraints** : None

**URL example**: 

```
/assetlist
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "assetList": [
        {
            "asset_name": "ETH",
            "asset_decimals": 18,
            "asset_address": "0x0000000000000000000000000000000000000000"
        },
        {
            "asset_name": "TWX",
            "asset_decimals": 18,
            "asset_address": "0xC770eBd70E73718477b3bef1D7e39D746a82DB8b"
        }
    ]
}
```

### Error Responses

**Condition** : Other errors.

**Code** : `500`

**Content example**

```json
{
    "errors": ""
}
```

## 15 Attach
Build acocunt tree and balance tree.
Then make an onchain transation to record root hashes in its metadata and return its transaction hash.

**URL** : `/attach`

**Method** : `POST`

**Auth required** : NO

**Permissions required** : NO

**URL constraints** : None

**URL example**: 

```
/attach
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "ok": true,
    "txHash": "0x9ef03bc478635a9813a19124a6b4bb5b7398db37c1db1104d0f70e9ecb9419fc"
}
```

### Error Responses

**Condition** : If fields has wrong format or miss fields.

**Content example**

```json
{
    "ok": false
    "message": ""
    "code": ""
}
```

### Or

**Condition** : Other errors.

**Content example**

```json
{
    "ok": false
    "errors": ""
    "code": 100
}
```

## 16 Finalize
Make an onchain transaction that sets the status of the last attached stage to finalized if the queue of challenge events is empty.

**URL** : `/finalize`

**Method** : `POST`

**Auth required** : NO

**Permissions required** : NO

**URL constraints** : None

**URL example**: 

```
/attach
```

### Success Response

**Condition** : If everything is OK.

**Content example**

```json
{
    "ok": true,
    "receipt": {
        "blockHash": "0x07594b750a09e89e1b0d706a14c18c546dfcfd331f0f5bb9cb129547dc156039",
        "blockNumber": 19840,
        "contractAddress": null,
        "cumulativeGasUsed": 46073,
        "from": "0x5aca469494fe25977b81b954ae84f55cf8bf3d63",
        "gasUsed": 46073,
        "logs": [
            {
                "address": "0xECa0cDb712fE98d531AD2B46f082f8a96bFDB84b",
                "topics": [
                    "0x77c643d25f7c215ad526c62f54de5b4860469185a9024199efc6a3696ee8cfb0"
                ],
                "data": "0x0000000000000000000000000000000000000000000000000000000000000001",
                "blockNumber": 19840,
                "transactionHash": "0xc0d35c87bb46870583b74802aaac94cc3ecf87b2136322efc5b4e973cb328590",
                "transactionIndex": 0,
                "blockHash": "0x07594b750a09e89e1b0d706a14c18c546dfcfd331f0f5bb9cb129547dc156039",
                "logIndex": 0,
                "removed": false,
                "id": "log_1a45d528"
            }
        ],
        "logsBloom": "0x00040000000000000020000000000000000040000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000",
        "status": "0x1",
        "to": "0xeca0cdb712fe98d531ad2b46f082f8a96bfdb84b",
        "transactionHash": "0xc0d35c87bb46870583b74802aaac94cc3ecf87b2136322efc5b4e973cb328590",
        "transactionIndex": 0
    }
}
```

### Error Responses

**Condition** : Finalize failed

**Content example**

```json
{
    "ok": false
    "errors": "Finalize failed."
    "code": 100
}
```
### Or

**Condition** : Other errors

**Content example**

```json
{
    "ok": false
    "errors": ""
    "code": 100
}
```


