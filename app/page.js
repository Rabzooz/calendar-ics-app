"use client";

import { useState } from "react";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function extractEvent() {
    setError(null);
    setEvent(null);

    if (!file) {
      setError("Choisis une image d’abord.");
      return;
    }

    setLoading(true);
    try {
      const base64Image = await fileToBase64(file);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image,
          todayIso: new Date().toISOString()
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
  const details = data.details ? ` — ${data.details}` : "";
  setError((data.error || "Erreur extraction") + details);
} else {
  setEvent(data);
}
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadIcs() {
    if (!event) return;

    const res = await fetch("/api/ics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event)
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "event.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
  <main
    style={{
      minHeight: "100vh",
      backgroundColor: "#F8FAFC",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: "Inter, system-ui, sans-serif"
    }}
  >
    <div
      style={{
        background: "#FFFFFF",
        padding: 40,
        borderRadius: 16,
        boxShadow: "0 15px 40px rgba(0,0,0,0.06)",
        maxWidth: 600,
        width: "100%"
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 20 }}>
        <img src="/logo.svg" alt="Screen2Cal" style={{ height: 60 }} />
        <p
          style={{
            fontSize: 14,
            color: "#64748B",
            marginTop: 8
          }}
        >
          Turn any screenshot or photo into a calendar event in seconds.
        </p>
      </div>

      {/* Upload */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: 16 }}
      />

      <button
        onClick={extractEvent}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 16px",
          backgroundColor: "#2563EB",
          color: "#FFFFFF",
          border: "none",
          borderRadius: 8,
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        {loading ? "Processing..." : "Extract Event"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 16 }}>{error}</p>
      )}

      {event && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            backgroundColor: "#F1F5F9",
            borderRadius: 12
          }}
        >
          <h3 style={{ marginBottom: 12 }}>Preview</h3>

          <p><b>Title:</b> {event.title}</p>
          <p><b>Start:</b> {event.start}</p>
          <p><b>End:</b> {event.end}</p>
          <p><b>Location:</b> {event.location || "—"}</p>

          <button
            onClick={downloadIcs}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "10px 14px",
              backgroundColor: "#06B6D4",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Download .ics
          </button>
        </div>
      )}
    </div>
  </main>
);
}