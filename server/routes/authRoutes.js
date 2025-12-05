// server/routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name || email.split("@")[0],
      email,
      password: hashed,
    });

    const token = createToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Error registering user" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = createToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Missing credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || email.split("@")[0];
    const googleId = payload.sub;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = createToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: "Error with Google login" });
  }
});

//
// 🔐 Forgot password (OTP flow)
//

// POST /api/auth/forgot-password
// body: { email }
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // If no user or Google-only account (no password), we don't send OTP
    if (!user || !user.password) {
      return res.status(400).json({
        message:
          "No password-based account found with this email. If you use Google login, use 'Sign in with Google'.",
      });
    }

    // 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    user.resetOtp = otp;
    user.resetOtpExpires = expires;
    await user.save();

    const subject = "TrackItAll Password Reset OTP";
    const text = `Your OTP to reset your TrackItAll password is: ${otp}\n\nThis code is valid for 10 minutes. If you did not request this, you can ignore this email.`;

    await sendEmail({
      to: user.email,
      subject,
      text,
    });

    res.json({ message: "OTP sent to your email if the account exists." });
  } catch (err) {
    console.error("forgot-password error:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
});

// POST /api/auth/reset-password-otp
// body: { email, otp, newPassword }
router.post("/reset-password-otp", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({ message: "No active reset request" });
    }

    const now = new Date();

    if (now > user.resetOtpExpires) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // All good → update password and clear OTP fields
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    const token = createToken(user._id);
    res.json({
      message: "Password updated successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("reset-password-otp error:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
});

module.exports = router;
