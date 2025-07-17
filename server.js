const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config(); // Load .env

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());

// ✅ MongoDB connection with TLS enforced
mongoose
  .connect(MONGODB_URI, {
    ssl: true, // 👈 required for Render + MongoDB Atlas
    serverApi: { version: '1' }, // 👈 helps with latest MongoDB versions
  })
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Schema
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  visits: { type: Number, default: 500 },
});

const Counter = mongoose.model("Counter", counterSchema);

async function initializeCounter() {
  const existing = await Counter.findOne({ name: "pageViews" });
  if (!existing) {
    await Counter.create({ name: "pageViews", visits: 0 });
  }
}

// Route: Get current count
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

// Route: Increment and return count
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

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
