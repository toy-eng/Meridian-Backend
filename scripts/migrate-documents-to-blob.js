/**
 * Migration: store document files as bytea in Postgres instead of a Cloudinary URL.
 *
 * Replaces the `file_url` column with `data` (bytea), `mime_type`, and `size`.
 * `sequelize.sync()` only creates missing tables (no ALTER), so this script
 * applies the change to an existing table.
 *
 * Run: node scripts/migrate-documents-to-blob.js
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
  const tableInfo = await queryInterface.describeTable('documents');

  if (!tableInfo.data) {
    await queryInterface.addColumn('documents', 'data', {
      type: DataTypes.BLOB,
      allowNull: true,
    });
    console.log('✅ Added `data` column to documents table.');
  } else {
    console.log('ℹ️  `data` column already exists — nothing to do.');
  }

  if (!tableInfo.mime_type) {
    await queryInterface.addColumn('documents', 'mime_type', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    console.log('✅ Added `mime_type` column to documents table.');
  }

  if (!tableInfo.size) {
    await queryInterface.addColumn('documents', 'size', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    console.log('✅ Added `size` column to documents table.');
  }

  if (tableInfo.file_url) {
    await queryInterface.removeColumn('documents', 'file_url');
    console.log('✅ Dropped legacy `file_url` column from documents table.');
  }

  await sequelize.close();
  console.log('✅ Migration complete.');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
