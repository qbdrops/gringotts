'use strict';
module.exports = (sequelize, DataTypes) => {
  var contract_address = sequelize.define('contract_address', {
    address: DataTypes.TEXT
  }, {
    timestamps: false
  });
  contract_address.associate = function(models) {
    // associations can be defined here
  };
  return contract_address;
};