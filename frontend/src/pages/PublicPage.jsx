import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";

export default function PublicPage() {
  const { username }        = useParams();  // grabs "bujji" from URL /bujji
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/${username}`);
        setProfile(res.data);
      } catch {
        setNotFound(true);
      }
    }
    load();
  }, [username]);

  function handleLinkClick(linkId) {
    // Navigate to our click tracking route — redirects to actual URL
    window.open(`http://${window.location.protocol}//${window.location.hostname}:8000/click/${linkId}`, "_blank");
}

  if (notFound) return (
    <div style={styles.page}>
      <p style={styles.notFound}>Profile not found 😕</p>
    </div>
  );

  if (!profile) return (
    <div style={styles.page}>
      <p style={styles.loading}>Loading...</p>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Avatar placeholder */}
        <div style={styles.avatar}>
          {profile.display_name?.[0]?.toUpperCase() || profile.username[0].toUpperCase()}
        </div>

        <h1 style={styles.name}>{profile.display_name || profile.username}</h1>
        {profile.bio && <p style={styles.bio}>{profile.bio}</p>}

        {/* Links */}
        <div style={styles.links}>
          {profile.links.length === 0 && (
            <p style={styles.empty}>No links yet!</p>
          )}
          {profile.links.map((link) => (
            <button
              key={link.id} 
              style={styles.linkBtn}
              onClick={() => handleLinkClick(link.id)}
              onMouseEnter={(e) => e.target.style.background = "#6366f1"}
              onMouseLeave={(e) => e.target.style.background = "#1a1a1a"}
            >
              {link.title}
            </button>
          ))}
        </div>

        <p style={styles.powered}>Made with LinkInBio</p>
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" },
  container: { width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" },
  avatar:    { width: "80px", height: "80px", borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700, color: "#fff", marginBottom: "0.5rem" },
  name:      { color: "#fff", fontSize: "1.5rem", fontWeight: 700, margin: 0 },
  bio:       { color: "#888", textAlign: "center", fontSize: "0.95rem", margin: 0, maxWidth: "360px" },
  links:     { width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" },
  linkBtn:   { width: "100%", padding: "1rem", borderRadius: "12px", border: "1px solid #333", background: "#1a1a1a", color: "#fff", fontSize: "1rem", fontWeight: 500, cursor: "pointer", transition: "background 0.2s" },
  empty:     { color: "#555" },
  powered:   { color: "#333", fontSize: "0.75rem", marginTop: "2rem" },
  notFound:  { color: "#888", fontSize: "1.1rem" },
  loading:   { color: "#888" },
};