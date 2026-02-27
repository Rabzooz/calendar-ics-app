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
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 20, fontFamily: "system-ui" }}>
      <h1>Screenshot → Calendrier (.ics)</h1>
      <p>Upload une capture d’écran ou une photo, puis télécharge le fichier .ics.</p>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={extractEvent} disabled={loading}>
          {loading ? "Extraction..." : "Extraire l’événement"}
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}

      {event && (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd", borderRadius: 10 }}>
          <h3>Aperçu</h3>

          <p><b>Titre :</b> {event.title}</p>
          <p><b>Début :</b> {event.start}</p>
          <p><b>Fin :</b> {event.end}</p>
          <p><b>Timezone :</b> {event.timezone}</p>
          <p><b>Lieu :</b> {event.location || "—"}</p>
          <p><b>Description :</b> {event.description || "—"}</p>
          <p><b>Confiance :</b> {event.confidence}</p>

          <button onClick={downloadIcs} style={{ marginTop: 10 }}>
            Télécharger le .ics
          </button>
        </div>
      )}
    </main>
  );
}