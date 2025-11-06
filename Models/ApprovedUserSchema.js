import mongoose from "mongoose";

const approvedUserSchema = new mongoose.Schema(  {
    email: { type: String, required: true, unique: true },
    // ... other fields
  },
  { 
    timestamps: true,
    collection: "Approved_users" // ✅ Explicitly set collection name
  });

export default mongoose.model("ApprovedUser", approvedUserSchema);
