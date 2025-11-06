import express from "express";
import New_Queries from "../Models/NewEnquirySchema.js"; // ✅ This is the correct model
import upload from "../middleware/contractUpload.js";

const router = express.Router();

// ✅ Fetch most recently uploaded contract for this user
router.get("/path/:email", async (req, res) => {
  try {
    const { email } = req.params;
    console.log("📩 Checking contract for:", email);

    const user = await New_Queries.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "No user found for this email." });
    }

    if (!user.contracts || user.contracts.length === 0) {
      return res.status(404).json({ error: "No contract uploaded yet." });
    }

    const latestContract = user.contracts[user.contracts.length - 1];

    const normalizedPath = latestContract.filePath.replace(/\\/g, "/");

    // ✅ IMPORTANT: File is stored in ADMIN backend
    // locally -> http://localhost:5001
    // on render -> https://your-admin-backend-domain.com
    const fullUrl = `https://nripropertybackend.onrender.com/${normalizedPath}`;

    console.log("✅ Final Contract URL:", fullUrl);

    return res.json({ contractPath: fullUrl });

  } catch (err) {
    console.error("❌ Error fetching contract:", err);
    res.status(500).json({ error: "Server error fetching contract." });
  }
});
router.post("/upload-signed-contract", upload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Store path for database if needed
    const filePath = `/uploads/contracts/${req.file.filename}`;

    // TODO: Save filePath to MongoDB associated with the user

    res.json({
      message: "Signed contract uploaded successfully ✅",
      filePath,
    });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
