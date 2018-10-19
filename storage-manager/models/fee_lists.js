'use strict';
module.exports = (sequelize, DataTypes) => {
  var fee_lists = sequelize.define('fee_lists', {
    stage_height: DataTypes.CHAR(64),
    asset_id: DataTypes.CHAR(64),
    fee: DataTypes.CHAR(64)
  }, {
    timestamps: false
  });
  fee_lists.associate = function(models) {
    // associations can be defined here
  };
  return fee_lists;
};