import express from "express";
import { New_Queries, Page_Views, Support_Queries } from "./adminModels.js";

const router = express.Router();

// 1️⃣ Queries Stats Route
router.get("/queries-stats", async (req, res) => {
  try {
    const totalQueries = await New_Queries.countDocuments();
    const pendingQueries = await New_Queries.countDocuments({ isApproved: false, isVerified: false });
    const approvedQueries = await New_Queries.countDocuments({ isApproved: true, isVerified: false });
    const verifiedQueries = await New_Queries.countDocuments({ isApproved: true, isVerified: true });

    res.json({ totalQueries, pendingQueries, approvedQueries, verifiedQueries,chats: verifiedQueries, });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// 2️⃣ Page Views
router.get("/pageviews", async (req, res) => {
  try {
    const latest = await Page_Views.findOne().sort({ createdAt: -1 });
    res.json({ pageviews: latest?.pageviews || 0 });
  } catch {
    res.status(500).json({ error: "Server Error" });
  }
});

// 3️⃣ Support Queries Count
router.get("/supportqueries-count", async (req, res) => {
  try {
    const count = await Support_Queries.countDocuments();
    res.json({ count });
  } catch {
    res.status(500).json({ error: "Server Error" });
  }
});

export default router;
