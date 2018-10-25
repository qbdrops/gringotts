'use strict';
module.exports = (sequelize, DataTypes) => {
  var gsn_number = sequelize.define('gsn_number', {
    gsn: DataTypes.NUMERIC
  }, {
    timestamps: false,
    tableName: 'gsn_number'
  });
  gsn_number.associate = function(models) {
    // associations can be defined here
  };
  return gsn_number;
};