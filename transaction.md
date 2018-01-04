## Transaction
- stageHash
- txHash
- rawTx

## rawTx
- from
- to
- value
- localSequenceNumber
- stageHeight
- data

```
//for example
{
    request:{
        "stageHash": "0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6",
        "txHash": "0x6e7f1007bfb89f5af93fb9498fda2e9ca727166ccabd3a7109fa83e9d46d3f1a",
        "tx": {
            "from": "0x49aabbbe9141fe7a80804bdf01473e250a3414cb",
            "to": "0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a",
            "value": 100,
            "stageHeight": 1
            "localSequenceNumber": 2,
            "data": {
                // follow description_file's format and rule
                "type": "VISA",
                "publicKey": ...,
                ...
            }
        },
        "sig": {  
            // sign(sha3(stageHash+txHash))
            v: 28,
            r: "0x384f9cb16fe9333e44b4ea8bba8cb4cb7cf910252e32014397c73aff5f94480c",
            s: "0x55305fc94b234c21d0025a8bce1fc20dbc7a83b48a66abc3cfbfdbc0a28c5709"
        }
    }
}
```

## Transaction Hash
- txHash = hash(encrypt_user(rawTx) + encrypt_cp(rawTx))

## How to apply hash function to json content?
  - Now use `Json.stringify`, will use bytearray encoding in the future