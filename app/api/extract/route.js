import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4.1-mini";
const DEFAULT_TZ = "Europe/Zurich";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    start: { type: "string", description: "ISO 8601 datetime" },
    end: { type: ["string", "null"], description: "ISO 8601 datetime or null" },
    timezone: { type: ["string", "null"], description: "IANA timezone like Europe/Zurich" },
    location: { type: ["string", "null"] },
    description: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["title", "start", "end", "timezone", "location", "description", "confidence"]
};

export async function POST(req) {
  try {
    const { base64Image, todayIso } = await req.json();

    if (!base64Image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const prompt = `Tu extrais les informations d'un événement depuis une capture d’écran ou une photo.
Contexte: aujourd'hui = ${todayIso}
Règles:
- Timezone par défaut: ${DEFAULT_TZ}
- start/end doivent être en ISO 8601.
- Si l'heure de fin manque, end = start + 60 minutes.
- Mets null si une info manque (sauf title et start).
- Réponds STRICTEMENT au format JSON demandé.`;

    const r = await client.responses.create({
      model: MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: `data:image/jpeg;base64,${base64Image}` }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "calendar_event",
          strict: true,
          schema
        }
      }
    });

    // r.output_text est le plus simple quand dispo
    const outText =
  (typeof r.output_text === "string" && r.output_text.trim() ? r.output_text : null) ||
  r.output?.[0]?.content?.find((c) => typeof c?.text === "string")?.text ||
  r.output?.find((o) => o?.content?.some((c) => typeof c?.text === "string"))
    ?.content?.find((c) => typeof c?.text === "string")?.text;

if (!outText) {
  console.error("No output_text found. Full response:", r);
  return Response.json(
    { error: "Server error", details: "OpenAI response had no output text (see server logs)." },
    { status: 500 }
  );
}

let event;
try {
  event = JSON.parse(outText);
} catch (e) {
  console.error("JSON parse failed. outText:", outText);
  return Response.json(
    { error: "Server error", details: "Failed to parse model JSON output." },
    { status: 500 }
  );
}

    // fallback timezone
    if (!event.timezone) event.timezone = DEFAULT_TZ;

    return Response.json(event);
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}