'use strict';
module.exports = (sequelize, DataTypes) => {
  var assets = sequelize.define('assets', {
    balance: DataTypes.CHAR(64),
    asset_id: DataTypes.CHAR(64),
    address: DataTypes.TEXT,
    pre_gsn: DataTypes.NUMERIC,
  }, {
    timestamps: false
  });
  assets.associate = function(models) {
    // associations can be defined here
  };
  return assets;
};