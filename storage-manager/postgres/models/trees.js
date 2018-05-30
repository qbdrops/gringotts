'use strict';
module.exports = (sequelize, DataTypes) => {
  var trees = sequelize.define('trees', {
    stage_height: DataTypes.CHAR(64),
    receiptTree: DataTypes.JSON,
    accountTree: DataTypes.JSON
  }, {
      timestamps: false
    });
  trees.associate = function (models) {
    // associations can be defined here
  };
  return trees;
};