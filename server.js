const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios"); // ✅ For EmailJS API
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

    if (!origin) return callback(null, true); // allow Postman, curl etc.

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.set("strictQuery", false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
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
  console.log("⚠️ MongoDB disconnected. Reconnecting...");
  setTimeout(connectDB, 5000);
});
mongoose.connection.on("error", (err) => console.error("❌ MongoDB error:", err.message));
mongoose.connection.on("connected", () => console.log("✅ MongoDB connection established"));

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

// Middleware to check DB
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database unavailable",
      message: "Try again later",
    });
  }
  next();
};

// Routes

// Health
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
  });
});

// Root
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

// Get count
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

// Enquiry
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

    if (!name || !email || !country || !phone || !service || !date || !time || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

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

    // EmailJS API payload
    const sendEmail = async (toEmail, subject, htmlContent) => {
      const payload = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_USER_ID, // public key
        template_params: {
          to_email: toEmail,
          subject,
          message_html: htmlContent,
        },
      };
      await axios.post("https://api.emailjs.com/api/v1.0/email/send", payload, {
        headers: { "Content-Type": "application/json" },
      });
    };

    // Admin Email
    await sendEmail(
      process.env.EMAIL_RECIPIENT,
      `New Enquiry: ${service} - ${name}`,
      `
      <h2>New Property Enquiry</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Country:</b> ${country}</p>
      <p><b>Phone:</b> ${countryCode} ${phone}</p>
      <p><b>Service:</b> ${service}</p>
      <p><b>Date:</b> ${date}</p>
      <p><b>Time:</b> ${time}</p>
      <p><b>Message:</b> ${message}</p>
    `
    );

    // User Email
    await sendEmail(
      email,
      `Thank You for Your Enquiry - ${service}`,
      `
      <h2>Thank You, ${name}!</h2>
      <p>We have received your enquiry about <b>${service}</b>.</p>
      <p>Our team will contact you within 24–48 hours.</p>
    `
    );

    console.log(`✅ Emails sent successfully for enquiry: ${name}`);

    res.status(200).json({
      success: true,
      message: "Enquiry submitted successfully! We'll contact you soon.",
      enquiryId: enquiry._id,
    });
  } catch (err) {
    console.error("❌ Error processing enquiry:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to submit enquiry",
      message: "Please try again later or contact support",
    });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: ["/", "/health", "/view", "/api/query"],
  });
});

// Global Error
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
    message: process.env.NODE_ENV === "production" ? "Something went wrong" : err.message,
  });
});

// Shutdown
process.on("SIGTERM", async () => {
  console.log("⚠️ SIGTERM received. Closing...");
  await mongoose.connection.close();
  process.exit(0);
});
process.on("SIGINT", async () => {
  console.log("⚠️ SIGINT received. Closing...");
  await mongoose.connection.close();
  process.exit(0);
});

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
