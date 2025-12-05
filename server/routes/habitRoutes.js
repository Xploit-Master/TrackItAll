const express = require("express");
const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All habit routes require auth
router.use(protect);

// GET /api/habits - all habits for this user
router.get("/", async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({
      createdAt: 1,
    });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/habits - create habit for this user
router.post("/", async (req, res) => {
  try {
    const { name, category, color } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const habit = await Habit.create({
      user: req.user._id,
      name,
      category: category || "General",
      color: color || "#22c55e",
    });

    res.status(201).json(habit);
  } catch (err) {
    res.status(400).json({ message: "Error creating habit" });
  }
});

// PATCH /api/habits/:id - update only own habit
router.patch("/:id", async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.json(habit);
  } catch (err) {
    res.status(400).json({ message: "Error updating habit" });
  }
});

// DELETE /api/habits/:id - delete own habit + logs
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Habit.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Habit not found" });
    }

    await HabitLog.deleteMany({
      habit: req.params.id,
      user: req.user._id,
    });

    res.json({ message: "Habit deleted" });
  } catch (err) {
    res.status(400).json({ message: "Error deleting habit" });
  }
});

// GET /api/habits/logs?month=YYYY-MM - logs for that month (this user)
router.get("/logs", async (req, res) => {
  try {
    const { month } = req.query; // e.g. "2025-12"

    if (!month) {
      return res.status(400).json({ message: "month query is required" });
    }

    const regex = new RegExp(`^${month}`); // match "YYYY-MM"

    const logs = await HabitLog.find({
      user: req.user._id,
      date: regex,
    }).populate("habit");

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching logs" });
  }
});

// POST /api/habits/:id/log - toggle / set completion
router.post("/:id/log", async (req, res) => {
  try {
    const { date, completed } = req.body; // "YYYY-MM-DD"
    const habitId = req.params.id;

    if (!date) {
      return res.status(400).json({ message: "date is required" });
    }

    // verify habit belongs to this user
    const habit = await Habit.findOne({
      _id: habitId,
      user: req.user._id,
    });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    let log = await HabitLog.findOne({
      habit: habitId,
      user: req.user._id,
      date,
    });

    if (!log) {
      log = await HabitLog.create({
        habit: habitId,
        user: req.user._id,
        date,
        completed: !!completed,
      });
    } else {
      log.completed = !!completed;
      await log.save();
    }

    const populated = await log.populate("habit");
    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: "Error updating log" });
  }
});

module.exports = router;
