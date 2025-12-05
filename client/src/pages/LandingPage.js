// client/src/pages/LandingPage.js
import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-emerald-500/30 blur-3xl rounded-full" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-cyan-500/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/25 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 flex flex-col items-center text-center gap-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          TrackItAll
          <span className="block text-emerald-300 text-xl md:text-2xl mt-2">
            Monthly Habit Dashboard
          </span>
        </h1>
        <p className="text-slate-400 max-w-xl text-sm md:text-base">
          One clean dashboard to see your habits, your streaks and your progress.  
          Built to make consistency feel visual and addictive.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            to="/register"
            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold hover:bg-emerald-400 transition shadow shadow-emerald-500/40"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-6 py-2.5 rounded-xl border border-slate-700 bg-slate-900/70 text-sm hover:border-emerald-400 transition"
          >
            I already have an account
          </Link>
        </div>

        <p className="text-[11px] text-slate-500 mt-4">
          No apps. No clutter. Just your habits in a calendar that actually motivates you.
        </p>
      </div>
    </div>
  );
}

export default LandingPage;
