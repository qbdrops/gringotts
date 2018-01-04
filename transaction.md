## Transaction Content
- stageHash
- from
- to
- value
- lsn
- data
  - RSA public key (for content encryption)

## Transaction Hash
- txHash = hash(content)


## How to apply hash function to json content?
  - Now use `Json.stringify`, will use bytearray encoding in the future