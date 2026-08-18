/**
 * Migration: Add `head_id` column to the departments table.
 *
 * `head` was previously a display-only name string. To make the department
 * head ↔ employee relationship unambiguous, we now also store the head
 * employee's id. `sequelize.sync()` only creates missing tables (no ALTER),
 * so this script adds the column to an existing table.
 *
 * Run: node scripts/migrate-add-head-id.js
 */
const { DataTypes } = require('sequelize');
const { sequelize, testConnection } = require('../src/config/database');
require('../src/models');

const migrate = async () => {
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot run migration: database not connected.');
    process.exit(1);
  }

  const queryInterface = sequelize.getQueryInterface();

  // Column names are snake_case (global `underscored: true`).
  const tableInfo = await queryInterface.describeTable('departments');
  if (!tableInfo.head_id) {
    await queryInterface.addColumn('departments', 'head_id', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('✅ Added `head_id` column to departments table.');
  } else {
    console.log('ℹ️  `head_id` column already exists — nothing to do.');
  }

  await sequelize.close();
  console.log('✅ Migration complete.');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
