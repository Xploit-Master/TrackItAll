const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");     // <-- REQUIRED for production serving
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/authRoutes");
const habitRoutes = require("./routes/habitRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/users", userRoutes);

// ---------- Serve Frontend in Production ----------
if (process.env.NODE_ENV === "production") {
  // Path to client/build folder
  const clientBuildPath = path.join(__dirname, "..", "client", "build");

  // Serve static React files
  app.use(express.static(clientBuildPath));

  // Handle all non-API routes by sending back React index.html
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ message: "API route not found" });
    }
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// MongoDB connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tasktraq";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
