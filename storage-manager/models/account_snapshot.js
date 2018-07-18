'use strict';
module.exports = (sequelize, DataTypes) => {
  var trees = sequelize.define('account_snapshot', {
    stage_height: DataTypes.CHAR(64),
    account_data: DataTypes.JSON,
    asset_roothash: DataTypes.JSON
  }, {
    timestamps: false,
    tableName: 'account_snapshot'
  });
  trees.associate = function (models) {
    // associations can be defined here
  };
  return trees;
};