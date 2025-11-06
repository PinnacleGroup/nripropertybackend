import express from "express";
import NewEnquiry from "../Models/NewEnquirySchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

// 📨 Email Transporter - HARDCODED FOR TESTING
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection failed:", error);
  } else {
    console.log("✅ SMTP server is ready to send emails");
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, country, countryCode, phone, service, message } =
      req.body;

    if (!name || !email || !phone || !country || !service) {
      return res
        .status(400)
        .json({ error: "All required fields must be filled" });
    }

    // 🗃️ Save to DB
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

    // ✉️ Send email
    const mailOptions = {
      from: '"NRIPROPERTY.UK" <pinnacle.chd@gmail.com>',
      to: email,
      subject: "We received your enquiry",
      html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #1a73e8;">Hello ${name},</h2>
      <p>Thank you for your enquiry regarding <b>${service}</b>.</p>
      <p>Our team will review your request and get back to you shortly.</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://nriproperty.uk/login" 
          style="background-color: #1a73e8; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Try Login
        </a>
      </div>

      <p style="font-size: 14px; color: #555;">
        We are committed to providing you with reliable and trusted property services. Your satisfaction is our priority.
      </p>

      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

      <p style="font-size: 14px; color: #888;">
        Regards,<br/>
        <b>NRI Property Management Team</b><br/>
        <i>Trusted by hundreds of satisfied clients worldwide</i>
      </p>
    </div>
  `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${email}`);

    res.status(201).json({
      message: "Enquiry submitted successfully",
      enquiryId: newEnquiry._id,
    });
  } catch (error) {
    console.error("❌ Error saving enquiry:", error);
    res.status(500).json({ error: "Failed to save enquiry" });
  }
});

export default router;
