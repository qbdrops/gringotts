'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gsn_number', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      gsn: {
        type: Sequelize.NUMERIC
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('gsn_number');
  }
};