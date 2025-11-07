import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// GET: Fetch dashboard data for logged-in user
router.get("/dashboard-data", verifyToken, async (req, res) => {
  console.log("\n=== DASHBOARD DATA REQUEST ===");
  console.log("User from token:", req.user);

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState !== 1) {
      console.error("❌ MongoDB not connected");
      return res.status(500).json({
        success: false,
        message: "Database connection not established. Please try again shortly.",
      });
    }

    const userEmail = req.user.email.toLowerCase();
    console.log("📧 Fetching data for:", userEmail);

    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    // Fetch user data
    const userData = await newQueriesCollection.findOne(
      { email: userEmail },
      {
        projection: {
          otp: 0, // Exclude OTP
          otpExpiry: 0, // Exclude OTP expiry
        },
      }
    );

    if (!userData) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User data not found",
      });
    }

    console.log("✅ User data found:", userData.name);

    // Prepare response data
    const dashboardData = {
      // User Profile Info
      profile: {
        id: userData._id,
        name: userData.name || "User",
        email: userData.email,
        phone: userData.phone || "N/A",
        country: userData.country || "N/A",
        countryCode: userData.countryCode || "N/A",
        memberSince: userData.createdAt || new Date(),
      },

      // Query Status
      query: {
        service: userData.service || "N/A",
        message: userData.message || "",
        status: userData.status || "Under Process",
        isApproved: userData.isApproved || false,
        isVerified: userData.isVerified || false,
        approvedAt: userData.approvedAt || null,
        updatedAt: userData.updatedAt || null,
      },

      // Contract Documents
      contracts: userData.contracts || [],

      // Admin Notifications (if any)
      notifications: userData.adminNotifications || [],

      // Document Submissions
      documents: userData.uploadedDocuments || [],
    };

    console.log("✅ Dashboard data prepared successfully");

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("❌ Dashboard Data Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
});

// GET: Fetch user profile
router.get("/profile", verifyToken, async (req, res) => {
  console.log("\n=== PROFILE REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const userEmail = req.user.email.toLowerCase();
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const userData = await newQueriesCollection.findOne(
      { email: userEmail },
      {
        projection: {
          otp: 0,
          otpExpiry: 0,
        },
      }
    );

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      profile: {
        id: userData._id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        country: userData.country,
        countryCode: userData.countryCode,
        memberSince: userData.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
});

// GET: Fetch contracts/documents
router.get("/contracts", verifyToken, async (req, res) => {
  console.log("\n=== CONTRACTS REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const userEmail = req.user.email.toLowerCase();
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const userData = await newQueriesCollection.findOne(
      { email: userEmail },
      {
        projection: {
          contracts: 1,
          uploadedDocuments: 1,
        },
      }
    );

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      contracts: userData.contracts || [],
      uploadedDocuments: userData.uploadedDocuments || [],
    });
  } catch (error) {
    console.error("❌ Contracts Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contracts",
      error: error.message,
    });
  }
});

// GET: Fetch admin notifications
router.get("/notifications", verifyToken, async (req, res) => {
  console.log("\n=== NOTIFICATIONS REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const userEmail = req.user.email.toLowerCase();
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const userData = await newQueriesCollection.findOne(
      { email: userEmail },
      {
        projection: {
          adminNotifications: 1,
        },
      }
    );

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      notifications: userData.adminNotifications || [],
    });
  } catch (error) {
    console.error("❌ Notifications Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
});

// POST: Upload document response
router.post("/upload-document", verifyToken, async (req, res) => {
  console.log("\n=== UPLOAD DOCUMENT REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const { fileName, fileSize, fileUrl } = req.body;
    const userEmail = req.user.email.toLowerCase();

    if (!fileName || !fileSize) {
      return res.status(400).json({
        success: false,
        message: "File name and size are required",
      });
    }

    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const uploadedDoc = {
      fileName,
      fileSize,
      fileUrl: fileUrl || "#",
      uploadedAt: new Date(),
      status: "Under Review",
    };

    const result = await newQueriesCollection.updateOne(
      { email: userEmail },
      {
        $push: { uploadedDocuments: uploadedDoc },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Failed to upload document",
      });
    }

    console.log("✅ Document uploaded successfully");

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      document: uploadedDoc,
    });
  } catch (error) {
    console.error("❌ Upload Document Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
});

// GET: Fetch chat messages (if stored in DB)
router.get("/messages", verifyToken, async (req, res) => {
  console.log("\n=== MESSAGES REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const userEmail = req.user.email.toLowerCase();
    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const userData = await newQueriesCollection.findOne(
      { email: userEmail },
      {
        projection: {
          chatMessages: 1,
        },
      }
    );

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      messages: userData.chatMessages || [],
    });
  } catch (error) {
    console.error("❌ Messages Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
});

// POST: Send chat message
router.post("/send-message", verifyToken, async (req, res) => {
  console.log("\n=== SEND MESSAGE REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const { message } = req.body;
    const userEmail = req.user.email.toLowerCase();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const chatMessage = {
      sender: "User",
      text: message,
      timestamp: new Date(),
    };

    const result = await newQueriesCollection.updateOne(
      { email: userEmail },
      {
        $push: { chatMessages: chatMessage },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Failed to send message",
      });
    }

    console.log("✅ Message sent successfully");

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      chatMessage,
    });
  } catch (error) {
    console.error("❌ Send Message Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
});

// PUT: Update profile
router.put("/update-profile", verifyToken, async (req, res) => {
  console.log("\n=== UPDATE PROFILE REQUEST ===");

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({
        success: false,
        message: "Database connection not established.",
      });
    }

    const { name, phone, country, countryCode } = req.body;
    const userEmail = req.user.email.toLowerCase();

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (country) updateFields.country = country;
    if (countryCode) updateFields.countryCode = countryCode;
    updateFields.updatedAt = new Date();

    if (Object.keys(updateFields).length === 1) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const db = mongoose.connection.db;
    const newQueriesCollection = db.collection("New_Queries");

    const result = await newQueriesCollection.updateOne(
      { email: userEmail },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Failed to update profile",
      });
    }

    console.log("✅ Profile updated successfully");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("❌ Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
});

export default router;