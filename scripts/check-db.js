/**
 * Database connectivity check.
 *
 * Uses the exact same config and SSL rules as the server, so a pass here means
 * the deployed app will connect too. Prints the target host with the password
 * masked, and the full driver error when the connection fails - useful when the
 * server log only shows an empty message.
 *
 * Usage:
 *   Put DATABASE_URL in .env, then:  node scripts/check-db.js
 */
const config = require('../src/config');

/** Hide the password before printing a connection string. */
const mask = (url) => url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:***@');

const run = async () => {
  const url = config.db.url;

  if (!url) {
    console.log('No DATABASE_URL found in .env or the environment.');
    console.log('Add a line like this to .env and run again:');
    console.log('  DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require');
    process.exit(1);
  }

  console.log('Target:', mask(url));

  const { sequelize } = require('../src/config/database');

  try {
    await sequelize.authenticate();
    console.log('OK - connection established.');
    process.exit(0);
  } catch (error) {
    const driver = error.original || {};
    console.log('FAILED');
    console.log('  name:    ', error.name);
    console.log('  message: ', JSON.stringify(error.message));
    console.log('  code:    ', error.code || driver.code);
    console.log('  driver:  ', driver.name, JSON.stringify(driver.message));
    console.log('  stack:   ', String(error.stack).split('\n').slice(0, 4).join('\n           '));
    process.exit(1);
  }
};

run();
