'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('receipts', {
      id: {
        unique: true,
        type: Sequelize.BIGINT,
        primaryKey: true,
        autoIncrement: true
      },
      gsn: {
        unique: true,
        type: Sequelize.CHAR(64),
        allowNull: false,
      },
      stage_height: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      light_tx_hash: {
        allowNull: false,
        unique: true,
        type: Sequelize.CHAR(64)
      },
      receipt_hash: {
        allowNull: true,
        unique: true,
        type: Sequelize.CHAR(64)
      },
      onchain: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      data: {
        allowNull: true,
        type: Sequelize.JSON
      }
    }).then(() => {
      queryInterface.addIndex('receipts', ['gsn', 'light_tx_hash', 'receipt_hash', 'stage_height']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('receipts');
  }
};