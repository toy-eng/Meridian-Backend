const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { Admin, Company } = require('../models');
const AppError = require('../utils/AppError');
const { setOtp, getOtp, deleteOtp } = require('../utils/otpStore');
const { sendOtpEmail } = require('../utils/email');

/**
 * POST /auth/register
 * Register a new organisation / admin account.
 */
exports.register = async (req, res, next) => {
  try {
    const { companyName, email, description, phone, address, password, agreeTerms } = req.body;

    // Validations
    if (!companyName || companyName.length < 2) {
      throw new AppError('Company name is required and must be at least 2 characters', 400);
    }
    if (!email) throw new AppError('Email is required', 400);
    if (!description) throw new AppError('Description is required', 400);
    if (!phone) throw new AppError('Phone number is required', 400);
    if (!/^\+234(?:70[1-9]|80[2-9]|81[0-8]|90[1-9]|91[1-356]|702[5-9])\d{7}$/.test(phone)) {
      throw new AppError('Phone number must be a valid Nigerian number starting with +234', 400);
    }
    if (!address || typeof address !== 'object' || !address.state || !address.lga || !address.settlement || !address.street) {
      throw new AppError('Address with state, lga, settlement, and street is required', 400);
    }
    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }
    if (!agreeTerms) {
      throw new AppError('You must agree to the terms', 400);
    }

    // Check existing admin
    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      throw new AppError('An account with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin (name and email are set later by admin in settings)
    const admin = await Admin.create({
      password: hashedPassword,
      role: 'admin',
    });

    // Create company
    const company = await Company.create({
      name: companyName,
      email,
      description: description || null,
      phoneNumber: phone,
      address,
      adminId: admin.id,
    });

    // Generate token
    const token = jwt.sign({ id: admin.id, role: admin.role }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        company: {
          id: company.id,
          name: company.name,
          description: company.description,
          phoneNumber: company.phoneNumber,
          address: company.address,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/login
 * Authenticate an admin user and return a JWT token.
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email) throw new AppError('Email is required', 400);
    if (!password || password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    // Find company by email
    const company = await Company.findOne({ where: { email } });

    if (!company) {
      throw new AppError('Invalid email or password', 401);
    }

    // Get the admin associated with this company
    const admin = await Admin.findByPk(company.adminId);

    if (!admin) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const expiresIn = rememberMe ? '30d' : config.jwt.expiresIn;
    const token = jwt.sign({ id: admin.id, role: admin.role }, config.jwt.secret, {
      expiresIn,
    });

    // Calculate expiresIn seconds
    const expiresInSeconds = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: expiresInSeconds,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          profilePicture: admin.profilePicture,
        },
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          phoneNumber: company.phoneNumber,
          address: company.address,
          description: company.description,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/forgot-password
 * Send a 6-digit OTP to the user's email for password reset.
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) throw new AppError('Email is required', 400);

    // Email is stored on the Company model, not the Admin model
    const company = await Company.findOne({ where: { email } });
    if (!company) {
      // Don't reveal whether the email exists
      return res.json({
        success: true,
        message: 'Password reset code sent to your email',
      });
    }

    // Generate a random 6-digit OTP
    const otp = crypto.randomInt(100_000, 999_999).toString();

    // Store OTP with 5-minute expiry
    setOtp(email, otp, 5 * 60 * 1000);

    // Send OTP email
    const sent = await sendOtpEmail(email, otp);

    res.json({
      success: true,
      message: 'Password reset code sent to your email',
      data: { otp },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/reset-password
 * Verify OTP and set a new password.
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email) throw new AppError('Email is required', 400);
    if (!otp) throw new AppError('OTP is required', 400);
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    // Verify OTP
    const stored = getOtp(email);
    if (!stored) {
      throw new AppError('OTP has expired or was not requested. Please request a new one.', 400);
    }
    if (stored.otp !== otp) {
      throw new AppError('Invalid OTP code', 400);
    }

    // Email is stored on the Company model, find admin through it
    const company = await Company.findOne({ where: { email } });
    if (!company) {
      throw new AppError('Account not found', 404);
    }

    const admin = await Admin.findByPk(company.adminId);
    if (!admin) {
      throw new AppError('Account not found', 404);
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    // Delete OTP so it can't be reused
    deleteOtp(email);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /auth/change-password
 * Update the authenticated user's password.
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) throw new AppError('Current password is required', 400);
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const admin = await Admin.findByPk(req.user.id);
    if (!admin) throw new AppError('Admin not found', 404);

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /auth/me
 * Return the currently authenticated user's profile.
 */
exports.getMe = async (req, res, next) => {
  try {
    const company = await Company.findOne({ where: { adminId: req.user.id } });

    res.json({
      success: true,
      data: {
        company: company
          ? {
              id: company.id,
              name: company.name,
              description: company.description,
              email: company.email,
              phoneNumber: company.phoneNumber,
              address: company.address,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/send-otp
 * Generate a 6-digit OTP and send it to the user's email.
 */
exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) throw new AppError('Email is required', 400);

    // Check if email is already registered (skip if DB is unavailable)
    try {
      const existingAdmin = await Admin.findOne({ where: { email } });
      if (existingAdmin) {
        throw new AppError('An account with this email already exists', 400);
      }
    } catch (dbError) {
      if (dbError instanceof AppError) throw dbError;
      console.warn('DB unavailable — skipping duplicate email check:', dbError.message);
    }

    // Generate a random 6-digit OTP
    const otp = crypto.randomInt(100_000, 999_999).toString();

    // Store OTP with 5-minute expiry
    setOtp(email, otp, 5 * 60 * 1000);

    // Send OTP email
    const sent = await sendOtpEmail(email, otp);

    res.json({
      success: true,
      data: {
        message: sent ? 'OTP sent to email' : 'OTP generated (dev mode — check server console)',
        ...(config.isDev && !sent ? { devOtp: otp } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /auth/verify-otp
 * Verify the OTP sent to the user's email.
 */
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email) throw new AppError('Email is required', 400);
    if (!otp) throw new AppError('OTP is required', 400);

    const record = getOtp(email);

    if (!record) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (record.expiresAt <= Date.now()) {
      deleteOtp(email);
      throw new AppError('Invalid or expired OTP', 400);
    }

    if (record.otp !== otp) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // OTP is valid — clean up and mark as verified
    deleteOtp(email);

    // Generate a temporary verification token (valid for 15 min)
    const verificationToken = jwt.sign(
      { email, purpose: 'email-verification' },
      config.jwt.secret,
      { expiresIn: '15m' },
    );

    res.json({
      success: true,
      message: 'Email verified',
      data: { verificationToken },
    });
  } catch (error) {
    next(error);
  }
};
