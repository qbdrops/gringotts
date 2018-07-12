'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('account_snapshot', {
      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stage_height: {
        allowNull: false,
        type: Sequelize.CHAR(64)
      },
      account_data: {
        allowNull: false,
        type: Sequelize.JSON
      },
      asset_roothash: {
        allowNull: false,
        type: Sequelize.JSON
      }
    }).then(() => {
      queryInterface.addIndex('account_snapshot', ['stage_height']);
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('account_snapshot');
  }
};