import express from "express";
import NewEnquiry from "../Models/NewEnquirySchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// 📨 Email Transporter (explicit host/port to avoid cloud timeouts)
const smtpPort = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

// Optional: Verify SMTP connection
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP server ready");
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, country, countryCode, phone, service, message } =
      req.body;

    // 🔎 Validation
    if (!name || !email || !phone || !country || !service) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    // 🗃️ Save to Database
    const newEnquiry = new NewEnquiry({
      name,
      email,
      country,
      countryCode,
      phone,
      service,
      message,
      approvedAt: new Date(),
    });

    await newEnquiry.save();
    console.log("✅ Enquiry saved to database");

    // ✅ Send Success Response (ONLY ONCE)
    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      enquiryId: newEnquiry._id,
    });

    // ✉️ Send Email AFTER Response (Fire & Forget)
    try {
      await transporter.sendMail({
        from: `"NRIPROPERTY.UK" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "We received your enquiry",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Hello ${name},</h2>
            <p>Thank you for your enquiry regarding <b>${service}</b>.</p>
            <p>Our team will contact you shortly.</p>
            <br/>
            <p>Regards,<br/><b>NRI Property Team</b></p>
          </div>
        `,
      });

      console.log("✅ Email sent successfully");
    } catch (emailError) {
      console.error("⚠️ Email failed but enquiry saved:", emailError);
    }

  } catch (error) {
    console.error("❌ Server error:", error);

    // Prevent double response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to save enquiry",
      });
    }
  }
});

export default router;
