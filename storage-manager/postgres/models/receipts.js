'use strict';
module.exports = (sequelize, DataTypes) => {
  var receipts = sequelize.define('receipts', {
    light_tx_hash: DataTypes.CHAR(64),
    receipt_hash: DataTypes.CHAR(64),
    stage_height: DataTypes.CHAR(64),
    data: DataTypes.JSON
  }, {
    timestamps: false,
    defaultScope: {
      attributes: { exclude: ['id'] }
    }
  });
  receipts.associate = function(models) {
    // associations can be defined here
  };
  return receipts;
};