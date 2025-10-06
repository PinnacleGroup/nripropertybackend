/*

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://nriproperty.uk",
      "https://www.nriproperty.uk",
      "http://localhost:3000",
      "http://localhost:5173",
    ];

    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
// Removed the problematic app.options("*", ...) line

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with Error Handling
mongoose.set("strictQuery", false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      family: 4,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    console.log("⏳ Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// MongoDB Event Listeners
mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected. Attempting to reconnect...");
  setTimeout(connectDB, 5000);
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err.message);
});

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connection established");
});

// Schemas
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  visits: { type: Number, default: 500 },
});

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  country: { type: String, required: true },
  countryCode: { type: String, required: true },
  phone: { type: String, required: true },
  service: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  message: { type: String, required: true },
  userDateTime: { type: String },
  indiaDateTime: { type: String },
  submittedAt: { type: Date, default: Date.now },
});

const Counter = mongoose.model("Counter", counterSchema);
const Enquiry = mongoose.model("Enquiry", enquirySchema);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email configuration error:", error);
  } else {
    console.log("✅ Email server ready to send messages");
  }
});

// Helper Functions
async function initializeCounter() {
  try {
    const existing = await Counter.findOne({ name: "pageViews" });
    if (!existing) {
      await Counter.create({ name: "pageViews", visits: 500 });
      console.log("✅ Counter initialized");
    }
  } catch (error) {
    console.error("Error initializing counter:", error);
  }
}

// Middleware to check DB connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database connection unavailable",
      message: "Please try again in a moment",
    });
  }
  next();
};

// Routes

// Health Check Endpoint (IMPORTANT for Render)
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root endpoint
app.get("/", checkDBConnection, async (req, res) => {
  try {
    await initializeCounter();
    const counter = await Counter.findOneAndUpdate(
      { name: "pageViews" },
      { $inc: { visits: 1 } },
      { new: true, upsert: true }
    );

    res.json({
      message: "NRI Property Backend API",
      visits: counter.visits,
      status: "active",
    });
  } catch (err) {
    console.error("Error updating count:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get current visit count
app.get("/view", checkDBConnection, async (req, res) => {
  try {
    await initializeCounter();
    const counter = await Counter.findOne({ name: "pageViews" });

    res.json({
      visits: counter ? counter.visits : 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching count:", err);
    res.status(500).json({ error: "Failed to fetch view count" });
  }
});

// Handle enquiry form submission
app.post("/api/query", checkDBConnection, async (req, res) => {
  try {
    const {
      name,
      email,
      country,
      countryCode,
      phone,
      service,
      date,
      time,
      message,
      userDateTime,
      indiaDateTime,
    } = req.body;

    // Validation
    if (
      !name ||
      !email ||
      !country ||
      !phone ||
      !service ||
      !date ||
      !time ||
      !message
    ) {
      return res.status(400).json({
        error: "All fields are required",
        missing: Object.keys(req.body).filter((key) => !req.body[key]),
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Save to database
    const enquiry = new Enquiry({
      name,
      email,
      country,
      countryCode,
      phone,
      service,
      date,
      time,
      message,
      userDateTime: userDateTime || "",
      indiaDateTime: indiaDateTime || "",
    });

    await enquiry.save();
    console.log(`✅ Enquiry saved: ${name} - ${service}`);

    // Admin Email
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_RECIPIENT,
      subject: `New Enquiry: ${service} - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #c81e1e; border-bottom: 2px solid #c81e1e; padding-bottom: 10px;">
            New Property Enquiry Received
          </h2>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Contact Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Name:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border: 1px solid #ddd;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Country:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${country}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${countryCode} ${phone}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Service Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 40%;">Service:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Preferred Date:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${date}</td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Preferred Time:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${time}</td>
              </tr>
            </table>
          </div>

          ${
            userDateTime && indiaDateTime
              ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Time Conversion</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; width: 40%;">User's Time:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${userDateTime}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">India Time (IST):</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${indiaDateTime}</td>
              </tr>
            </table>
          </div>
          `
              : ""
          }

          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Message</h3>
            <div style="padding: 15px; background-color: #f9f9f9; border-left: 4px solid #c81e1e; border-radius: 5px;">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px;">
            <p>Submitted on ${new Date().toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })} IST</p>
            <p>Please respond to the client as soon as possible.</p>
          </div>
        </div>
      `,
    };

    // User Confirmation Email
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Thank You for Your Enquiry - ${service}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
          <div style="background-color: #c81e1e; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Thank You for Contacting Us!</h1>
          </div>
          
          <div style="padding: 30px; background-color: white;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${name}</strong>,</p>
            
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Thank you for reaching out to us regarding <strong>${service}</strong>. 
              We have received your enquiry and our team will get back to you shortly.
            </p>

            <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #c81e1e; margin-top: 0;">Your Enquiry Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 40%;">Service:</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold;">${service}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Preferred Date:</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold;">${date}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Preferred Time:</td>
                  <td style="padding: 8px 0; color: #333; font-weight: bold;">${time}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              We will review your requirements and contact you within <strong>24-48 hours</strong> 
              at <strong>${countryCode} ${phone}</strong> or via email at <strong>${email}</strong>.
            </p>

            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Quick Tip:</strong> Please keep your phone handy. Our team may call you to discuss your requirements in detail.
              </p>
            </div>

            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              If you have any urgent queries, feel free to reach out to us directly.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #666; margin: 5px 0;">Contact Us</p>
              <p style="font-size: 14px; color: #666; margin: 5px 0;">${
                process.env.EMAIL_RECIPIENT
              }</p>
            </div>
          </div>

          <div style="background-color: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #fff; margin: 0; font-size: 14px;">
              ${new Date().getFullYear()} NRI Property Management Service. All rights reserved.
            </p>
            <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">
              This is an automated confirmation email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `,
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    console.log(`✅ Emails sent successfully for enquiry: ${name}`);

    res.status(200).json({
      success: true,
      message: "Enquiry submitted successfully! We'll contact you soon.",
      enquiryId: enquiry._id,
    });
  } catch (err) {
    console.error("❌ Error processing enquiry:", err);

    // Distinguish between different error types
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation failed",
        details: err.message,
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        error: "Duplicate entry",
        message: "This enquiry may have already been submitted",
      });
    }

    res.status(500).json({
      error: "Failed to submit enquiry",
      message: "Please try again later or contact support",
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: "Cannot " + req.method + " " + req.path,
    availableRoutes: ["/", "/health", "/view", "/api/query"],
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      error: "CORS policy violation",
      message: "Your origin is not allowed to access this resource",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
  });
});

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("⚠️ SIGTERM received. Closing server gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("⚠️ SIGINT received. Closing server gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});



*/