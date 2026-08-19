const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const generateId = require('../utils/generateId');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => generateId('doc'),
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('Resume', 'Employment Letter', 'Certificates', 'Other Documents'),
    allowNull: false,
  },
  uploadDate: {
    type: DataTypes.DATEONLY,
    defaultValue: () => new Date().toISOString().split('T')[0],
  },
  data: {
    // Raw file bytes stored directly in Postgres (bytea).
    type: DataTypes.BLOB,
    allowNull: true,
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Document;
