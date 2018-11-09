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
      log_id: {
        allowNull: false,
        type: Sequelize.CHAR(64)
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
      from: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      to: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      value: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      fee: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      asset_id: {
        allowNull: true,
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
      },
      createdAt: {
        type: Sequelize.DATE
      },
      updatedAt: {
        type: Sequelize.DATE
      }
    }).then(() => {
      queryInterface.addIndex('receipts', ['gsn', 'light_tx_hash', 'receipt_hash', 'stage_height']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('receipts');
  }
};