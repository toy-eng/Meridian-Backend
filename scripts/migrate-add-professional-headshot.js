/**
 * Migration: Add professional headshot columns to the employees table.
 *
 * The professional headshot uses the same storage approach as documents —
 * raw image bytes stored in Postgres (bytea), served via a dedicated
 * endpoint. `sequelize.sync()` only creates missing tables (no ALTER), so
 * this script adds the columns to an existing table.
 *
 * Columns added:
 *  - `professional_headshot`       (string, URL/path exposed to the frontend)
 *  - `professional_headshot_data`  (bytea, raw image bytes)
 *  - `professional_headshot_mime_type` (string, mime type for serving)
 *
 * Run: node scripts/migrate-add-professional-headshot.js
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

  if (!tableInfo.professional_headshot) {
    await queryInterface.addColumn('employees', 'professional_headshot', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('✅ Added `professional_headshot` column to employees table.');
  } else {
    console.log('ℹ️  `professional_headshot` column already exists — nothing to do.');
  }

  if (!tableInfo.professional_headshot_data) {
    await queryInterface.addColumn('employees', 'professional_headshot_data', {
      type: DataTypes.BLOB,
      allowNull: true,
    });
    console.log('✅ Added `professional_headshot_data` column to employees table.');
  } else {
    console.log('ℹ️  `professional_headshot_data` column already exists — nothing to do.');
  }

  if (!tableInfo.professional_headshot_mime_type) {
    await queryInterface.addColumn('employees', 'professional_headshot_mime_type', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('✅ Added `professional_headshot_mime_type` column to employees table.');
  } else {
    console.log('ℹ️  `professional_headshot_mime_type` column already exists — nothing to do.');
  }

  await sequelize.close();
  console.log('✅ Migration complete.');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
