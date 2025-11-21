// Admin/getApprovedUsersRoute.js
import express from "express";
import New_Queries from "../Models/NewEnquirySchema.js";

const router = express.Router();

// ✅ Get all Approved users (not rejected)
router.get("/approved-users", async (req, res) => {
  try {
    const users = await New_Queries.find({ isApproved: true });
    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.log("❌ Error fetching approved users:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
