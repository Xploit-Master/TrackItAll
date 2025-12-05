// client/src/pages/LoginPage.js
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import api from "../api";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to login. Please try again."
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post("/auth/google", {
        credential: credentialResponse.credential,
      });
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError("Google login failed. Try again.");
    }
  };

  const handleGoogleError = () => {
    setError("Google login cancelled.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-emerald-500/30 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-500/20 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-950/70">
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-xs text-slate-400 mb-4">
            Login to see your personal habit dashboard.
          </p>

          {error && (
            <p className="text-xs text-red-400 mb-3 bg-red-950/40 border border-red-500/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-[11px] text-emerald-300 hover:underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="w-full mt-1 px-3 py-2 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition shadow shadow-emerald-500/40"
            >
              Login
            </button>
          </form>


          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-slate-700" />
            <span className="text-[11px] text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-700" />
          </div>

          <div className="flex justify-center mb-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </div>

          <p className="text-[11px] text-center text-slate-400 mt-2">
            Don&apos;t have an account?{" "}
            <Link
              to="/register"
              className="text-emerald-300 underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
