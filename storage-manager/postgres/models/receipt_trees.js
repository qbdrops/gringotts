'use strict';
module.exports = (sequelize, DataTypes) => {
  var receipt_trees = sequelize.define('receipt_trees', {
    stage_height: DataTypes.CHAR(64),
    node_index: DataTypes.NUMERIC,
    node_hash: DataTypes.CHAR(64),
    collisions: DataTypes.JSON
  }, {
    timestamps: false
  });
  receipt_trees.associate = function(models) {
    // associations can be defined here
  };
  return receipt_trees;
};