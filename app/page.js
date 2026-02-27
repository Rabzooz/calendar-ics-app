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
          todayIso: new Date().toISOString(),
        }),
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
      body: JSON.stringify(event),
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
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          padding: 40,
          borderRadius: 16,
          boxShadow: "0 15px 40px rgba(0,0,0,0.06)",
          maxWidth: 640,
          width: "100%",
        }}
      >
        {/* Brand / Logo */}
        <div style={{ marginBottom: 18 }}>
          <img src="/logo.svg" alt="Screen2Cal" style={{ height: 60 }} />
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 10, marginBottom: 0 }}>
            Turn any screenshot or photo into a calendar event in seconds.
          </p>
        </div>

        {/* Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 14 }}
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
            borderRadius: 10,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.85 : 1,
          }}
        >
          {loading ? "Processing..." : "Extract Event"}
        </button>

        {error && (
          <p style={{ color: "#DC2626", marginTop: 14, marginBottom: 0 }}>
            {error}
          </p>
        )}

        {/* Preview (mobile friendly + scrollable) */}
        {event && (
          <div
            style={{
              marginTop: 22,
              padding: 18,
              backgroundColor: "#F1F5F9",
              borderRadius: 12,
              border: "1px solid #E2E8F0",
              color: "#0F172A",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>Preview</h3>
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#E0F2FE",
                  color: "#0369A1",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Confidence {Math.round((event.confidence ?? 0) * 100)}%
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: 12,
                maxHeight: 240,
                overflowY: "auto",
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontSize: 13, color: "#334155" }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Title</div>
                  <div style={{ fontWeight: 800, wordBreak: "break-word" }}>
                    {event.title}
                  </div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Start</div>
                  <div style={{ wordBreak: "break-word" }}>{event.start}</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748B" }}>End</div>
                  <div style={{ wordBreak: "break-word" }}>{event.end}</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Timezone</div>
                  <div style={{ wordBreak: "break-word" }}>{event.timezone || "—"}</div>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Location</div>
                  <div style={{ wordBreak: "break-word" }}>{event.location || "—"}</div>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Description</div>
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {event.description || "—"}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={downloadIcs}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "10px 14px",
                backgroundColor: "#06B6D4",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Download .ics
            </button>

            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#64748B" }}>
              Tip: if the description is long, scroll inside the preview box.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}