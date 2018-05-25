'use strict';
module.exports = (sequelize, DataTypes) => {
  var account_trees = sequelize.define('account_trees', {
    stage_height: DataTypes.CHAR(64),
    node_index: DataTypes.NUMERIC,
    node_hash: DataTypes.CHAR(64),
    collisions: DataTypes.JSON
  }, {
    timestamps: false
  });
  account_trees.associate = function(models) {
    // associations can be defined here
  };
  return account_trees;
};