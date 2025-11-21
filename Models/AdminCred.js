import mongoose from "mongoose";

const AdminCredSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    password: { type: String, required: true }
  },
  { collection: "admincred" }
);

export default mongoose.model("AdminCred", AdminCredSchema);
