'use strict';
module.exports = (sequelize, DataTypes) => {
  var receipts = sequelize.define('receipts', {
    gsn: DataTypes.CHAR(64),
    log_id: DataTypes.CHAR(64),
    stage_height: DataTypes.CHAR(64),
    light_tx_hash: DataTypes.CHAR(64),
    receipt_hash: DataTypes.CHAR(64),
    from: DataTypes.CHAR(64),
    to: DataTypes.CHAR(64),
    value: DataTypes.CHAR(64),
    fee: DataTypes.CHAR(64),
    asset_id: DataTypes.CHAR(64),
    onchain: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    data: DataTypes.JSON
  }, {
    timestamps: false
  });
  receipts.associate = function (models) {
    // associations can be defined here
  };
  return receipts;
};