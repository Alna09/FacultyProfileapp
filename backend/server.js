const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// ------------------ Middleware ------------------
// Allow frontend hosted on Vercel
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://faculty-profileapp.vercel.app", // ⬅️ paste your vercel link here
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ------------------ MongoDB Connections ------------------
// Direct connection to MongoDB Atlas (no .env)
mongoose
  .connect(
    "mongodb+srv://alna123:alna123@coding.strbqnx.mongodb.net/?retryWrites=true&w=majority&appName=Coding",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ------------------ Schemas ------------------
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const User = mongoose.model("User", userSchema);

const uploadDir = path.join(__dirname, "faculty_uploadss");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const facultySchema = new mongoose.Schema({
  name: String,
  designation: String,
  department: String,
  photo: String,
  publications: String,
  researchProjects: String,
  articlesAndJournals: String,
  workshops: String,
  coursesHandled: String,
  awardsReceived: String,
});
const Faculty = mongoose.model("Faculty", facultySchema);

// ------------------ Multer Setup ------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ------------------ Serve static folders ------------------
app.use("/login", express.static(path.join(__dirname, "login_folder")));
app.use("/home", express.static(path.join(__dirname, "home_folder")));
app.use("/faculty", express.static(path.join(__dirname, "faculty_folder")));
app.use("/faculty_uploadss", express.static(uploadDir));

// ------------------ Routes ------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ------------------ User Auth ------------------
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid username or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid username or password" });

    res.json({ message: `Welcome ${user.username}`, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error logging in" });
  }
});

// ------------------ Faculty API ------------------
app.post("/api/faculty", upload.single("photo"), async (req, res) => {
  try {
    const newFaculty = new Faculty({
      name: req.body.name,
      designation: req.body.designation,
      department: req.body.department,
      photo: req.file ? `/faculty_uploadss/${req.file.filename}` : "",
      publications: req.body.publications,
      researchProjects: req.body.researchProjects,
      articlesAndJournals: req.body.articlesAndJournals,
      workshops: req.body.workshops,
      coursesHandled: req.body.coursesHandled,
      awardsReceived: req.body.awardsReceived,
    });
    await newFaculty.save();
    res.json({ success: true, message: "Faculty saved successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving faculty" });
  }
});

app.get("/api/faculty", async (req, res) => {
  try {
    const faculties = await Faculty.find({}, "name designation department photo");
    res.json(faculties);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching faculty" });
  }
});

app.get("/api/faculty/:id", async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching faculty" });
  }
});

app.put("/api/faculty/:id", upload.single("photo"), async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });

    const updatedData = {
      name: req.body.name,
      designation: req.body.designation,
      department: req.body.department,
      publications: req.body.publications,
      researchProjects: req.body.researchProjects,
      articlesAndJournals: req.body.articlesAndJournals,
      workshops: req.body.workshops,
      coursesHandled: req.body.coursesHandled,
      awardsReceived: req.body.awardsReceived,
    };

    if (req.file) {
      if (faculty.photo) {
        const oldPath = path.join(__dirname, faculty.photo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updatedData.photo = `/faculty_uploadss/${req.file.filename}`;
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.json({ success: true, message: "Faculty updated successfully!", faculty: updatedFaculty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error updating faculty" });
  }
});

app.delete("/api/faculty/:id", async (req, res) => {
  try {
    const deleted = await Faculty.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Faculty not found" });

    if (deleted.photo) {
      const oldPath = path.join(__dirname, deleted.photo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    res.json({ success: true, message: "Faculty deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error deleting faculty" });
  }
});

// ------------------ Start Server ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
