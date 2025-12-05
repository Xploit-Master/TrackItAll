// client/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api", // change if needed
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
