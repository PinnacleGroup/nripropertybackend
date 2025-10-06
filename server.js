const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());

// MongoDB connection
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4, // 👈 Forces IPv4 instead of IPv6
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Counter Schema
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  visits: { type: Number, default: 500 },
});

const Counter = mongoose.model("Counter", counterSchema);

// Enquiry Schema
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

const Enquiry = mongoose.model("Enquiry", enquirySchema);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // secure port
  secure: true, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify email config on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("Email configuration error:", error);
  } else {
    console.log("Email server ready to send messages");
  }
});

// Helper Functions
async function initializeCounter() {
  const existing = await Counter.findOne({ name: "pageViews" });
  if (!existing) {
    await Counter.create({ name: "pageViews", visits: 0 });
  }
}

// Routes

// Get current count
app.get("/view", async (req, res) => {
  try {
    await initializeCounter();
    const counter = await Counter.findOne({ name: "pageViews" });
    res.json({ visits: counter.visits });
  } catch (err) {
    console.error("Error fetching count:", err);
    res.status(500).json({ error: "Failed to fetch view count" });
  }
});

// Increment and return count
app.get("/", async (req, res) => {
  try {
    await initializeCounter();
    const counter = await Counter.findOneAndUpdate(
      { name: "pageViews" },
      { $inc: { visits: 1 } },
      { new: true }
    );
    res.json({ visits: counter.visits });
  } catch (err) {
    console.error("Error updating count:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Handle form submission
app.post("/api/query", async (req, res) => {
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

    // Validate required fields
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
      return res.status(400).json({ error: "All fields are required" });
    }

    // Save to database
    const enquiry = new Enquiry(req.body);
    await enquiry.save();
    console.log(`Enquiry saved to database: ${name}`);

    // Send email to ADMIN
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
            <p>This enquiry was submitted on ${new Date().toLocaleString(
              "en-IN",
              { timeZone: "Asia/Kolkata" }
            )} IST</p>
            <p>Please respond to the client as soon as possible.</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(adminMailOptions);
    console.log(`Admin email sent to ${process.env.EMAIL_RECIPIENT}`);

    // Send confirmation email to USER
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

    await transporter.sendMail(userMailOptions);
    console.log(`Confirmation email sent to user: ${email}`);

    res.status(200).json({
      success: true,
      message: "Enquiry submitted successfully! We'll contact you soon.",
    });
  } catch (err) {
    console.error("Error processing enquiry:", err);
    res.status(500).json({
      error: "Failed to submit enquiry. Please try again later.",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
