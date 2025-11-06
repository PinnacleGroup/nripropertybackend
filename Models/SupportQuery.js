import mongoose from "mongoose";

const SupportQuerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    issue: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("SupportQuery", SupportQuerySchema);
