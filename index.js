const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");

dotenv.config();
const app = express();

// ✅ CORS
const allowedOrigins = [
  "https://web-app-frontend-nine.vercel.app",
  "http://localhost:5173",
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json()); // ✅ for parsing JSON

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Blessing schema and model
const blessingSchema = new mongoose.Schema({
  name: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Blessing = mongoose.model("Blessing", blessingSchema);

// ✅ Blessing POST route
app.post("/api/blessings", async (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({ error: "Name and message are required" });
    }

    const newBlessing = new Blessing({ name, message });
    const savedBlessing = await newBlessing.save();

    res.status(201).json(savedBlessing);
  } catch (err) {
    console.error("❌ Error saving blessing:", err);
    res.status(500).json({ error: "Failed to save blessing" });
  }
});

// ✅ Blessing GET route
app.get("/api/blessings", async (req, res) => {
  try {
    const blessings = await Blessing.find().sort({ timestamp: -1 });
    res.json(blessings);
  } catch (err) {
    console.error("❌ Error fetching blessings:", err);
    res.status(500).json({ error: "Failed to fetch blessings" });
  }
});

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
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

// ✅ Upload image route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json(req.file);
});

// ✅ Fetch images per event
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

// ✅ Start server
app.listen(5055, () => {
  console.log("✅ Server running at http://localhost:5055");
});
