import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import NewEnquiry from "../Models/NewEnquirySchema.js";

const router = express.Router();

// ✅ Ensure folder exists
const uploadFolder = "uploads/contracts";
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// ✅ File Storage Settings
const storage = multer.diskStorage({
  destination: uploadFolder,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ UPLOAD & SAVE CONTRACT TO DB
router.post("/upload-contract/:userId", upload.single("contractFile"), async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = `/uploads/contracts/${req.file.filename}`;

    const updatedUser = await NewEnquiry.findByIdAndUpdate(
      userId,
      {
        $push: {
          contracts: {
            filePath,
            uploadedBy: "Admin",
          },
        },
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Contract uploaded successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.log("❌ Upload error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
