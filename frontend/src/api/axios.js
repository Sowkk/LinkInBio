import axios from "axios";
import useAuthStore from "../store/authStore";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// Interceptor — automatically attaches JWT token to every request
// WHY? Without this we'd manually add Authorization header in every single API call
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;