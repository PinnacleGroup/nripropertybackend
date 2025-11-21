import mongoose from "mongoose";

// 🧩 Embedded Chat Schema (per user)
const ChatItemSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin"], // dono allowed
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false, // har chat message ka alag _id nahi chahiye
  }
);

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

    // ✅ Contracts info
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

    // ✅ NAYA FIELD: Chat history embedded inside user
    chat: {
      type: [ChatItemSchema],
      default: [],
    },
  },
  { collection: "New_Queries" } // same collection
);

export default mongoose.model("NewEnquiry", NewEnquirySchema);
