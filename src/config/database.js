const { Sequelize } = require('sequelize');
const config = require('./index');

// Shared options for both local (discrete DB_* vars) and Heroku (DATABASE_URL).
const sequelizeOptions = {
  dialect: 'postgres',
  logging: config.isDev ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

const sequelize = config.db.url
  ? new Sequelize(config.db.url, {
      ...sequelizeOptions,
      // Heroku Postgres requires SSL; local Postgres does not.
      dialectOptions: config.isProd
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : undefined,
    })
  : new Sequelize(config.db.name, config.db.user, config.db.password, {
      ...sequelizeOptions,
      host: config.db.host,
      port: config.db.port,
    });

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('⚠️  Unable to connect to the database:', error.message);
    console.error('   The server will start but DB features will be unavailable.');
    console.error('   Make sure Postgres is running and create the database:');
    console.error(`   > CREATE DATABASE ${config.db.name};`);
    return false;
  }
};

module.exports = { sequelize, testConnection };
