// src/api/axiosInstance.js
import axios from "axios";

/**
 * Axios instance shared across the app.
 * - Automatically attaches JWT in Authorization header.
 * - Handles 401 (expired/invalid token) by clearing auth.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5006",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token on every request (if present)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Basic 401 handling
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 401) {
      // Token invalid/expired: clear and kick user to login
      localStorage.removeItem("token");
      // Keep it simple for demo
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    // Normalize error message so every page can use e.message directly
    const data = err?.response?.data;
    if (data?.detail) err.message = data.detail;
    else if (data?.title) err.message = data.title;
    return Promise.reject(err);
  }
);

export default api;