// client/src/pages/ProfilePage.js
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      const res = await api.get("/users/me");
      setProfile(res.data);
      if (res.data.name) {
        setNameInput(res.data.name);
      }
    } catch (err) {
      console.error("Error loading profile", err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSaving(true);
    setMsg("");
    setError("");
    try {
      const res = await api.patch("/users/me", { name: nameInput.trim() });
      updateUser({ name: res.data.name });
      setMsg("Name updated successfully.");
    } catch (err) {
      setError("Failed to update name. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = async () => {
    setMsg("");
    setError("");
    try {
      const res = await api.get("/users/me/export?format=csv", {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "habit-progress.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMsg("CSV downloaded.");
    } catch (err) {
      setError("Failed to download CSV. Try again.");
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setMsg("");
    setError("");
    const confirmed = window.confirm(
      "This will permanently delete your account, habits, and all progress. This cannot be undone. Are you sure?"
    );
    if (!confirmed) return;

    try {
      await api.delete("/users/me");
      // log out locally
      logout();
      navigate("/");
    } catch (err) {
      console.error("Delete account error", err);
      setError("Failed to delete account. Try again.");
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-xs text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-emerald-500/30 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-500/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/25 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <button
            onClick={handleBackToDashboard}
            className="px-3 py-1.5 rounded-xl text-[11px] bg-slate-900 border border-slate-700 hover:border-emerald-400 hover:bg-slate-900/80 transition"
          >
            ← Back to dashboard
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl text-[11px] bg-slate-900 border border-slate-700 hover:border-red-400 hover:text-red-200 hover:bg-red-500/10 transition"
          >
            Logout
          </button>
        </div>

        {/* Profile card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-slate-950/70 space-y-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl font-semibold">Your Profile</h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage your account and download your habit history.
              </p>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="text-[11px] text-slate-400">
                Account type:
              </span>
              <span className="text-[11px] text-slate-100 capitalize">
                {profile?.provider === "google" ? "Google login" : "Email + password"}
              </span>
            </div>
          </div>

          {(error || msg) && (
            <div className="space-y-1">
              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              {msg && !error && (
                <p className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/30 px-3 py-2 rounded-lg">
                  {msg}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: edit name + basic info */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Display name</label>
                <form onSubmit={handleSaveName} className="flex gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-slate-950 border border-slate-700 outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-2 text-xs rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition shadow shadow-emerald-500/40 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </form>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-300">Email</p>
                <p className="text-xs text-slate-400 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-xl">
                  {profile?.email}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-300">Member since</p>
                <p className="text-xs text-slate-400">
                  {formatDate(profile?.createdAt)}
                </p>
              </div>
            </div>

            {/* Right: stats + export + danger zone */}
            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <p className="text-[11px] text-slate-400 mb-2">
                  Snapshot of your activity
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-300">
                      {profile?.stats?.habitsCount ?? 0}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      total habits
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-300">
                      {profile?.stats?.logsCount ?? 0}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      habit check-ins
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2">
                <p className="text-[11px] text-slate-400">
                  Export a CSV of all your habit logs. You can open it in Excel,
                  Google Sheets or any spreadsheet tool.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-sky-500 text-slate-950 font-semibold hover:bg-sky-400 transition shadow shadow-sky-500/40"
                >
                  Download progress as CSV
                </button>
              </div>

              <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-3 space-y-2">
                <p className="text-[11px] text-red-200 font-semibold">
                  Danger zone
                </p>
                <p className="text-[11px] text-red-200/80">
                  Deleting your account will erase all habits, logs and
                  profile data. This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-red-500 text-slate-950 font-semibold hover:bg-red-400 transition shadow shadow-red-600/40"
                >
                  Delete my account permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
