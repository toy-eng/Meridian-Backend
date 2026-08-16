const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Database (Postgres)
  db: {
    url: process.env.DATABASE_URL || '',
    name: process.env.DB_NAME || 'staffsync',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'staffsync-dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Brevo (email)
  brevo: {
    smtpHost: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    smtpPort: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
    smtpUser: process.env.BREVO_SMTP_USER || '',
    smtpPass: process.env.BREVO_SMTP_PASS || '',
    fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@staffsync.com',
  },

};

module.exports = config;
