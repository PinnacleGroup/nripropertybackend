import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import SupportQuery from "../Models/SupportQuery.js";

dotenv.config();

const router = express.Router();

// ✅ Create a transporter (Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 🧩 POST /api/support
router.post("/", async (req, res) => {
  try {
    const { name, phone, location, issue } = req.body;

    if (!name || !phone || !location || !issue) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Save to DB
    const newQuery = new SupportQuery({ name, phone, location, issue });
    await newQuery.save();
    // Send notification email
    const mailOptions = {
      from: `"Support - nriproperty.uk" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // send to admin
      subject: `New Support Query from ${name}`,
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px;">
      <h2 style="color: #2c3e50;">📩 New Support Query Received</h2>
      <p style="font-size: 15px;">You’ve received a new client support request. Below are the details:</p>

      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="padding: 8px; font-weight: bold; width: 120px;">Name:</td>
          <td style="padding: 8px;">${name}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 8px; font-weight: bold;">Phone:</td>
          <td style="padding: 8px;">${phone}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Location:</td>
          <td style="padding: 8px;">${location}</td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 8px; font-weight: bold;">Issue:</td>
          <td style="padding: 8px;">${issue}</td>
        </tr>
      </table>



      <p style="font-size: 13px; color: #888; margin-top: 30px;">
        — Automated Notification from Client Support System
      </p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Support query saved and email sent for ${name}`);
    res.status(200).json({ message: "Support query submitted successfully" });
  } catch (error) {
    console.error("❌ Error handling support query:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

export default router;
