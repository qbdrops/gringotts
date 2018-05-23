'use strict';
module.exports = (sequelize, DataTypes) => {
  var expected_stage_height = sequelize.define('expected_stage_height', {
    height: DataTypes.CHAR(64)
  }, {
    timestamps: false
  });
  expected_stage_height.associate = function(models) {
    // associations can be defined here
  };
  return expected_stage_height;
};