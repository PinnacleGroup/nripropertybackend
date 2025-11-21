// Backend/Admin/uploadContractRoute.js
import express from "express";

const router = express.Router();

// ✅ TEMP route just to confirm it's working
router.post("/upload-contract/:id", (req, res) => {
  return res.json({
    success: true,
    message: "Upload contract route is wired correctly (backend side).",
    userId: req.params.id,
  });
});

export default router;
