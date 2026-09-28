const nodemailer = require('nodemailer');
const dns = require('dns');
const config = require('../config');

// Gmail's SMTP host advertises IPv6 addresses, but container networks (Render
// included) often have no IPv6 route, so the connection fails with
// ENETUNREACH before authentication. Prefer IPv4 when resolving hostnames.
dns.setDefaultResultOrder('ipv4first');

/**
 * Two delivery modes:
 *
 *  1. Brevo HTTPS API - used whenever BREVO_API_KEY is set. It sends over
 *     port 443, which is the only way out on hosts that block SMTP ports.
 *     Render blocks outbound 25/465/587, so this is the mode to use there.
 *  2. SMTP via nodemailer - the fallback when no API key is configured.
 *     Fine locally, and on hosts that allow outbound SMTP.
 */

const transporter = nodemailer.createTransport({
  host: config.brevo.smtpHost,
  port: config.brevo.smtpPort,
  secure: config.brevo.smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: config.brevo.smtpUser,
    pass: config.brevo.smtpPass,
  },
  connectionTimeout: 5000, // 5s - don't hang forever if SMTP is unreachable
});

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/** Build the OTP message. Both delivery modes send the same content. */
function buildOtpEmail(otp) {
  return {
    subject: 'Your StaffSync Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">Email Verification</h2>
        <p style="color: #475569; font-size: 15px;">
          Use the code below to verify your email address for StaffSync.
        </p>
        <div style="
          background: #f1f5f9;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #0f172a;
          margin: 20px 0;
        ">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 13px;">
          This code expires in <strong>5 minutes</strong>.
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
    text: `Your StaffSync verification code is ${otp}. It expires in 5 minutes.`,
  };
}

/** Send one email through Brevo's HTTPS API (port 443). */
async function sendViaBrevoApi({ to, subject, html, text }) {
  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': config.brevo.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: config.brevo.fromName, email: config.brevo.fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(
      `Brevo API responded ${response.status}: ${body.slice(0, 300) || 'no response body'}`
    );
    error.statusCode = 502;
    throw error;
  }
}

/**
 * Send a 6-digit OTP email.
 *
 * Strategy:
 *  1. Send for real - via the Brevo API when a key is configured, else SMTP.
 *  2. If delivery fails in development, log the OTP to the console so the
 *     registration flow can still be tested offline.
 *  3. If delivery fails in production, throw (the caller answers 502).
 *
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
async function sendOtpEmail(to, otp) {
  const message = buildOtpEmail(otp);
  const useApi = Boolean(config.brevo.apiKey);

  try {
    if (useApi) {
      await sendViaBrevoApi({ to, ...message });
    } else {
      await transporter.sendMail({
        from: `"${config.brevo.fromName}" <${config.brevo.fromEmail}>`,
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    }
    console.log(`OTP email sent to ${to} via ${useApi ? 'Brevo API' : 'SMTP'}`);
    return true;
  } catch (err) {
    if (config.isDev) {
      console.log('=====================================================');
      console.log('  Email delivery unavailable - dev fallback');
      console.log('  OTP for', to);
      console.log('  Code:', otp);
      console.log('  Expires in 5 minutes');
      console.log('  Error:', err.message);
      console.log('=====================================================');
      return false;
    }
    // Production - propagate so the caller returns a clear upstream error.
    err.statusCode = err.statusCode || 502;
    throw err;
  }
}

module.exports = { sendOtpEmail };
