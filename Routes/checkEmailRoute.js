import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email } = req.body;

  console.log("📧 Checking email:", email);

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    // Check if user exists in New_queries collection
    const user = await newQueriesCollection.findOne({
      email: email.toLowerCase(),
    });

    console.log("👤 User found:", user ? "Yes" : "No");

    if (!user) {
      return res.status(404).json({
        success: false,
        status: "not_found",
        message: "No account found with this email. Please submit a query first.",
      });
    }

    // Check if user is approved
    if (!user.isApproved) {
      console.log("⏳ User pending approval");
      return res.status(403).json({
        success: false,
        status: "pending_approval",
        message: "Your request is under review. Please wait for approval.",
      });
    }

    // User is approved but not verified (needs to complete contract)
    if (user.isApproved && !user.isVerified) {
      console.log("📄 User approved but not verified - needs contract");
      return res.status(200).json({
        success: true,
        status: "approved_not_verified",
        isVerified: false,
        isApproved: true,
        message: "Please complete the contract verification.",
        user: {
          email: user.email,
          name: user.name || "User", // ✅ Fallback if name is missing
          isVerified: false,
          isApproved: true,
        },
      });
    }

    // User is fully approved and verified
    console.log("✅ User fully verified");
    return res.status(200).json({
      success: true,
      status: "verified",
      isVerified: true,
      isApproved: true,
      message: "User verified successfully.",
      user: {
        email: user.email,
        name: user.name || "User", // ✅ Fallback if name is missing
        isVerified: true,
        isApproved: true,
      },
    });
  } catch (error) {
    console.error("❌ Error checking email:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
});

export default router;