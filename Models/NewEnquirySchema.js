import mongoose from "mongoose";

const NewEnquirySchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    country: String,
    countryCode: String,
    phone: String,
    service: String,
    message: String,
    createdAt: { type: Date, default: Date.now },

    // ✅ This field must be included so client panel can read the saved contract
    contracts: [
      {
        filePath: { type: String },
        uploadedBy: { type: String, default: "Admin" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    signedContractFile: { type: String },

    isApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
  },
  { collection: "New_Queries" } // 👈 SAME collection as admin
);

export default mongoose.model("NewEnquiry", NewEnquirySchema);
