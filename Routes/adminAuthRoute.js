// Routes/adminAuthRoute.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // agar hash use kar rahe ho
import AdminCred from "../Models/AdminCred.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Admin find karo
    const admin = await AdminCred.findOne({ email });

    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // 2) Agar password plain-text store kiya hai:
    // if (admin.password !== password) { ... }

    // ✅ Better: password hash + compare
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // 3) JWT generate karo
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: "admin",
      },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "1d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

export default router;
