import express from "express";
import New_Queries from "../Models/NewEnquirySchema.js";

const router = express.Router();

// ✅ Fetch all users with contracts & signed documents
router.get("/new-queries", async (req, res) => {
  try {
    const docs = await New_Queries.find({}).sort({ createdAt: -1 });

    const users = docs.map((user) => {
      const u = user.toObject();

      // 🔹 Format contracts
      const contracts = (u.contracts || []).map((c, index) => ({
        name: c.filePath?.split("/").pop() || `Contract ${index + 1}`,
        url: c.filePath || "",
      }));

      // 🔹 Format documents
      const documents = [];
      if (u.signedContractFile) {
        documents.push({
          name: u.signedContractFile.split("/").pop(),
          url: u.signedContractFile,
        });
      }

      return {
        customId: u.customId || u._id, // 🟦 PRINT CUSTOM ID INSTEAD OF MONGO _id
        name: u.name,
        email: u.email,
        country: u.country,
        phoneCode: u.countryCode,
        phone: u.phone,

        // ✅ Yahi pe missing tha:
        service: u.service,
        message: u.message, // (optional, if you want it)

        contracts,
        documents,

        isApproved: u.isApproved,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
      };
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error("❌ Error fetching queries:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
