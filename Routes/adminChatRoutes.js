// Admin/adminChatRoutes.js
import express from "express";
import mongoose from "mongoose";
import { New_Queries } from "../Admin/adminModels.js";

const router = express.Router();

/**
 * GET /admin/chat-users
 * → List of users + last message (only isVerified:true)
 */
router.get("/chat-users", async (req, res) => {
  try {
    // ✅ sirf verified users
    const allUsers = await New_Queries.find({ isVerified: true })
      .select("name email createdAt chat customId isVerified")
      .sort({ createdAt: -1 })
      .lean();

    const usersWithLastMessage = allUsers.map((user) => {
      const chat = user.chat || [];
      const lastMsg = chat.length ? chat[chat.length - 1] : null;

      return {
        id: user.customId || String(user._id), // frontend use ke liye
        _id: String(user._id),                 // mongo _id
        name: user.name,
        email: user.email,
        customId: user.customId,
        lastMessage: lastMsg ? lastMsg.text : "",
        lastMessageAt: lastMsg ? lastMsg.createdAt : null,
      };
    });

    // last message ke time ke basis par sort (desc)
    usersWithLastMessage.sort((a, b) => {
      const t1 = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const t2 = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return t2 - t1;
    });

    return res.json({ users: usersWithLastMessage });
  } catch (err) {
    console.error("Error in /admin/chat-users:", err);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * GET /admin/chat/:userId
 * → Get messages by (customId ya _id) — only if isVerified:true
 */
router.get("/chat/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // ✅ agar valid ObjectId hai to _id se, warna customId se
    const baseQuery = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId }
      : { customId: userId };

    const user = await New_Queries.findOne({
      ...baseQuery,
      isVerified: true, // ✅ sirf verified users ka chat
    })
      .select("chat customId isVerified")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found or not verified" });
    }

    console.log(
      "🔎 CHAT FETCH USER:",
      user.customId || user._id,
      "messages:",
      user.chat?.length || 0
    );

    return res.json({ messages: user.chat || [] });
  } catch (err) {
    console.error("Error in GET /admin/chat/:userId:", err);
    return res.status(500).json({ error: "Server Error" });
  }
});

/**
 * POST /admin/chat/:userId
 * → Admin sends message (by customId/_id) — only if isVerified:true
 */
router.post("/chat/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Message text is required" });
    }

    const query = mongoose.Types.ObjectId.isValid(userId)
      ? { _id: userId, isVerified: true }
      : { customId: userId, isVerified: true };

    const user = await New_Queries.findOne(query);

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found or not verified" });
    }

    const msgObj = {
      sender: "admin",
      text: text.trim(),
      createdAt: new Date(),
    };

    if (!Array.isArray(user.chat)) {
      user.chat = [];
    }

    user.chat.push(msgObj);
    await user.save();

    return res.status(201).json({ message: msgObj });
  } catch (err) {
    console.error("Error in POST /admin/chat/:userId:", err);
    return res.status(500).json({ error: "Server Error" });
  }
});

export default router;
