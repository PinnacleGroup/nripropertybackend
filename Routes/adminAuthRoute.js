import express from "express";
import AdminCred from "../Models/AdminCred.js";
import jwt from "jsonwebtoken";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin in DB
    const admin = await AdminCred.findOne({ email });

    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // If passwords don't match
    if (admin.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
