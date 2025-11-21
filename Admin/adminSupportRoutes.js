import express from "express";
import { Support_Queries } from "../Admin/adminModels.js";

const router = express.Router();

// GET ALL SUPPORT QUERIES
router.get("/supportqueries", async (req, res) => {
  try {
    const data = await Support_Queries.find().sort({ createdAt: -1 });
    res.json({ success: true, queries: data });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

export default router;
