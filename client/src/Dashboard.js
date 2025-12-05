import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import api from "./api";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";

// Days in a given month (year, monthIndex = 0–11)
const getMonthDays = (year, monthIndex) => {
  const date = new Date(year, monthIndex + 1, 0);
  return date.getDate();
};

// Format date like "04 Dec 2025"
const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return null;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Stats for dashboard (given habits, logs for month, and daysInMonth)
const computeStats = (habits, logs, daysInMonth) => {
  if (!habits.length || !daysInMonth) return null;

  const totalPossible = habits.length * daysInMonth;
  const totalCompleted = logs.filter((l) => l.completed).length;
  const overallCompletion = totalPossible
    ? Math.round((totalCompleted / totalPossible) * 100)
    : 0;

  // Per habit stats
  const perHabitStats = habits
    .map((h) => {
      const completedDays = logs.filter(
        (l) => l.habit._id === h._id && l.completed
      ).length;

      const percent = daysInMonth
        ? Math.round((completedDays / daysInMonth) * 100)
        : 0;

      return {
        habitId: h._id,
        name: h.name,
        completedDays,
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  // Weekly stats (Week 1 = 1-7, Week 2 = 8-14, ...)
  const weekRanges = [
    { label: "Week 1", start: 1, end: 7 },
    { label: "Week 2", start: 8, end: 14 },
    { label: "Week 3", start: 15, end: 21 },
    { label: "Week 4", start: 22, end: 28 },
    { label: "Week 5", start: 29, end: 31 },
  ];

  const weeks = weekRanges.map((w) => {
    const effectiveEnd = Math.min(w.end, daysInMonth);
    if (w.start > effectiveEnd) {
      return {
        label: w.label,
        completed: 0,
        total: 0,
        percent: 0,
        start: w.start,
        end: effectiveEnd,
      };
    }
    const daysInWeek = effectiveEnd - w.start + 1;
    const total = daysInWeek * habits.length;

    return {
      label: w.label,
      start: w.start,
      end: effectiveEnd,
      completed: 0,
      total,
      percent: 0,
    };
  });

  logs.forEach((log) => {
    if (!log.completed) return;
    const parts = log.date.split("-");
    const day = parseInt(parts[2], 10);
    const idx = weeks.findIndex(
      (w) => day >= w.start && day <= w.end
    );
    if (idx !== -1) {
      weeks[idx].completed += 1;
    }
  });

  weeks.forEach((w) => {
    if (w.total > 0) {
      w.percent = Math.round((w.completed / w.total) * 100);
    } else {
      w.percent = 0;
    }
  });

  return {
    overallCompletion,
    totalCompleted,
    totalPossible,
    perHabitStats,
    weeklyStats: weeks.filter((w) => w.total > 0),
  };
};

// Build matrix for calendar view (weeks x 7 days)
const buildCalendarMatrix = (year, monthIndex) => {
  const daysInMonth = getMonthDays(year, monthIndex);
  const firstDay = new Date(year, monthIndex, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sunday

  const weeks = [];
  let currentDay = 1 - startWeekday;

  while (currentDay <= daysInMonth) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (currentDay < 1 || currentDay > daysInMonth) {
        week.push(null);
      } else {
        week.push(currentDay);
      }
      currentDay++;
    }
    weeks.push(week);
  }

  return weeks;
};

// simple variants for cards
const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function Dashboard() {
  // Real "today" (for lock rules)
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonthIndex = today.getMonth();
  const todayDay = today.getDate();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Currently viewed month (can navigate)
  const [currentDate, setCurrentDate] = useState(
    () => new Date(todayYear, todayMonthIndex, 1)
  );

  const handleLogout = () => {
    logout();
    navigate("/"); // send back to landing page
  };

  const goToProfile = () => {
    navigate("/profile");
  };
  const year = currentDate.getFullYear();
  const monthIndex = currentDate.getMonth();

  const [habits, setHabits] = useState([]);
  const [logs, setLogs] = useState([]);
  const [prevLogs, setPrevLogs] = useState([]);
  const [newHabitName, setNewHabitName] = useState("");
  const [selectedDay, setSelectedDay] = useState(todayDay);

  // rename state
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingHabitName, setEditingHabitName] = useState("");

  const monthString = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const daysInMonth = getMonthDays(year, monthIndex);
  const calendarMatrix = buildCalendarMatrix(year, monthIndex);

  const viewingCurrentMonth =
    year === todayYear && monthIndex === todayMonthIndex;

  // Previous month info (for last month summary)
  const prevMonthDate = new Date(year, monthIndex - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonthIndex = prevMonthDate.getMonth();
  const prevMonthString = `${prevYear}-${String(prevMonthIndex + 1).padStart(
    2,
    "0"
  )}`;
  const prevDaysInMonth = getMonthDays(prevYear, prevMonthIndex);

  // ==== API helpers (memoized) ====
  const fetchHabits = useCallback(async () => {
    const res = await api.get("/habits");
    setHabits(res.data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await api.get(`/habits/logs?month=${monthString}`);
    setLogs(res.data);
  }, [monthString]);

  const fetchPrevLogs = useCallback(async () => {
    const res = await api.get(`/habits/logs?month=${prevMonthString}`);
    setPrevLogs(res.data);
  }, [prevMonthString]);

  // Initial habits load
  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Logs reload on month change (current + previous)
  useEffect(() => {
    fetchLogs();
    fetchPrevLogs();
  }, [fetchLogs, fetchPrevLogs]);

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    await api.post("/habits", { name: newHabitName });
    setNewHabitName("");
    fetchHabits();
    fetchLogs();
    fetchPrevLogs();
  };

  const handleDeleteHabit = async (id) => {
    if (!window.confirm("Delete this habit and all its history?")) return;
    await api.delete(`/habits/${id}`);
    fetchHabits();
    fetchLogs();
    fetchPrevLogs();
  };

  // Start editing habit name
  const startEditingHabit = (habit) => {
    setEditingHabitId(habit._id);
    setEditingHabitName(habit.name);
  };

  const cancelEditingHabit = () => {
    setEditingHabitId(null);
    setEditingHabitName("");
  };

  const saveHabitName = async (id) => {
    const trimmed = editingHabitName.trim();
    if (!trimmed) {
      cancelEditingHabit();
      return;
    }
    await api.patch(`/habits/${id}`, { name: trimmed });
    cancelEditingHabit();
    fetchHabits();
    // logs are tied to id, so no need to refetch them for rename
  };

  const getLogFor = (habitId, dateStr) => {
    return logs.find((log) => log.habit._id === habitId && log.date === dateStr);
  };

  // Toggle only if it's today's date in current month
  const toggleHabitForDay = async (habitId, day) => {
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    const isToday = viewingCurrentMonth && day === todayDay;
    if (!isToday) return;

    const existing = getLogFor(habitId, dateStr);
    const completed = existing ? !existing.completed : true;

    await api.post(`/habits/${habitId}/log`, { date: dateStr, completed });
    await fetchLogs();
    await fetchPrevLogs();
  };

  // Toggle specifically for selected day in checklist (only works if that day === today)
  const toggleHabitSelectedDay = async (habitId) => {
    const isSelectedToday =
      viewingCurrentMonth && selectedDay === todayDay;
    if (!isSelectedToday) return;
    await toggleHabitForDay(habitId, selectedDay);
  };

  const goToPrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(1);
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(1);
  };

  const goToToday = () => {
    setCurrentDate(new Date(todayYear, todayMonthIndex, 1));
    setSelectedDay(todayDay);
  };

  // Ensure selectedDay stays valid if month changes
  useEffect(() => {
    if (selectedDay > daysInMonth) {
      setSelectedDay(daysInMonth);
    }
    if (selectedDay < 1) {
      setSelectedDay(1);
    }
  }, [daysInMonth, selectedDay]);

  const stats = computeStats(habits, logs, daysInMonth);
  const lastMonthStats = computeStats(habits, prevLogs, prevDaysInMonth);

  const getDateStr = (day) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;

  const getDayCompletion = (day) => {
    const dateStr = getDateStr(day);
    const dayLogs = logs.filter((l) => l.date === dateStr && l.completed);
    const completed = dayLogs.length;
    const total = habits.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  };

  // === SELECTED DAY summary (for hero + checklist) ===
  const selectedDateStr =
    selectedDay >= 1 && selectedDay <= daysInMonth
      ? getDateStr(selectedDay)
      : null;

  const selectedDayCompleted = selectedDateStr
    ? logs.filter((l) => l.date === selectedDateStr && l.completed).length
    : 0;
  const selectedTotal = habits.length;
  const selectedRemaining = Math.max(selectedTotal - selectedDayCompleted, 0);
  const selectedPercent = selectedTotal
    ? Math.round((selectedDayCompleted / selectedTotal) * 100)
    : 0;

  const isSelectedToday =
    viewingCurrentMonth && selectedDay === todayDay;

  const handlePrevDay = () => {
    setSelectedDay((prev) => {
      const next = prev - 1;
      if (next < 1) return 1;
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedDay((prev) => {
      const next = prev + 1;
      if (next > daysInMonth) return daysInMonth;
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
  {/* Animated background aurora */}
  <style>
    {`
      @keyframes aurora {
        0% {
          transform: translateX(-15%) translateY(0) skewY(-12deg);
          opacity: 0.4;
        }
        50% {
          transform: translateX(15%) translateY(-6%) skewY(-6deg);
          opacity: 0.85;
        }
        100% {
          transform: translateX(-15%) translateY(0) skewY(-12deg);
          opacity: 0.4;
        }
      }

      @keyframes auroraReverse {
        0% {
          transform: translateX(10%) translateY(5%) skewY(10deg);
          opacity: 0.35;
        }
        50% {
          transform: translateX(-20%) translateY(-4%) skewY(4deg);
          opacity: 0.8;
        }
        100% {
          transform: translateX(10%) translateY(5%) skewY(10deg);
          opacity: 0.35;
        }
      }

      .animate-aurora {
        animation: aurora 22s ease-in-out infinite;
      }

      .animate-aurora-reverse {
        animation: auroraReverse 26s ease-in-out infinite;
      }

      .animation-delay-2000 {
        animation-delay: 2s;
      }

      .animation-delay-4000 {
        animation-delay: 4s;
      }
    `}
      {`
    .water-bar {
      position: relative;
      overflow: hidden;
    }

    .water-bar-fill {
      position: relative;
      background: linear-gradient(90deg, #34d399, #22d3ee, #6ee7b7);
    }

    .water-bar-fill::before {
      content: "";
      position: absolute;
      inset: -50%;
      background:
        radial-gradient(circle at 10% 20%, rgba(255,255,255,0.45) 0, transparent 55%),
        radial-gradient(circle at 80% 0%, rgba(255,255,255,0.28) 0, transparent 55%),
        radial-gradient(circle at 30% 80%, rgba(255,255,255,0.22) 0, transparent 55%);
      opacity: 0.9;
      mix-blend-mode: screen;
      animation: waveShift 4s linear infinite;
    }

    @keyframes waveShift {
      0% {
        transform: translateX(-20%) translateY(0);
      }
      50% {
        transform: translateX(10%) translateY(-6%);
      }
      100% {
        transform: translateX(40%) translateY(0);
      }
    }
  `}
  </style>

  <div className="pointer-events-none absolute inset-0 opacity-50">
    {/* Top diagonal aurora beam */}
    <div className="absolute -top-40 -left-40 w-[40rem] h-64 
                    bg-gradient-to-r from-emerald-400/35 via-cyan-400/25 to-transparent 
                    blur-3xl rounded-3xl animate-aurora" />

    {/* Middle soft beam */}
    <div className="absolute top-1/3 right-[-30%] w-[38rem] h-56 
                    bg-gradient-to-l from-cyan-400/25 via-indigo-400/20 to-transparent 
                    blur-3xl rounded-3xl animate-aurora-reverse animation-delay-2000" />

    {/* Bottom subtle beam */}
    <div className="absolute bottom-[-20%] left-[-10%] w-[42rem] h-64 
                    bg-gradient-to-r from-indigo-500/25 via-emerald-400/20 to-transparent 
                    blur-3xl rounded-3xl animate-aurora animation-delay-4000" />
  </div>

      <motion.div
        className="relative z-10 max-w-6xl mx-auto py-8 px-4 space-y-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header + month nav */}
          <motion.header
            className="flex items-center justify-between gap-4"
            variants={cardVariant}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
                <span>TrackItAll</span>
                {/* <span className="text-emerald-300 text-sm md:text-base px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-400/10">
                  Monthly Habit System
                </span> */}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                One clean view for your habits, streaks, and progress.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Month nav row */}
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={goToPrevMonth}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900/80 hover:border-emerald-400 hover:bg-slate-900 transition flex items-center justify-center"
                >
                  <span
                    className="block w-2 h-2 border-l-2 border-b-2 border-slate-300 rotate-45 
                                          hover:border-emerald-400 transition"
                  ></span>
                </motion.button>

                <div className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs md:text-sm font-semibold shadow-sm shadow-slate-900/60">
                  {currentDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={goToNextMonth}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900/80 hover:border-emerald-400 hover:bg-slate-900 transition flex items-center justify-center"
                >
                  <span
                    className="block w-2 h-2 border-r-2 border-t-2 border-slate-300 rotate-45 
                                          group-hover:border-emerald-400 transition"
                  ></span>
                  <span className="sr-only">Next</span>
                </motion.button>
              </div>

              {/* User + profile + logout */}
                <div className="flex items-center gap-3">
                  {user && (
                    <span className="text-[11px] text-slate-400 max-w-[180px] truncate text-right">
                      Signed in as{" "}
                      <span className="text-slate-100">
                        {user.name || user.email}
                      </span>
                    </span>
                  )}

                  <button
                    onClick={goToProfile}
                    className="px-3 py-1.5 rounded-xl text-[11px] bg-slate-900 border border-slate-700 hover:border-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/5 transition"
                  >
                    Profile
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-xl text-[11px] bg-slate-900 border border-slate-700 hover:border-red-400 hover:text-red-200 hover:bg-red-500/10 transition"
                  >
                    Logout
                  </button>
                </div>

              {!viewingCurrentMonth && (
                <button
                  onClick={goToToday}
                  className="text-xs text-emerald-300 underline-offset-4 hover:underline"
                >
                  Jump to today
                </button>
              )}
            </div>
          </motion.header>


        {/* === SELECTED DAY HERO SECTION === */}
        <motion.section
          className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row gap-6 items-start shadow-xl shadow-slate-950/60"
          variants={cardVariant}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.55, delay: 0.2 }}
        >
          {/* Selected day summary */}
          <div className="md:w-1/3 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Daily Progress
            </p>

            {/* Date row with arrows */}
            <div className="flex items-center justify-between gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevDay}
                className="px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950/90 hover:border-emerald-400 transition flex items-center justify-center"
              >
                <span className="block w-2 h-2 border-l-2 border-b-2 border-slate-300 rotate-45 transition group-hover:border-emerald-400"></span>
              </motion.button>
              <div className="flex flex-col items-center">
                <p className="text-sm md:text-base text-slate-100">
                  {selectedDateStr
                    ? new Date(selectedDateStr).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })
                    : ""}
                </p>
                {isSelectedToday && (
                  <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/40">
                    Today&apos;s Check-in
                  </span>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleNextDay}
                className="px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-950/90 hover:border-emerald-400 transition flex items-center justify-center"
              >
                <span className="block w-2 h-2 border-r-2 border-t-2 border-slate-300 rotate-45 transition group-hover:border-emerald-400"></span>
              </motion.button>
            </div>

            <div className="space-y-1">
              <p className="text-4xl md:text-5xl font-extrabold">
                <span className="text-emerald-400">{selectedDayCompleted}</span>
                <span className="text-slate-400"> / {selectedTotal}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {selectedTotal === 0
                  ? "Add a habit to start your streak."
                  : selectedRemaining === 0
                  ? "All habits done on this day. 🎉"
                  : `${selectedRemaining} habit${
                      selectedRemaining !== 1 ? "s" : ""
                    } left on this day.`}
              </p>
            </div>

            <div className="mt-2 space-y-1.5">
              <div className="w-full h-2 bg-slate-800 rounded-full water-bar">
                <motion.div
                  className="h-full rounded-full water-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedPercent}% of this day&apos;s checklist complete
              </p>
            </div>

            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              You can only mark habits for{" "}
              <span className="text-emerald-300 font-medium">today</span> in the current
              month. Past and future days are{" "}
              <span className="text-slate-300">read-only</span> to keep tracking honest.
            </p>
          </div>

          {/* Selected day checklist (editable only if it is today) */}
          <div className="md:flex-1 w-full">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              Checklist for this day
              {isSelectedToday && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                  Live
                </span>
              )}
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40">
              {habits.length === 0 && (
                <p className="text-xs text-slate-500">
                  No habits yet. Add a habit below to start tracking.
                </p>
              )}

              {habits.map((habit) => {
                const log =
                  selectedDateStr &&
                  logs.find(
                    (l) => l.habit._id === habit._id && l.date === selectedDateStr
                  );
                const isDone = !!log?.completed;
                const canToggleSelected = isSelectedToday; // only if this day is actually today

                return (
                  <motion.div
                    key={habit._id}
                    whileHover={{ scale: 1.01, translateY: -1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 shadow-sm shadow-slate-950/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{habit.name}</span>
                      {!canToggleSelected && (
                        <span className="text-[10px] text-slate-500">
                          Read-only (past/future)
                        </span>
                      )}
                    </div>
                    <motion.button
                      type="button"
                      disabled={!canToggleSelected}
                      onClick={() => toggleHabitSelectedDay(habit._id)}
                      whileTap={canToggleSelected ? { scale: 0.85 } : {}}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold transition ${
                        canToggleSelected
                          ? isDone
                            ? "bg-emerald-400 border-emerald-300 text-slate-950 shadow shadow-emerald-500/40"
                            : "bg-slate-900 border-slate-600 text-slate-300 hover:border-emerald-400 hover:bg-slate-800"
                          : "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-60"
                      }`}
                    >
                      {isDone ? "✓" : ""}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* === MONTHLY DASHBOARD (CURRENT MONTH) === */}
        {stats && (
          <motion.section
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
            variants={cardVariant}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Overall consistency */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-slate-950/60"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2">
                  Monthly Consistency
                </p>
                <p className="text-4xl font-bold text-emerald-300">
                  {stats.overallCompletion}%
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {stats.totalCompleted} / {stats.totalPossible} habit check-ins
                  completed
                </p>
              </div>
              <div className="mt-4">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.overallCompletion}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Top habits */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-lg shadow-slate-950/60"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2">
                Top Habits
              </p>
              <div className="space-y-2">
                {stats.perHabitStats.slice(0, 4).map((h) => (
                  <div key={h.habitId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-200 truncate max-w-[70%]">
                        {h.name}
                      </span>
                      <span className="text-slate-400">
                        {h.percent}% ({h.completedDays}d)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${h.percent}%` }}
                      />
                    </div>
                  </div>
                ))}

                {stats.perHabitStats.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Add habits to see which ones you’re most consistent with.
                  </p>
                )}
              </div>
            </motion.div>

            {/* Weekly performance */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="bg-slate-900/70 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-lg shadow-slate-950/60"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2">
                Weekly Performance
              </p>
              <div className="space-y-2">
                {stats.weeklyStats.map((w) => (
                  <div key={w.label} className="flex items-center gap-2">
                    <span className="text-[11px] w-16 text-slate-300">
                      {w.label}
                    </span>
                    <div className="flex-1">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${w.percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 w-10 text-right">
                      {w.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* === MAIN LAYOUT: HABIT MANAGEMENT + CALENDAR + LAST MONTH SUMMARY === */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left: habits list & management */}
          <motion.aside
            className="col-span-12 md:col-span-4 bg-slate-900/75 backdrop-blur border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl shadow-slate-950/70"
            variants={cardVariant}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <h2 className="text-lg font-semibold mb-2 flex items-center justify-between">
              <span>Your Habits</span>
              <span className="text-[11px] text-slate-400">
                {habits.length} active
              </span>
            </h2>

            <form onSubmit={handleAddHabit} className="flex gap-2 mb-3">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="Add new habit..."
                className="flex-1 px-3 py-2 text-sm rounded-xl bg-slate-950/80 border border-slate-700 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/60"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="px-3 py-2 text-sm rounded-xl bg-emerald-500 font-medium hover:bg-emerald-400 transition shadow shadow-emerald-500/40"
              >
                Add
              </motion.button>
            </form>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40">
              {habits.map((habit) => {
                const startedText = formatDate(habit.startDate || habit.createdAt);
                const isEditing = editingHabitId === habit._id;

                return (
                  <motion.div
                    key={habit._id}
                    whileHover={{ scale: 1.01, translateY: -1 }}
                    className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col gap-1 shadow-sm shadow-slate-950/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingHabitName}
                          onChange={(e) => setEditingHabitName(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs rounded-lg bg-slate-950 border border-slate-600 outline-none focus:border-emerald-400"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm truncate">{habit.name}</span>
                      )}

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveHabitName(habit._id)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditingHabit}
                              className="text-[11px] text-slate-400 hover:text-slate-300"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingHabit(habit)}
                              className="text-[11px] text-slate-400 hover:text-slate-200"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => handleDeleteHabit(habit._id)}
                              className="text-[11px] text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {startedText && (
                      <p className="text-[11px] text-slate-500">
                        Since {startedText}
                      </p>
                    )}
                  </motion.div>
                );
              })}

              {habits.length === 0 && (
                <p className="text-xs text-slate-500">
                  No habits yet. Start by adding one like “Read 10 pages” or “Exercise”.
                </p>
              )}
            </div>
          </motion.aside>

          {/* Right: calendar view + last month summary */}
          <div className="col-span-12 md:col-span-8 space-y-4">
            {/* Calendar view */}
            <motion.section
              className="bg-slate-900/75 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-950/70"
              variants={cardVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
                <span>Monthly Calendar</span>
                <span className="text-[11px] text-slate-400">
                  Tap a day to inspect
                </span>
              </h2>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 text-[11px] text-slate-400 mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {calendarMatrix.map((week, wi) =>
                  week.map((day, di) => {
                    if (!day) {
                      // Empty cell (from previous/next month)
                      return (
                        <div
                          key={`${wi}-${di}`}
                          className="h-16 rounded-xl bg-slate-900/40 border border-slate-800/40"
                        />
                      );
                    }

                    const { completed, total, percent } = getDayCompletion(day);
                    const isToday =
                      viewingCurrentMonth && day === todayDay;
                    const isSelected = day === selectedDay;

                    // Background intensity based on % complete
                    let intensityClass = "bg-slate-900/80";
                    if (percent === 0) {
                      intensityClass = "bg-slate-900/80";
                    } else if (percent > 0 && percent < 100) {
                      intensityClass = "bg-emerald-500/20";
                    } else if (percent === 100 && total > 0) {
                      intensityClass = "bg-emerald-500/50";
                    }

                    return (
                      <motion.button
                        key={`${wi}-${di}`}
                        type="button"
                        whileHover={{ scale: 1.03, translateY: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setSelectedDay(day)}
                        className={`h-16 rounded-xl border text-left px-2 py-1 flex flex-col justify-between transition ${intensityClass} ${
                          isSelected
                            ? "border-emerald-400 shadow-md shadow-emerald-500/30"
                            : "border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold">
                            {day}
                          </span>
                          {isToday && (
                            <span className="relative flex h-3 w-3">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_3px_rgba(16,185,129,0.5)]"></span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-200 mt-2">
                          {total > 0 ? (
                            <>
                              <span className="font-semibold">
                                {completed}/{total}
                              </span>{" "}
                              habits
                            </>
                          ) : (
                            <span className="text-slate-500">No habits</span>
                          )}
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-emerald-400"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </motion.button>
                    );
                  })
                )}
              </div>
            </motion.section>

            {/* Last month summary */}
            <motion.section
              className="bg-slate-900/75 backdrop-blur border border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-950/70"
              variants={cardVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <h3 className="text-sm font-semibold mb-1">
                Last Month Summary
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Overview of your previous month:{" "}
                <span className="text-slate-200 font-medium">
                  {prevMonthDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>

              {!lastMonthStats || habits.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Not enough data from last month yet. As you build more streaks, this
                  section will show your past consistency and top habits.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Last month consistency */}
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2">
                      Monthly Consistency
                    </p>
                    <p className="text-3xl font-bold text-emerald-300">
                      {lastMonthStats.overallCompletion}%
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {lastMonthStats.totalCompleted} /{" "}
                      {lastMonthStats.totalPossible} habit check-ins completed
                    </p>
                    <div className="mt-3">
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-300"
                          initial={{ width: 0 }}
                          animate={{ width: `${lastMonthStats.overallCompletion}%` }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Last month top habits */}
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400 mb-2">
                      Top Habits
                    </p>
                    <div className="space-y-2">
                      {lastMonthStats.perHabitStats.slice(0, 4).map((h) => (
                        <div key={h.habitId}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-200 truncate max-w-[70%]">
                              {h.name}
                            </span>
                            <span className="text-slate-400">
                              {h.percent}% ({h.completedDays}d)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{ width: `${h.percent}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {lastMonthStats.perHabitStats.length === 0 && (
                        <p className="text-xs text-slate-500">
                          No habit activity last month yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default  Dashboard;
