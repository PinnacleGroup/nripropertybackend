import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import New_Queries from "../Models/NewEnquirySchema.js";
import upload from "../middleware/contractUpload.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ✅ Fetch the latest contract for the user
 */
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

    // Normalize path for both Windows/Linux
    const normalizedPath = latestContract.filePath.replace(/\\/g, "/");

    const fullUrl = `https://nripropertybackend.onrender.com${normalizedPath}`;

    console.log("✅ Final Contract URL:", fullUrl);

    return res.json({ contractPath: fullUrl });

  } catch (err) {
    console.error("❌ Error fetching contract:", err);
    res.status(500).json({ error: "Server error fetching contract." });
  }
});


/**
 * ✅ Upload Signed Contract (User Uploads Back)
 */
router.post("/upload-signed-contract", upload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = `/uploads/contracts/${req.file.filename}`;

    // TODO: Save filePath to user model (if needed)
    // Example:
    // await New_Queries.updateOne({ email: req.body.email }, {
    //   $push: { signedContracts: { filePath, uploadedAt: new Date() } }
    // });

    res.json({
      message: "Signed contract uploaded successfully ✅",
      filePath,
    });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});


/**
 * ✅ DOWNLOAD CONTRACT → The one you wanted
 */
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;

  // Contract files stored in /uploads/contracts/
  const filePath = path.join(__dirname, "../uploads/contracts", filename);

  console.log("📥 Download Request:", filePath);

  res.download(filePath, (err) => {
    if (err) {
      console.log("❌ Download Error:", err);
      return res.status(404).json({ success: false, message: "File not found" });
    }
  });
});

export default router;
