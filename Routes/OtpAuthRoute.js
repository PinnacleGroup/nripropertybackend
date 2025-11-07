import express from "express";
import mongoose from "mongoose";
// import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import VerifiedUser from "../Models/VerifiedUserSchema.js";
import SibApiV3Sdk from "@getbrevo/brevo";

const router = express.Router();
const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();
brevoClient.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Test route to check if route is working
router.get("/test", (req, res) => {
  res.json({ success: true, message: "OTP Auth route is working!" });
});

const sendEmail = async (toEmail, name, otp) => {
  try {
    await brevoClient.sendTransacEmail({
      sender: { name: "NRIPROPERTY.UK", email: "no-reply@nriproperty.uk" },
      to: [{ email: toEmail }],
      subject: "Your OTP for Login - NRIPROPERTY.UK",
      htmlContent: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Hello ${name},</h2>
        <p>Your one-time password for Login is:</p>
        <h1 style="font-size: 32px; letter-spacing: 6px;">${otp}</h1>
        <p>Valid for 10 minutes.</p>
        <br />
        <p>If you did not request this, please ignore.</p>
      </div>
      `,
    });
    console.log("✅ Email sent via Brevo API");
  } catch (error) {
    console.log("❌ Brevo API Email Error:", error);
    throw new Error("Email sending failed");
  }
};

// ✅ FIX: Create transporter function instead of global variable
// This ensures environment variables are loaded when function is called

/*
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ SMTP credentials missing:");
    console.error("SMTP_USER:", process.env.SMTP_USER ? "✓ Set" : "✗ Missing");
    console.error(
      "SMTP_PASS:",
      process.env.SMTP_PASS
        ? "✓ Set (length: " + process.env.SMTP_PASS.length + ")"
        : "✗ Missing"
    );
    throw new Error("SMTP credentials not configured");
  }



  console.log(
    "✅ Creating email transporter with user:",
    process.env.SMTP_USER
  );

  // return nodemailer.createTransport({
  //   service: "gmail",
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASS,
  //   },
  // });


  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS, // MUST be App Password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

};
*/
// Test SMTP connection on startup (optional but helpful for debugging)
/*
try {
  const testTransporter = createTransporter();
  testTransporter.verify((error, success) => {
    if (error) {
      console.error("❌ SMTP verification failed:", error.message);
    } else {
      console.log("✅ SMTP server is ready to send emails");
    }
  });
} catch (error) {
  console.error("❌ Email transporter initialization error:", error.message);
}
*/
// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST: Send OTP to email
router.post("/send-otp", async (req, res) => {
  console.log("\n=== SEND OTP REQUEST ===");
  console.log("Request body:", req.body);

  try {
    const { email } = req.body;
    // ✅ Ensure MongoDB connection is active
    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB not connected");
      return res.status(500).json({
        success: false,
        message:
          "Database connection not established. Please try again shortly.",
      });
    }

    // Validate email
    if (!email) {
      console.log("❌ No email provided");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log("📧 Looking for email:", normalizedEmail);

    // Check environment variables
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.error("❌ Missing environment variables:");
      console.error(
        "SMTP_USER:",
        process.env.SMTP_USER ? "✓ Set" : "✗ Missing"
      );
      console.error(
        "SMTP_PASS:",
        process.env.SMTP_PASS ? "✓ Set" : "✗ Missing"
      );
      return res.status(500).json({
        success: false,
        message: "Email service not configured. Please contact admin.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not configured in .env");
      return res.status(500).json({
        success: false,
        message: "Authentication service not configured. Please contact admin.",
      });
    }

    // Find user in New_Queries collection
    console.log("🔍 Searching New_Queries collection...");
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const user = await newQueriesCollection.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      console.log("❌ User not found in New_Queries collection");
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email. Please submit a query first.",
      });
    }

    console.log("✅ User found:", user.name, user.email);

    // Check if user is approved
    if (!user.isApproved) {
      console.log("❌ User not approved");
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval.",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(
      Date.now() + parseInt(process.env.OTP_EXPIRY || 10) * 60 * 1000
    );

    console.log("🔐 Generated OTP:", otp);
    console.log("⏰ OTP expires at:", otpExpiry);

    // Save OTP to New_Queries collection
    const updateResult = await newQueriesCollection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          otp: otp,
          otpExpiry: otpExpiry,
        },
      }
    );
    console.log(
      "💾 OTP saved to database. Modified count:",
      updateResult.modifiedCount
    );

    // ✅ FIX: Create transporter here, when we know env vars are loaded
    console.log("📧 Creating email transporter...");
    const transporter = createTransporter();

    // Email options
    const mailOptions = {
      from: `"NRIPROPERTY.UK" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Your OTP for Login - nriproperty.uk",
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
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Your One-Time Password (OTP) for accessing the client portal is:</p>
              
              <div class="otp-box">
                <div class="otp">${otp}</div>
              </div>
              
              <div class="info">
                <strong>⏱️ Valid for ${
                  process.env.OTP_EXPIRY || 10
                } minutes</strong>
              </div>
              
              <p>Enter this OTP on the login page to access your account.</p>
              
              <p style="color: #dc2626; font-weight: 500;">
                ⚠️ If you didn't request this OTP, please ignore this email or contact support.
              </p>
              
              <p>Best regards,<br><strong>NRI Property Management Services</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>© ${new Date().getFullYear()} Pinnacle Group. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email
    /*
    console.log("📤 Sending email to:", user.email);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully! Message ID:", info.messageId);
*/
    console.log("📤 Sending email via Brevo API:", user.email);
    await sendEmail(user.email, user.name, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      email: user.email,
    });
  } catch (error) {
    console.error("❌ Send OTP Error:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: error.message,
      errorType: error.name,
    });
  }
});

// POST: Verify OTP and login
router.post("/verify-otp", async (req, res) => {
  console.log("\n=== VERIFY OTP REQUEST ===");
  console.log("Request body:", req.body);

  try {
    const { email, otp } = req.body;
    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB not connected");
      return res.status(500).json({
        success: false,
        message:
          "Database connection not established. Please try again shortly.",
      });
    }

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();
    console.log("📧 Verifying OTP for:", normalizedEmail);

    // Find user in New_Queries collection
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const user = await newQueriesCollection.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ User found:", user.name);
    console.log("🔐 Stored OTP:", user.otp);
    console.log("🔐 Provided OTP:", otp.trim());

    // Check if OTP exists
    if (!user.otp) {
      console.log("❌ No OTP in database");
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    // Check if OTP is expired
    if (new Date() > new Date(user.otpExpiry)) {
      console.log("❌ OTP expired at:", user.otpExpiry);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Verify OTP
    if (user.otp !== otp.trim()) {
      console.log("❌ OTP mismatch");
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    console.log("✅ OTP verified successfully");

    // Clear OTP after successful verification
    await newQueriesCollection.updateOne(
      { email: normalizedEmail },
      {
        $unset: {
          otp: "",
          otpExpiry: "",
        },
      }
    );
    console.log("💾 OTP cleared from database");

    // Generate JWT token
    const token = jwt.sign(
      {
        email: user.email,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("🎟️ JWT token generated");

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        email: user.email,
        name: user.name,
        phone: user.phone,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    console.error("❌ Verify OTP Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
      error: error.message,
    });
  }
});

// GET: Get user details (protected route)
router.get("/user", verifyToken, async (req, res) => {
  try {
    const user = await VerifiedUser.findOne({ userId: req.user.userId }).select(
      "-otp -otpExpiry"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get User Details Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
    });
  }
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

export default router;
