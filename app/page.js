"use client";

import { useMemo, useState } from "react";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeExtractPayload(data) {
  // Already multi format
  if (data && Array.isArray(data.events)) return data;

  // Backward compatibility: single event shape
  if (data && (data.title || data.start || data.end)) {
    const { confidence, ...single } = data;
    return { events: [single], confidence };
  }

  return data;
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [eventsPayload, setEventsPayload] = useState(null); // { events: [...], confidence }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputKey, setInputKey] = useState(0); // used to reset <input type="file" />

  const events = useMemo(() => {
    return Array.isArray(eventsPayload?.events) ? eventsPayload.events : [];
  }, [eventsPayload]);

  function resetAll() {
    setFile(null);
    setEventsPayload(null);
    setError(null);
    setLoading(false);
    setInputKey((k) => k + 1); // forces file input to reset
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function extractEvent() {
    setError(null);
    setEventsPayload(null);

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

      if (!res.ok || data?.error) {
        const details = data?.details ? ` — ${data.details}` : "";
        setError((data?.error || "Erreur extraction") + details);
      } else {
        setEventsPayload(normalizeExtractPayload(data));
      }
    } catch (e) {
      setError(e?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function downloadIcs() {
    if (!eventsPayload) return;

    const res = await fetch("/api/ics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventsPayload),
    });

    // ✅ IMPORTANT: si l'API renvoie une erreur, on l'affiche au lieu de télécharger un faux .ics
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setError(text || "Erreur lors de la génération du fichier .ics");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "events.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(37,99,235,0.12), transparent 60%), radial-gradient(900px 500px at 80% 20%, rgba(6,182,212,0.14), transparent 55%), #F8FAFC",
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
          borderRadius: 18,
          boxShadow: "0 18px 55px rgba(2,6,23,0.08)",
          maxWidth: 680,
          width: "100%",
          border: "1px solid rgba(226,232,240,0.9)",
        }}
      >
        {/* Brand / Logo */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.svg" alt="Screen2Cal" style={{ height: 56 }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "6px 10px",
                borderRadius: 999,
                background: "#EEF2FF",
                color: "#3730A3",
                border: "1px solid #E0E7FF",
                whiteSpace: "nowrap",
              }}
            >
              Beta
            </span>
          </div>

          <p
            style={{
              fontSize: 14,
              color: "#64748B",
              marginTop: 10,
              marginBottom: 0,
              lineHeight: 1.45,
            }}
          >
            Turn any screenshot or photo into calendar events in seconds.
          </p>
        </div>

        {/* Upload */}
        <input
          key={inputKey}
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
            borderRadius: 12,
            fontWeight: 800,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.85 : 1,
            boxShadow: "0 10px 25px rgba(37,99,235,0.18)",
          }}
        >
          {loading ? "Processing..." : "Extract Event(s)"}
        </button>

        {error && (
          <p style={{ color: "#DC2626", marginTop: 14, marginBottom: 0 }}>
            {error}
          </p>
        )}

        {/* Preview (mobile friendly + scrollable) */}
        {eventsPayload && events.length > 0 && (
          <div
            style={{
              marginTop: 22,
              padding: 18,
              backgroundColor: "#F1F5F9",
              borderRadius: 14,
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
              <h3 style={{ margin: 0, fontSize: 16 }}>
                Preview ({events.length} event{events.length > 1 ? "s" : ""})
              </h3>

              <span
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "#E0F2FE",
                  color: "#0369A1",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                Confidence {Math.round((eventsPayload.confidence ?? 0) * 100)}%
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {events.map((ev, idx) => (
                <div
                  key={`${ev.start || "start"}-${idx}`}
                  style={{
                    padding: 12,
                    borderBottom:
                      idx === events.length - 1 ? "none" : "1px solid #E2E8F0",
                    lineHeight: 1.4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      marginBottom: 4,
                    }}
                  >
                    Event #{idx + 1}
                  </div>

                  <div style={{ fontSize: 13, color: "#334155" }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748B" }}>Title</div>
                      <div style={{ fontWeight: 900, wordBreak: "break-word" }}>
                        {ev.title || "—"}
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748B" }}>Start</div>
                      <div style={{ wordBreak: "break-word" }}>{ev.start || "—"}</div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748B" }}>End</div>
                      <div style={{ wordBreak: "break-word" }}>{ev.end || "—"}</div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748B" }}>Timezone</div>
                      <div style={{ wordBreak: "break-word" }}>
                        {ev.timezone || "—"}
                      </div>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748B" }}>Location</div>
                      <div style={{ wordBreak: "break-word" }}>
                        {ev.location || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>Description</div>
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {ev.description || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 10px 25px rgba(6,182,212,0.18)",
              }}
            >
              Download .ics
            </button>

            <button
              onClick={resetAll}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "10px 14px",
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              New Screen2Cal
            </button>

            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 12, color: "#64748B" }}>
              Tip: if the description is long, scroll inside the preview box.
            </p>

            <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, color: "#94A3B8" }}>
              Works with Google Calendar, Apple Calendar & Outlook — no signup required.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}