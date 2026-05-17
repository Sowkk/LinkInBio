import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const setToken                = useAuthStore((s) => s.setToken);
  const navigate                = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();  // WHY? Prevents browser's default form submission which reloads the page
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setToken(res.data.access_token);  // save token to Zustand (+ localStorage via persist)
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your account</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p style={styles.footer}>
          No account? <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:  { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f0f" },
  card:  { background: "#1a1a1a", padding: "2.5rem", borderRadius: "16px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
  title: { color: "#fff", fontSize: "1.8rem", fontWeight: 700, margin: "0 0 0.25rem" },
  sub:   { color: "#888", margin: "0 0 2rem", fontSize: "0.95rem" },
  form:  { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { padding: "0.8rem 1rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "1rem", outline: "none" },
  btn:   { padding: "0.9rem", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontSize: "1rem", fontWeight: 600, cursor: "pointer" },
  error: { color: "#f87171", fontSize: "0.9rem", margin: 0 },
  footer:{ color: "#888", textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem" },
  link:  { color: "#6366f1", textDecoration: "none" },
};