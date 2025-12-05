// client/src/api.js
import axios from "axios";

const baseURL =
  process.env.NODE_ENV === "production"
    ? "/api" // in Render: same origin (https://trackitall-t3x6.onrender.com/api)
    : "http://localhost:5000/api"; // in dev: your local backend

const api = axios.create({
  baseURL,
});

// attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ttq_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
