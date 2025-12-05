// server/models/HabitLog.js
const mongoose = require("mongoose");

const habitLogSchema = new mongoose.Schema(
  {
    habit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
    },

    // 👈 NEW: owner of this log entry
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String, // e.g. "2025-12-04"
      required: true,
    },

    completed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent duplicate logs per habit per date per user
habitLogSchema.index(
  { habit: 1, user: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("HabitLog", habitLogSchema);
