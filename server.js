// ✅ Load dotenv FIRST
import dotenv from "dotenv";
dotenv.config();

// 📦 Imports
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import registerRoute from "./Routes/registerRoute.js";
import checkEmailRoute from "./Routes/checkEmailRoute.js";
import otpAuthRoute from "./Routes/OtpAuthRoute.js";
import viewsRouter from "./Routes/views.js";
import ClientSupportRoute from "./Routes/ClientSupportRoute.js";
import contractRoutes from "./Routes/contractRoutes.js"; // ✅ Added
import New_Queries from "./Models/NewEnquirySchema.js"; // ✅ same model name
import signedContractRoutes from "./Routes/signedContractRoutes.js";

// ✅ Setup
const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔒 CORS Setup
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://nriproperty.uk",
//       "https://www.nriproperty.uk",
//       "https://nripropertybackend.onrender.com",
//       "nriproperty.uk",
//       "www.nriproperty.uk",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: ['*'],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// 🧩 MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: "NRIs_Data",
  })
  .then(() => console.log("✅ Connected to MongoDB: NRIs_Data"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

mongoose.connection.once("open", async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log("📂 Collections:");
  collections.forEach((col) => console.log(` - ${col.name}`));
});

// 🛣️ ROUTES (✅ Put after app is defined)
app.use("/api/views", viewsRouter);  
app.use("/api/register", registerRoute);
app.use("/api/check-email", checkEmailRoute);
app.use("/api/auth", otpAuthRoute);
app.use("/api/support", ClientSupportRoute);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/contract", contractRoutes); // ✅ Added contract routes
app.use("/api/contract-signed", signedContractRoutes);   // ✅ namespace added
                    // ✅ placed after, unique prefix
app.use("/uploads", express.static("uploads")); // allow access to uploaded files

// ✅ ROOT CHECK
app.get("/", (req, res) => res.send("Backend running ✅"));

// 🚀 START SERVER
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
