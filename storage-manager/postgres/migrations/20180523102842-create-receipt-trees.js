'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('receipt_trees', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stage_height: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      node_index: {
        allowNull: false,
        type: Sequelize.NUMERIC
      },
      node_hash: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      collisions: {
        allowNull: true,
        type: Sequelize.JSON
      }
    }).then(() => {
      queryInterface.addIndex('receipt_trees', ['stage_height', 'node_index']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('receipt_trees');
  }
};