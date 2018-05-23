'use strict';
module.exports = (sequelize, DataTypes) => {
  var assets = sequelize.define('assets', {
    balance: DataTypes.CHAR(64),
    account_id: DataTypes.INTEGER
  }, {
    timestamps: false
  });
  assets.associate = function(models) {
    // associations can be defined here
  };
  return assets;
};