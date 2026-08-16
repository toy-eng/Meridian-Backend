const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const Position = sequelize.define('Position', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4(),
  },
  departmentId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  indexes: [
    {
      unique: true,
      name: 'unique_title_per_department',
      fields: ['department_id', 'title'],
    },
  ],
  // Match global config: store camelCase attributes as snake_case in Postgres
  underscored: true,
});

module.exports = Position;
