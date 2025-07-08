const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
const app = express();
dotenv.config();
const allowedOrigins = [
  "https://web-app-frontend-nine.vercel.app",
  "https://web-app-frontend-nine.vercel.app/blessings", // ✅ your deployed Vercel frontend
  'http://localhost:5173' // optional: for local dev
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));


app.use(express.json()); // ✅ To parse JSON body

// 🔸 Blessings memory store (replace with DB later)
let blessings = [];

// ✅ Blessing POST route
app.post("/api/blessings", (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: "Name and message are required" });
  }

  const blessing = {
    name,
    message,
    timestamp: new Date().toISOString(),
  };

  blessings.unshift(blessing); // add to beginning (most recent first)
  res.status(201).json(blessing);
});

// ✅ Blessing GET route
app.get("/api/blessings", (req, res) => {
  res.json(blessings);
});

// 🔄 Cloudinary setup (no change)
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

// ✅ Upload image
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json(req.file);
});

// ✅ Fetch event images
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
  console.log("✅ Server running at http://localhost:5055");
});
