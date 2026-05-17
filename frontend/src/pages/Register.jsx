import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

export default function Register() {
  const [form, setForm]       = useState({ email: "", username: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const setToken              = useAuthStore((s) => s.setToken);
  const navigate              = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", form);
      setToken(res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create account</h1>
        <p style={styles.sub}>Your link in bio, your way</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} name="email"    type="email"  placeholder="Email"    value={form.email}    onChange={handleChange} required />
          <input style={styles.input} name="username" type="text"   placeholder="Username (becomes your public URL)" value={form.username} onChange={handleChange} required />
          <input style={styles.input} name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </button>
        </form>
        <p style={styles.footer}>
          Already have one? <Link to="/login" style={styles.link}>Sign in</Link>
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