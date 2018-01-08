## Raw Transaction
- from
- to
- value
- localSequenceNumber
- stageHeight
- data

## Transaction Hash
```javascript
let rawTransaction = {
  from: '0x49aabbbe9141fe7a80804bdf01473e250a3414cb',
  to: '0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a',
  value: 100,
  localSequenceNumer: 99,
  stageHeight: 3,
  data: {
    foo: 'bar'
  }
}

let cipherUser = encrypt_user(rawTransaction)
let cipherCP = encrypt_cp(rawTransaction)
let txHash = sha_3(cipherUser + cipherCP)
```

## Transaction
- stageHash
- stageHeight
- txHash
- cipherUser
- cipherCP
- r
- s
- v

```javascript
{
    tx: {
        stageHeight: 3,
        stageHash: '0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6',
        txHash: '0x6e7f1007bfb89f5af93fb9498fda2e9ca727166ccabd3a7109fa83e9d46d3f1a',
        cipherUser: 'blahblah',
        cipherCP: 'blahblah'
        v: 28,
        r: '0x384f9cb16fe9333e44b4ea8bba8cb4cb7cf910252e32014397c73aff5f94480c',
        s: '0x55305fc94b234c21d0025a8bce1fc20dbc7a83b48a66abc3cfbfdbc0a28c5709'
    }
}
```

## How to apply hash function to json content?
  - Now use `Json.stringify`, will use bytearray encoding in the future