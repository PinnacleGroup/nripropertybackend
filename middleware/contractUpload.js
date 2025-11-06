import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📁 Storage Location
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/contracts"));
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "");
    cb(null, uniqueName);
  },
});

// ✅ File Filter
const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/png", "image/jpg", "image/jpeg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF/JPG/PNG files allowed"), false);
  }
};

// ✅ Export Upload Middleware (Default Export)
const upload = multer({ storage, fileFilter }).single("signedContract");

export default upload;
