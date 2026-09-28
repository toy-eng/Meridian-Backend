/**
 * Email delivery check.
 *
 * Mirrors exactly what src/utils/email.js does, so a pass here means sign-up
 * OTP emails will send from the server too. Prints which mode is in use and
 * the full provider error when something is wrong.
 *
 * Usage:
 *   node scripts/check-email.js                    # configuration check
 *   node scripts/check-email.js you@example.com    # also send a real test
 */
const nodemailer = require('nodemailer');
const dns = require('dns');
const config = require('../src/config');

dns.setDefaultResultOrder('ipv4first');

const maskKey = (key) => (key ? `${key.slice(0, 6)}...${key.slice(-4)} (len ${key.length})` : '(not set)');
const BREVO_API = 'https://api.brevo.com/v3';

const run = async () => {
  const to = process.argv[2];
  const useApi = Boolean(config.brevo.apiKey);

  console.log('From:   ', config.brevo.fromEmail);
  if (to) console.log('To:     ', to);
  console.log('Mode:   ', useApi ? 'Brevo HTTPS API (port 443)' : 'SMTP');

  if (useApi) {
    console.log('API key:', maskKey(config.brevo.apiKey));
  } else {
    console.log('Host:   ', `${config.brevo.smtpHost}:${config.brevo.smtpPort}`);
    console.log('User:   ', config.brevo.smtpUser || '(not set)');
    console.log('Pass:   ', config.brevo.smtpPass ? `(set, len ${config.brevo.smtpPass.length})` : '(not set)');
  }

  try {
    if (useApi) {
      const account = await fetch(`${BREVO_API}/account`, {
        headers: { 'api-key': config.brevo.apiKey, accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      console.log('\nAccount:', account.status, account.ok ? 'OK' : 'FAILED');
      if (account.ok) {
        const data = await account.json();
        console.log('  plan:   ', JSON.stringify(data.plan));
        const senders = (data.relay && data.relay.senders) || [];
        console.log('  senders:', senders.length ? senders.map((s) => s.email).join(', ') : '(none registered)');
        if (senders.length && !senders.some((s) => s.email === config.brevo.fromEmail)) {
          console.log(`  WARNING: ${config.brevo.fromEmail} is not in the sender list above.`);
          console.log('           Brevo will reject sends from an unverified sender.');
        }
      } else {
        console.log('  body:', (await account.text()).slice(0, 300));
      }

      if (to) {
        const response = await fetch(`${BREVO_API}/smtp/email`, {
          method: 'POST',
          headers: {
            'api-key': config.brevo.apiKey,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { name: config.brevo.fromName, email: config.brevo.fromEmail },
            to: [{ email: to }],
            subject: 'StaffSync email check',
            textContent: 'If you are reading this, OTP email delivery works.',
          }),
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.text();
        console.log('\nTest send:', response.status, response.ok ? 'SENT' : 'FAILED');
        console.log('  body:', body.slice(0, 300));
        if (!response.ok) process.exit(1);
      } else {
        console.log('\nTip: pass an email address to send a real test message.');
      }
    } else {
      const transporter = nodemailer.createTransport({
        host: config.brevo.smtpHost,
        port: config.brevo.smtpPort,
        secure: config.brevo.smtpPort === 465,
        auth: { user: config.brevo.smtpUser, pass: config.brevo.smtpPass },
        connectionTimeout: 8000,
      });
      await transporter.verify();
      console.log('\nSMTP connection + credentials: OK');
      if (to) {
        await transporter.sendMail({
          from: `"${config.brevo.fromName}" <${config.brevo.fromEmail}>`,
          to,
          subject: 'StaffSync email check',
          text: 'If you are reading this, OTP email delivery works.',
        });
        console.log('Test email sent.');
      } else {
        console.log('Tip: pass an email address to send a real test message.');
      }
    }
    process.exit(0);
  } catch (error) {
    console.log('\nFAILED');
    console.log('  message:', error.message);
    console.log('  code:   ', error.code);
    process.exit(1);
  }
};

run();
