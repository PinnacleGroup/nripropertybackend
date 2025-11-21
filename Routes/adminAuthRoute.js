// Routes/adminAuthRoute.js
import express from "express";
import jwt from "jsonwebtoken";
import AdminCred from "../Models/AdminCred.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    // 2) Admin find karo
    const admin = await AdminCred.findOne({ email });

    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // 3) PLAIN TEXT compare (DB me bhi plain hai abhi)
    if (password !== admin.password) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }

    // 4) JWT generate karo
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
