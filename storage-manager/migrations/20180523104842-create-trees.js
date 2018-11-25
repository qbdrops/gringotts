'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('trees', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stage_height: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      receipt_tree: {
        allowNull: true,
        type: Sequelize.JSON
      },
      account_tree: {
        allowNull: true,
        type: Sequelize.JSON
      },
      finalizeTxHash: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      },
      attach_tx_hash: {
        allowNull: true,
        type: Sequelize.CHAR(64)
      }
    }).then(() => {
      queryInterface.addIndex('trees', ['stage_height']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('trees');
  }
};