import { randomUUID } from "crypto";

export const runtime = "nodejs";

function toIcsFormat(dtIso) {
  const d = new Date(dtIso);
  const pad = (n) => String(n).padStart(2, "0");

  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function escapeText(text) {
  return (text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function normalizeToEventsPayload(body) {
  // New format: { events: [...] }
  if (body && Array.isArray(body.events)) {
    return {
      events: body.events,
      confidence: body.confidence,
    };
  }

  // Backward compat: single event object
  if (body && (body.title || body.start || body.end)) {
    const { confidence, ...single } = body;
    return {
      events: [single],
      confidence,
    };
  }

  return { events: [] };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const payload = normalizeToEventsPayload(body);
    const events = payload.events || [];

    if (!events.length) {
      return new Response("Invalid event data", { status: 400 });
    }

    const timezoneFallback = "Europe/Zurich";

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Calendar Screenshot App//FR",
      "CALSCALE:GREGORIAN",
    ];

    const dtstamp = `${toIcsFormat(new Date().toISOString())}Z`;

    let validCount = 0;

    for (const ev of events) {
      // ✅ On ignore les events invalides au lieu de casser tout le fichier
      if (!ev || !ev.start) continue;

      const uid = randomUUID();
      const timezone = ev.timezone || timezoneFallback;

      const dtStart = toIcsFormat(ev.start);
      const dtEnd = toIcsFormat(ev.end || ev.start);

      // ✅ title ne doit jamais être vide
      const safeTitle =
        typeof ev.title === "string" && ev.title.trim().length > 0
          ? ev.title.trim()
          : "Availability";

      lines.push(
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;TZID=${timezone}:${dtStart}`,
        `DTEND;TZID=${timezone}:${dtEnd}`,
        `SUMMARY:${escapeText(safeTitle)}`,
        `LOCATION:${escapeText(ev.location)}`,
        `DESCRIPTION:${escapeText(ev.description)}`,
        "END:VEVENT"
      );

      validCount += 1;
    }

    // ✅ Si aucun event valide, on renvoie 400
    if (validCount === 0) {
      return new Response("Invalid event data", { status: 400 });
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n");

    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="events.ics"',
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
}