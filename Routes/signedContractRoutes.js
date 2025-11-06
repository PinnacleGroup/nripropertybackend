import express from "express";
import upload from "../middleware/contractUpload.js";

const router = express.Router();

router.post("/upload-signed-contract", upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = `/uploads/contracts/${req.file.filename}`;

    // TODO: Save filePath in MongoDB (next step)

    res.json({
      message: "Signed contract uploaded successfully ✅",
      filePath,
    });
  } catch (error) {
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

export default router;
