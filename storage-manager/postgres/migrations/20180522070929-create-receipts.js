'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('receipts', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      light_tx_hash: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      receipt_hash: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      stage_height: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      data: {
        type: Sequelize.JSON
      }
    }).then(() => {
      queryInterface.addIndex('receipts', ['light_tx_hash', 'receipt_hash', 'stage_height']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('receipts');
  }
};