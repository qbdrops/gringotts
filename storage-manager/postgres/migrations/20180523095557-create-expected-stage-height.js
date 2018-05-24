'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('expected_stage_height', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      height: {
        allowNull: false,
        type: Sequelize.NUMERIC
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('expected_stage_height');
  }
};