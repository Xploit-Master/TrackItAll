// server/routes/userRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");

const router = express.Router();

// all routes require login
router.use(protect);

// GET /api/users/me  → basic profile + some stats
router.get("/me", async (req, res) => {
  try {
    const habitsCount = await Habit.countDocuments({ user: req.user._id });
    const logsCount = await HabitLog.countDocuments({ user: req.user._id });

    const provider = req.user.googleId ? "google" : "local";

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
      provider,
      stats: {
        habitsCount,
        logsCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Error loading profile" });
  }
});

// PATCH /api/users/me  → update name
router.patch("/me", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    req.user.name = name.trim();
    await req.user.save();

    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    });
  } catch (err) {
    res.status(500).json({ message: "Error updating profile" });
  }
});

// GET /api/users/me/export?format=csv  → habit logs CSV
router.get("/me/export", async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();

    if (format !== "csv") {
      return res.status(400).json({ message: "Only CSV export supported for now" });
    }

    const logs = await HabitLog.find({ user: req.user._id })
      .populate("habit")
      .sort({ date: 1 });

    // CSV header
    let csv = "Date,Habit,Category,Completed\n";

    for (const log of logs) {
      const date = log.date;
      const habitName = log.habit?.name || "";
      const category = log.habit?.category || "";
      const completed = log.completed ? "Yes" : "No";

      // escape commas / quotes
      const safe = (value) =>
        `"${String(value).replace(/"/g, '""')}"`;

      csv += [
        safe(date),
        safe(habitName),
        safe(category),
        safe(completed),
      ].join(",") + "\n";
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="habit-progress.csv"'
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Error exporting data" });
  }
});

// DELETE /api/users/me  → delete user + habits + logs
router.delete("/me", async (req, res) => {
  try {
    const userId = req.user._id;

    // delete all habits & logs for this user
    await Habit.deleteMany({ user: userId });
    await HabitLog.deleteMany({ user: userId });

    // delete user itself
    await User.deleteOne({ _id: userId });

    res.json({ message: "Account and all data deleted" });
  } catch (err) {
    console.error("delete /users/me error:", err);
    res.status(500).json({ message: "Error deleting account" });
  }
});

module.exports = router;
