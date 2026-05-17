import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

export default function Analytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const logout                = useAuthStore((s) => s.logout);
  const navigate              = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/analytics");
        setData(res.data);
      } catch {
        logout();
        navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;
  if (!data)   return <div style={styles.loading}>No data found</div>;

  // Find max clicks for bar chart scaling
  const maxClicks = Math.max(...data.links.map((l) => l.total_clicks), 1);
  const maxDaily  = Math.max(...data.daily_clicks.map((d) => d.clicks), 1);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics</h1>
          <p style={styles.sub}>Your link performance</p>
        </div>
        <Link to="/dashboard" style={styles.backBtn}>← Dashboard</Link>
      </div>

      {/* Total clicks */}
      <div style={styles.statRow}>
        <div style={styles.statCard}>
          <p style={styles.statNum}>{data.total_clicks}</p>
          <p style={styles.statLabel}>Total clicks</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statNum}>{data.links.length}</p>
          <p style={styles.statLabel}>Total links</p>
        </div>
        <div style={styles.statCard}>
          <p style={styles.statNum}>
            {Object.entries(data.top_devices).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}
          </p>
          <p style={styles.statLabel}>Top device</p>
        </div>
      </div>

      {/* Daily clicks chart — last 7 days */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Clicks last 7 days</h2>
        {data.daily_clicks.length === 0
          ? <p style={styles.empty}>No clicks yet — share your page!</p>
          : (
          <div style={styles.barChart}>
            {data.daily_clicks.map((d) => (
              <div key={d.date} style={styles.barCol}>
                <p style={styles.barNum}>{d.clicks}</p>
                <div style={styles.barWrapper}>
                  <div style={{
                    ...styles.bar,
                    height: `${(d.clicks / maxDaily) * 100}%`,
                  }}/>
                </div>
                {/* Show only day part of date — "2026-05-17" → "May 17" */}
                <p style={styles.barLabel}>
                  {new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per link breakdown */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Clicks per link</h2>
        {data.links.length === 0
          ? <p style={styles.empty}>No links yet</p>
          : data.links.map((link) => (
          <div key={link.link_id} style={styles.linkRow}>
            <div style={styles.linkInfo}>
              <span style={styles.linkTitle}>{link.title}</span>
              <span style={styles.linkUrl}>{link.url}</span>
            </div>
            <div style={styles.linkBar}>
              {/* Progress bar — width proportional to max clicks */}
              <div style={{
                ...styles.linkBarFill,
                width: `${(link.total_clicks / maxClicks) * 100}%`,
              }}/>
            </div>
            <span style={styles.linkCount}>{link.total_clicks}</span>
          </div>
        ))}
      </div>

      {/* Device breakdown */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Device breakdown</h2>
        {Object.keys(data.top_devices).length === 0
          ? <p style={styles.empty}>No data yet</p>
          : Object.entries(data.top_devices).map(([device, count]) => (
          <div key={device} style={styles.deviceRow}>
            <span style={styles.deviceName}>
              {device === "mobile" ? "📱" : device === "tablet" ? "📟" : "💻"} {device}
            </span>
            <span style={styles.deviceCount}>{count} clicks</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page:        { maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem", background: "#0f0f0f", minHeight: "100vh" },
  loading:     { color: "#fff", textAlign: "center", marginTop: "4rem", background: "#0f0f0f", minHeight: "100vh" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  title:       { color: "#fff", fontSize: "1.6rem", fontWeight: 700, margin: 0 },
  sub:         { color: "#888", margin: "0.25rem 0 0", fontSize: "0.9rem" },
  backBtn:     { color: "#6366f1", textDecoration: "none", fontSize: "0.9rem" },
  statRow:     { display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" },
  statCard:    { flex: 1, minWidth: "120px", background: "#1a1a1a", borderRadius: "12px", padding: "1.25rem", textAlign: "center" },
  statNum:     { color: "#fff", fontSize: "2rem", fontWeight: 700, margin: "0 0 0.25rem" },
  statLabel:   { color: "#888", fontSize: "0.85rem", margin: 0 },
  card:        { background: "#1a1a1a", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" },
  cardTitle:   { color: "#fff", fontSize: "1rem", fontWeight: 600, margin: "0 0 1.25rem" },
  barChart:    { display: "flex", gap: "0.75rem", alignItems: "flex-end", height: "160px", paddingBottom: "2rem", position: "relative" },
  barCol:      { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" },
  barNum:      { color: "#888", fontSize: "0.75rem", margin: "0 0 0.25rem" },
  barWrapper:  { flex: 1, width: "100%", display: "flex", alignItems: "flex-end" },
  bar:         { width: "100%", background: "#6366f1", borderRadius: "4px 4px 0 0", minHeight: "4px", transition: "height 0.3s" },
  barLabel:    { color: "#666", fontSize: "0.7rem", marginTop: "0.4rem", textAlign: "center" },
  linkRow:     { display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid #2a2a2a" },
  linkInfo:    { display: "flex", flexDirection: "column", gap: "0.15rem", width: "160px", flexShrink: 0 },
  linkTitle:   { color: "#fff", fontSize: "0.9rem", fontWeight: 500 },
  linkUrl:     { color: "#555", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  linkBar:     { flex: 1, height: "8px", background: "#2a2a2a", borderRadius: "4px", overflow: "hidden" },
  linkBarFill: { height: "100%", background: "#6366f1", borderRadius: "4px", transition: "width 0.3s" },
  linkCount:   { color: "#fff", fontSize: "0.9rem", fontWeight: 600, width: "30px", textAlign: "right" },
  deviceRow:   { display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid #2a2a2a" },
  deviceName:  { color: "#fff", fontSize: "0.9rem", textTransform: "capitalize" },
  deviceCount: { color: "#888", fontSize: "0.9rem" },
  empty:       { color: "#555", fontSize: "0.9rem" },
};