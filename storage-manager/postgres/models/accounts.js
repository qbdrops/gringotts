'use strict';
module.exports = (sequelize, DataTypes) => {
  var account = sequelize.define('accounts', {
    address: DataTypes.TEXT
  }, {
    timestamps: false
  });
  account.associate = function(models) {
    // associations can be defined here
  };
  return account;
};