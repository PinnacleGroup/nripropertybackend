import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// Create Mongoose schema/model
const viewSchema = new mongoose.Schema({
  pageviews: { type: Number, default: 0 }
});

const ViewModel = mongoose.models.Page_Views || mongoose.model("Page_Views", viewSchema);

// Get current view count
router.get("/view", async (req, res) => {
  try {
    let doc = await ViewModel.findOne();

    if (!doc) {
      doc = await ViewModel.create({ pageviews: 0 });
    }

    res.json({ visits: doc.pageviews });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Increment view count
router.get("/increment-view", async (req, res) => {
  try {
    let doc = await ViewModel.findOne();

    if (!doc) {
      doc = await ViewModel.create({ pageviews: 1 });
      return res.json({ visits: 1 });
    }

    doc.pageviews += 1;
    await doc.save();

    res.json({ visits: doc.pageviews });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
