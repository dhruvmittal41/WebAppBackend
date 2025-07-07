// index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

dotenv.config();

const app = express();
app.use(cors());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🟢 Use Multer AFTER setting up storage with event-aware folder
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // req.body is NOT available yet — so we read from req.query instead
    const event = req.query.event || "Uncategorized";
    console.log("📦 Uploading to event folder:", event);

    return {
      folder: `wedding/private/${event}`,
      public_id: file.originalname.split(".")[0],
      resource_type: "image",
    };
  },
});

const upload = multer({ storage });

// ✅ Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json(req.file);
});



app.get("/images/:event", async (req, res) => {
  const event = req.params.event;

  try {
    const result = await cloudinary.search
      .expression(`folder:wedding/private/${event}`)
      .sort_by("created_at", "desc")
      .max_results(30)
      .execute();

    const urls = result.resources.map((img) => img.secure_url);
    res.json({ images: urls });
  } catch (err) {
    console.error("[IMAGE FETCH ERROR]", err);
    res.status(500).json({ error: "Failed to fetch images" });
  }
});


app.listen(5055, () => {
  console.log("✅ Cloudinary upload server running at http://localhost:5055");
});
