const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config(); // Load .env file

const app = express();
const PORT = process.env.PORT; // ✅ Use only Render-assigned port in production

const MONGODB_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Stop the app if MongoDB fails
  });

// Mongoose schema & model
const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  visits: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

// Initialize counter once if not present
async function initializeCounter() {
  const existing = await Counter.findOne({ name: "pageViews" });
  if (!existing) {
    await Counter.create({ name: "pageViews", visits: 0 });
  }
}

// Route to get view count without increment
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

// Route to increment and return view count
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
  console.log(`✅ MongoDB Counter server running at http://localhost:${PORT}`);
});
