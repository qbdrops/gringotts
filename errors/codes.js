let Codes = {
  'OK': 0,
  'INSERT_FAIL': 1,
  'STAGE_HAS_BEEN_BUILT': 2,
  'CONTAINS_KNOWN_RECEIPT': 3,
  'WRONG_SIGNATURE': 4,
  'RECEIPTS_ARE_EMPTY': 5,
  'CONTAINS_INVALID_FORMAT_PAYMENT': 7,
  'CONTAINS_INVALID_PAYMENT_HASH': 8,
  'STAGE_IS_CURRENTLY_BUILDING': 9,
  'TARGET_ROOT_HASH_NOT_FOUND': 10,
  'CONTAINS_OVER_HEIGHT_RECEIPT': 11,
  'INSUFFICIENT_BALANCE': 12,
  'CONTAINS_KNOWN_LIGHT_TX': 13,
  'INVALID_LIGHT_TX_TYPE': 14,
  'CONTAINS_KNOWN_LOG_ID': 15,
  'WRONG_LOG_ID': 16,
  'WRONG_ASSET_ID': 17,
  'SOMETHING_WENT_WRONG': 100
};

module.exports = Codes;
