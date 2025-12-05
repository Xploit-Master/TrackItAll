// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // not required for Google-only accounts
    googleId: { type: String }, // set when logging in via Google
     // 🔐 Password reset via OTP
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
