'use strict';
module.exports = (sequelize, DataTypes) => {
  var asset_lists = sequelize.define('asset_lists', {
    asset_name: DataTypes.TEXT,
    asset_decimals: DataTypes.INTEGER,
    asset_address: DataTypes.TEXT
  }, {
    timestamps: false
  });
  asset_lists.associate = function(models) {
    // associations can be defined here
  };
  return asset_lists;
};