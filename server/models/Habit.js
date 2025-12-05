const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // owner of this habit
    },
    name: { type: String, required: true },
    category: { type: String, default: "General" }, // e.g. Health, Study, etc.
    color: { type: String, default: "#22c55e" }, // UI tag color
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now }, // when habit started
  },
  { timestamps: true }
);

module.exports = mongoose.model("Habit", habitSchema);
