const nodemailer = require('nodemailer');
const dns = require('dns');
const config = require('../config');

// Gmail's SMTP host advertises IPv6 addresses, but container networks (Render
// included) often have no IPv6 route, so the connection fails with
// ENETUNREACH before authentication. Prefer IPv4 when resolving hostnames.
dns.setDefaultResultOrder('ipv4first');

/**
 * Create a reusable transporter using SMTP (Brevo or configured provider).
 * See https://help.brevo.com/hc/en-us/articles/360010425260-How-to-configure-Brevo-SMTP
 */
const transporter = nodemailer.createTransport({
  host: config.brevo.smtpHost,
  port: config.brevo.smtpPort,
  secure: config.brevo.smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: config.brevo.smtpUser,
    pass: config.brevo.smtpPass,
  },
  connectionTimeout: 5000, // 5s — don't hang forever if SMTP is unreachable
});

/**
 * Send a 6-digit OTP email.
 *
 * Strategy:
 *  1. Always try real SMTP first.
 *  2. If SMTP fails in development — log the OTP to the console as a
 *     fallback so the registration flow can still be tested offline.
 *  3. If SMTP fails in production — throw the error (caller returns a 500).
 *
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code
 */
async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: `"StaffSync" <${config.brevo.fromEmail}>`,
    to,
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
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${to}`);
    return true;
  } catch (err) {
    if (config.isDev) {
      // Dev fallback — log OTP to console so testing can continue
      console.log('═══════════════════════════════════════════');
      console.log('  ⚠️  SMTP unavailable — dev fallback');
      console.log('  📧 OTP for', to);
      console.log('  🔑 Code:', otp);
      console.log('  ⏳ Expires in 5 minutes');
      console.log('  ❌ SMTP error:', err.message);
      console.log('═══════════════════════════════════════════');
      return false;
    }
    // Production — propagate the error so the caller returns a 500
    throw err;
  }
}

module.exports = { sendOtpEmail };
