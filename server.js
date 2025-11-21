

// ✅ Load dotenv FIRST
import dotenv from "dotenv";
dotenv.config();

// 📦 Imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Routes (Old + New)
import registerRoute from "./Routes/registerRoute.js";
import checkEmailRoute from "./Routes/checkEmailRoute.js";
import otpAuthRoute from "./Routes/OtpAuthRoute.js"; // ← use NEW naming
import dashboardRoute from "./Routes/dashboardRoute.js"; // ← NEW
import viewsRouter from "./Routes/views.js";
import ClientSupportRoute from "./Routes/ClientSupportRoute.js";
import contractRoutes from "./Routes/contractRoutes.js";
import signedContractRoutes from "./Routes/signedContractRoutes.js";
import New_Queries from "./Models/NewEnquirySchema.js";
import newQueriesRoute from "./Admin/newQueriesRoute.js";
import getApprovedUsersRoute from "./Admin/getApprovedUsersRoute.js";
import uploadContractRoute from "./Admin/uploadContractRoute.js";

// ✅ Admin Routes
import adminDashboardRoutes from "./Admin/adminDashboardRoutes.js";
import adminChatRoutes from "./Routes/adminChatRoutes.js";
import adminSupportRoutes from "./Admin/adminSupportRoutes.js";
import adminAuthRoute from "./Routes/adminAuthRoute.js";





// ✅ Setup
const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔒 CORS Setup
app.use(
  cors({
    origin: [
      "https://nriproperty.uk",
      "https://www.nriproperty.uk",
      "http://localhost:5173",
      "http://localhost:5000"
    ], 
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🧩 MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/NRIs_Data", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB");
    console.log("📊 Database:", mongoose.connection.db.databaseName);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Admin Routes

app.use("/admin", adminDashboardRoutes);
app.use("/admin", newQueriesRoute);
app.use("/admin", getApprovedUsersRoute);
app.use("/admin", uploadContractRoute);
app.use("/admin", adminSupportRoutes);
app.use("/admin", adminChatRoutes);
app.use("/admin", adminAuthRoute);
// 🛣️ ROUTES
app.use("/api/views", viewsRouter);
app.use("/api/register", registerRoute);

// ✅ Use NEW OTP + Login Auth Route
app.use("/api/auth", otpAuthRoute);

app.use("/api/support", ClientSupportRoute);
app.use("/api/contract", contractRoutes);
app.use("/api/contract-signed", signedContractRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ NEW Dashboard Route
app.use("/api/dashboard", dashboardRoute);



// ✅ NEW Check Email Logic (Merged)
app.post("/api/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email is required" });

    const normalizedEmail = email.trim().toLowerCase();
    const user = await New_Queries.findOne({ email: normalizedEmail });

    if (!user)
      return res.status(404).json({ success: false, message: "No account found" });

    if (!user.isApproved)
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval",
        isApproved: false,
      });

    res.status(200).json({
      success: true,
      message: "Email valid",
      isVerified: user.isVerified || false,
      isApproved: user.isApproved || false,
      user: { email: user.email, name: user.name },
    });

  } catch (error) {
    console.error("❌ Check Email Error:", error);
    res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ✅ Get user details
app.get("/api/user-details", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await New_Queries.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      name: user.name,
      customid: user.customId,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
});

// ✅ Root Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "NRI Property Backend API is running ✅",
    timestamp: new Date(),
  });
});

// 🚀 START SERVER
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

export default app;
