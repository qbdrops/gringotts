'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('fee_lists', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stage_height: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      asset_id: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      fee: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('fee_lists');
  }
};