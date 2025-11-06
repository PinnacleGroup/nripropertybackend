import express from 'express';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import VerifiedUser from '../Models/VerifiedUserSchema.js';
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST: Send OTP to email
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log('Looking for email:', normalizedEmail);

    // Find user by email (case-insensitive)
    const user = await VerifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    });

    if (!user) {
      console.log('User not found for email:', normalizedEmail);
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email. Please submit a query first.' 
      });
    }

    console.log('User found:', user.userId);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY || 10) * 60 * 1000);

    // Save OTP to database
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    console.log('OTP saved to database:', otp);

    // Email options
    const mailOptions = {
      from: `"NRIPROPERTY.UK" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'OTP for Client Portal Login',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white; 
              padding: 30px 20px; 
              text-align: center; 
              border-radius: 8px 8px 0 0; 
            }
            .content { 
              background: #f9fafb; 
              padding: 30px; 
              border-radius: 0 0 8px 8px; 
            }
            .otp-box { 
              background: white; 
              border: 2px dashed #2563eb; 
              padding: 20px; 
              text-align: center; 
              margin: 20px 0; 
              border-radius: 8px; 
            }
            .otp { 
              font-size: 36px; 
              font-weight: bold; 
              color: #2563eb; 
              letter-spacing: 8px; 
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              color: #666; 
              font-size: 12px; 
            }
            .info { 
              background: #eff6ff; 
              padding: 15px; 
              border-left: 4px solid #2563eb; 
              margin: 20px 0; 
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Client Portal Login</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${user.userId.split('_')[0]}</strong>,</p>
              <p>Your One-Time Password (OTP) for accessing the client portal is:</p>
              
              <div class="otp-box">
                <div class="otp">${otp}</div>
              </div>
              
              <div class="info">
                <strong>⏱️ Valid for ${process.env.OTP_EXPIRY || 10} minutes</strong>
              </div>
              
              <p>Enter this OTP on the login page to access your account.</p>
              
              <p style="color: #dc2626; font-weight: 500;">
                ⚠️ If you didn't request this OTP, please ignore this email or contact support.
              </p>
              
              <p>Best regards,<br><strong>NRI Property Management Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>© ${new Date().getFullYear()} Pinnacle Group. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', user.email);

    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully to your email',
      userId: user.userId
    });

  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send OTP. Please try again.',
      error: error.message
    });
  }
});

// POST: Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await VerifiedUser.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'No OTP found. Please request a new one.' 
      });
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Verify OTP
    if (user.otp !== otp.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP. Please try again.' 
      });
    }

    // Clear OTP after successful verification
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.userId, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        email: user.email,
        phone: user.phone,
        country: user.country,
        service: user.service,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP. Please try again.' 
    });
  }
});

// GET: Get user details (protected route)
router.get('/user', verifyToken, async (req, res) => {
  try {
    const user = await VerifiedUser.findOne({ userId: req.user.userId })
      .select('-otp -otpExpiry');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.status(200).json({ 
      success: true, 
      user 
    });

  } catch (error) {
    console.error('Get User Details Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user details' 
    });
  }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
}

export default router;