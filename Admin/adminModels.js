import mongoose from "mongoose";

// ✅ New Queries Schema



// ✅ New Queries Schema
// ✅ New Queries Schema
const ChatItemSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["user", "admin"],
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
  { _id: false }
);

const NewQuerySchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    country: String,
    countryCode: String,
    phone: String,
    service: String,
    message: String,

    isApproved: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    status: { type: String, default: "Pending" },
    contracts: { type: Array, default: [] },
    approvedAt: Date,
    customId: String,

    // 👇 IMPORTANT: chat field
    chat: {
      type: [ChatItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// ✅ Page Views Schema
const PageViewsSchema = new mongoose.Schema({
  pageviews: { type: Number, default: 0 },
}, { timestamps: true });

// ✅ Support Queries Schema
const SupportQuerySchema = new mongoose.Schema({
  name: String,
  phone: String,
  location: String,
  issue: String,
}, { timestamps: true });

// export const New_Queries = mongoose.model("New_Queries", NewQuerySchema);
// export const Page_Views = mongoose.model("page_views", PageViewsSchema);
// export const Support_Queries = mongoose.model("supportqueries", SupportQuerySchema);
export const New_Queries =
  mongoose.models.New_Queries || mongoose.model("New_Queries", NewQuerySchema, "New_Queries");

export const Page_Views =
  mongoose.models.Page_Views || mongoose.model("Page_Views", PageViewsSchema, "Page_Views");

export const Support_Queries =
  mongoose.models.Support_Queries || mongoose.model("supportqueries", SupportQuerySchema, "supportqueries");
