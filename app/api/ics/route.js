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

export async function POST(req) {
  try {
    const event = await req.json();

    if (!event.title || !event.start) {
      return new Response("Invalid event data", { status: 400 });
    }

    const uid = randomUUID();
    const timezone = event.timezone || "Europe/Zurich";

    const dtStart = toIcsFormat(event.start);
    const dtEnd = toIcsFormat(event.end || event.start);

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Calendar Screenshot App//FR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsFormat(new Date().toISOString())}Z`,
      `DTSTART;TZID=${timezone}:${dtStart}`,
      `DTEND;TZID=${timezone}:${dtEnd}`,
      `SUMMARY:${escapeText(event.title)}`,
      `LOCATION:${escapeText(event.location)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="event.ics"'
      }
    });

  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
}