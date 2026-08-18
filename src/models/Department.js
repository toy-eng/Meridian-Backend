const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  abbreviation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  head: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Not assigned',
  },
  headId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateCreated: {
    type: DataTypes.DATEONLY,
    defaultValue: () => new Date().toISOString().split('T')[0],
  },
  companyId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Department;
