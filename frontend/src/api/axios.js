import axios from "axios";
import useAuthStore from "../store/authStore";

// WHY import.meta.env.VITE_API_URL?
// In development → falls back to localhost:8000
// In Docker/production → uses the VITE_API_URL build arg we set in docker-compose
// This way we never hardcode URLs — same code works everywhere
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;