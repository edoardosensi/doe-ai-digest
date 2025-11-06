import React from "react";

export default function AdminDashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: "#222", color: "#fff", padding: "2rem 1rem" }}>
        <h2 style={{ fontWeight: 600 }}>Admin</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ margin: "1rem 0" }}><a href="/admin" style={{ color: "#fff", textDecoration: "none" }}>Dashboard</a></li>
          <li style={{ margin: "1rem 0" }}><a href="/admin/users" style={{ color: "#fff", textDecoration: "none" }}>Users</a></li>
          <li style={{ margin: "1rem 0" }}><a href="/admin/settings" style={{ color: "#fff", textDecoration: "none" }}>Settings</a></li>
        </ul>
      </aside>
      {/* Main content */}
      <main style={{ flex: 1, padding: "2rem" }}>
        <header style={{ borderBottom: "1px solid #eee", paddingBottom: "1rem", marginBottom: "2rem" }}>
          <h1>Admin Dashboard</h1>
        </header>
        <section>
          <h2>Overview</h2>
          <div style={{ display: "flex", gap: 24, marginTop: 24 }}>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 24, minWidth: 160 }}>
              <strong>Users</strong>
              <div>45</div>
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 24, minWidth: 160 }}>
              <strong>Active Sessions</strong>
              <div>12</div>
            </div>
            <div style={{ background: "#f5f5f5", borderRadius: 8, padding: 24, minWidth: 160 }}>
              <strong>Reports</strong>
              <div>7</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}