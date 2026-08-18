/**
 * Migration: Add `reporting_manager_id` column to the employees table.
 *
 * `reportingManager` was previously a display-only name string. To make the
 * reporting-manager ↔ employee relationship unambiguous, we now also store the
 * manager employee's id. `sequelize.sync()` only creates missing tables (no
 * ALTER), so this script adds the column to an existing table.
 *
 * Run: node scripts/migrate-add-reporting-manager-id.js
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
  const tableInfo = await queryInterface.describeTable('employees');
  if (!tableInfo.reporting_manager_id) {
    await queryInterface.addColumn('employees', 'reporting_manager_id', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('✅ Added `reporting_manager_id` column to employees table.');
  } else {
    console.log('ℹ️  `reporting_manager_id` column already exists — nothing to do.');
  }

  await sequelize.close();
  console.log('✅ Migration complete.');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
