import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import useAuthStore from "../store/authStore";

export default function Dashboard() {
  const [profile, setProfile]     = useState(null);
  const [links, setLinks]         = useState([]);
  const [newTitle, setNewTitle]   = useState("");
  const [newUrl, setNewUrl]       = useState("");
  const [error, setError]         = useState("");
  const [copied, setCopied]       = useState(false);
  const [editingId, setEditingId] = useState(null);   // which link is being edited
  const [editForm, setEditForm]   = useState({ title: "", url: "" });
  const logout                    = useAuthStore((s) => s.logout);
  const navigate                  = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, linksRes] = await Promise.all([
          api.get("/profile/me"),
          api.get("/links"),
        ]);
        setProfile(profileRes.data);
        setLinks(linksRes.data);
      } catch {
        logout();
        navigate("/login");
      }
    }
    load();
  }, []);

  async function addLink() {
    if (!newTitle || !newUrl) return;
    setError("");
    try {
      const res = await api.post("/links", { title: newTitle, url: newUrl });
      setLinks([...links, res.data]);
      setNewTitle("");
      setNewUrl("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to add link");
    }
  }

  async function deleteLink(id) {
    try {
      await api.delete(`/links/${id}`);
      setLinks(links.filter((l) => l.id !== id));
    } catch {
      setError("Failed to delete link");
    }
  }

  async function toggleActive(link) {
    try {
      const res = await api.put(`/links/${link.id}`, { is_active: !link.is_active });
      setLinks(links.map((l) => (l.id === link.id ? res.data : l)));
    } catch {
      setError("Failed to update link");
    }
  }

  function startEdit(link) {
    setEditingId(link.id);
    setEditForm({ title: link.title, url: link.url });
  }

  async function saveEdit(id) {
    try {
      const res = await api.put(`/links/${id}`, editForm);
      setLinks(links.map((l) => (l.id === id ? res.data : l)));
      setEditingId(null);
    } catch {
      setError("Failed to update link");
    }
  }

  async function moveLink(index, direction) {
    // direction: -1 = move up, +1 = move down
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= links.length) return;

    // Swap the two links in local array
    // WHY update locally first? Feels instant to user — no waiting for API
    // This is called Optimistic UI Update
    const reordered = [...links];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setLinks(reordered);

    // Then send new order to backend
    // Backend expects array of IDs in new order
    try {
      await api.put("/links/reorder", {
        link_ids: reordered.map((l) => l.id),
      });
    } catch {
      // If API fails, revert local state back
      setError("Failed to reorder");
      setLinks(links);
    }
  }

  function copyPublicUrl() {
    if (!profile) return;
    navigator.clipboard.writeText(`http://localhost:5173/${profile.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!profile) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.sub}>@{profile.username}</p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={copyPublicUrl} style={styles.copyBtn}>
            {copied ? "Copied!" : "Copy public URL"}
          </button>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* Add Link Form */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Add new link</h2>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Title  e.g. My GitHub"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            style={styles.input}
            placeholder="URL  e.g. https://github.com/you"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button style={styles.addBtn} onClick={addLink}>Add</button>
        </div>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* Links List */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Your links ({links.length})</h2>
        {links.length === 0 && <p style={styles.empty}>No links yet — add one above!</p>}
        {links.map((link, index) => (
          <div key={link.id} style={styles.linkRow}>
            {editingId === link.id ? (
              // Edit mode — show input fields inline
              <div style={styles.editRow}>
                <input
                  style={styles.editInput}
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Title"
                />
                <input
                  style={styles.editInput}
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  placeholder="URL"
                />
                <button style={styles.saveBtn} onClick={() => saveEdit(link.id)}>Save</button>
                <button style={styles.cancelBtn} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              // Normal view mode
              <>
                {/* Reorder arrows */}
                <div style={styles.arrows}>
                  <button
                    style={{ ...styles.arrowBtn, opacity: index === 0 ? 0.2 : 1 }}
                    onClick={() => moveLink(index, -1)}
                    disabled={index === 0}
                  >▲</button>
                  <button
                    style={{ ...styles.arrowBtn, opacity: index === links.length - 1 ? 0.2 : 1 }}
                    onClick={() => moveLink(index, 1)}
                    disabled={index === links.length - 1}
                  >▼</button>
                </div> 

                <div style={styles.linkInfo}>
                  <span style={{ ...styles.linkTitle, opacity: link.is_active ? 1 : 0.4 }}>
                    {link.title}
                  </span>
                  <span style={styles.linkUrl}>{link.url}</span>
                </div>
                <div style={styles.linkActions}>
                  <button
                    style={{ ...styles.toggleBtn, background: link.is_active ? "#22c55e22" : "#ffffff11" }}
                    onClick={() => toggleActive(link)}
                  >
                    {link.is_active ? "Live" : "Hidden"}
                  </button>
                  <button style={styles.editBtn} onClick={() => startEdit(link)}>✏️</button>
                  <button style={styles.deleteBtn} onClick={() => deleteLink(link.id)}>✕</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Analytics */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Analytics</h2>
        <p style={styles.empty}>
          Visit{" "}
          <a href="/analytics" target="_blank" style={styles.link}>
            /analytics
          </a>{" "}
          to see click stats
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:        { maxWidth: "700px", margin: "0 auto", padding: "2rem 1rem", background: "#0f0f0f", minHeight: "100vh" },
  loading:     { color: "#fff", textAlign: "center", marginTop: "4rem", background: "#0f0f0f", minHeight: "100vh" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  headerRight: { display: "flex", gap: "0.75rem" },
  title:       { color: "#fff", fontSize: "1.6rem", fontWeight: 700, margin: 0 },
  sub:         { color: "#888", margin: "0.25rem 0 0", fontSize: "0.9rem" },
  card:        { background: "#1a1a1a", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.25rem" },
  cardTitle:   { color: "#fff", fontSize: "1rem", fontWeight: 600, margin: "0 0 1rem" },
  row:         { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  input:       { flex: 1, minWidth: "160px", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #333", background: "#111", color: "#fff", fontSize: "0.95rem", outline: "none" },
  addBtn:      { padding: "0.75rem 1.5rem", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, cursor: "pointer" },
  copyBtn:     { padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #6366f1", background: "transparent", color: "#6366f1", cursor: "pointer", fontSize: "0.85rem" },
  logoutBtn:   { padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: "0.85rem" },
  linkRow:     { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 0", borderBottom: "1px solid #2a2a2a" },
  arrows:      { display: "flex", flexDirection: "column", gap: "2px" },
  arrowBtn:    { background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "0.7rem", padding: "2px 4px", lineHeight: 1 },
  linkInfo:    { flex: 1, display: "flex", flexDirection: "column", gap: "0.2rem" },
  linkTitle:   { color: "#fff", fontWeight: 500, fontSize: "0.95rem" },
  linkUrl:     { color: "#888", fontSize: "0.8rem" },
  linkActions: { display: "flex", gap: "0.5rem", alignItems: "center" },
  toggleBtn:   { padding: "0.3rem 0.75rem", borderRadius: "20px", border: "none", color: "#fff", fontSize: "0.8rem", cursor: "pointer" },
  editBtn:     { padding: "0.3rem 0.6rem", borderRadius: "6px", border: "none", background: "#ffffff11", color: "#fff", cursor: "pointer" },
  deleteBtn:   { padding: "0.3rem 0.6rem", borderRadius: "6px", border: "none", background: "#ffffff11", color: "#f87171", cursor: "pointer" },
  editRow:     { display: "flex", gap: "0.5rem", flexWrap: "wrap", width: "100%", alignItems: "center" },
  editInput:   { flex: 1, minWidth: "120px", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #444", background: "#111", color: "#fff", fontSize: "0.9rem", outline: "none" },
  saveBtn:     { padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: "0.85rem" },
  cancelBtn:   { padding: "0.5rem 1rem", borderRadius: "6px", border: "none", background: "#333", color: "#fff", cursor: "pointer", fontSize: "0.85rem" },
  error:       { color: "#f87171", fontSize: "0.85rem", marginTop: "0.75rem" },
  empty:       { color: "#555", fontSize: "0.9rem" },
  link:        { color: "#6366f1" },
};