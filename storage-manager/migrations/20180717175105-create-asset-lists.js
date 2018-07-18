'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('asset_lists', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      asset_name: {
        allowNull: true,
        type: Sequelize.TEXT
      },
      asset_decimals: {
        allowNull: false,
        type: Sequelize.INTEGER
      },
      asset_address: {
        allowNull: false,
        unique: true,
        type: Sequelize.TEXT
      }
    }).then(() => {
      queryInterface.addIndex('asset_lists', ['asset_address']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('asset_lists');
  }
};