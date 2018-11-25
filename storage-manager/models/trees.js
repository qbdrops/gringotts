'use strict';
module.exports = (sequelize, DataTypes) => {
  var trees = sequelize.define('trees', {
    stage_height: DataTypes.CHAR(64),
    receipt_tree: DataTypes.JSON,
    account_tree: DataTypes.JSON,
    finalizeTxHash: DataTypes.CHAR(64),
    attach_tx_hash: DataTypes.CHAR(64)
  }, {
    timestamps: false
  });
  trees.associate = function (models) {
    // associations can be defined here
  };
  return trees;
};