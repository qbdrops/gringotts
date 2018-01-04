## Transaction Content
- stageHash
- from
- to
- value
- localSequenceNumber
- data

```
//for example
{
    stageHash: "0xc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc6",
    from: "0x49aabbbe9141fe7a80804bdf01473e250a3414cb",
    to: "0x5b9688b5719f608f1cb20fdc59626e717fbeaa9a",
    value: 100,
    localSequenceNumber: 2,
    data: {
        type: "VISA",
        publicKey: ...,
        ...
    }
}
```

## Transaction Hash
- txHash = hash(content)


## How to apply hash function to json content?
  - Now use `Json.stringify`, will use bytearray encoding in the future