'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('assets', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      balance: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      asset_id: {
        allowNull: false,
        unique: true,
        type: Sequelize.CHAR(64)
      },
      address: {
        allowNull: false,
        type: Sequelize.TEXT
      }
    }).then(() => {
      queryInterface.addIndex('assets', ['asset_id', 'address']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('assets');
  }
};