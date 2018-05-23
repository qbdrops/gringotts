'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('expected_stage_height', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      height: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('expected_stage_height');
  }
};