// client/src/pages/ForgotPasswordPage.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

function ForgotPasswordPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!email.trim()) return;

    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setMsg("If this email is registered, an OTP has been sent.");
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not send OTP. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!email.trim() || !otp.trim() || !newPassword.trim()) return;

    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password-otp", {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      // auto-login after reset
      login(res.data.token, res.data.user);
      setMsg("Password updated. Redirecting to your dashboard...");
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not reset password. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-emerald-500/30 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-500/20 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-950/70 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">
              {step === 1 ? "Forgot password" : "Verify OTP & reset"}
            </h1>
            <button
              onClick={handleBackToLogin}
              className="text-[11px] text-slate-400 hover:text-emerald-300"
            >
              Back to login
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {step === 1
              ? "Enter the email you used to register. If it matches an account with a password, we’ll send an OTP."
              : "Enter the OTP from your email and choose a new password."}
          </p>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          {msg && (
            <p className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/30 px-3 py-2 rounded-lg">
              {msg}
            </p>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  Registered email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition shadow shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-800 text-slate-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300">OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 outline-none focus:border-emerald-400"
                  placeholder="6-digit code"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-300">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 outline-none focus:border-emerald-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition shadow shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Reset password & login"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
