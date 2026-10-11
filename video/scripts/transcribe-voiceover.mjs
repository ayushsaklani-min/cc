// Checks narration clips by having Gemini transcribe them, since a text-to-speech
// model can misread a line or speak its style instruction aloud.
//   node scripts/transcribe-voiceover.mjs [id ...]
import { readdirSync, readFileSync } from "node:fs";

const MODEL = process.env.TRANSCRIBE_MODEL ?? "gemini-2.5-flash";
const env = readFileSync(new URL("../../.env", import.meta.url), "utf8");
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) throw new Error("GEMINI_API_KEY is not set in .env");

const dir = new URL(process.env.VO_SET === "demo" ? "../public/voiceover-demo/" : "../public/voiceover/", import.meta.url);
const ids = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(dir).map((f) => f.replace(/\.wav$/, ""));

for (const id of ids) {
  const data = readFileSync(new URL(`${id}.wav`, dir)).toString("base64");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ inlineData: { mimeType: "audio/wav", data } }, { text: "Transcribe this audio exactly, word for word. Output only the transcript." }] }],
      generationConfig: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = await res.text();
  if (!res.ok) {
    console.log(`${id}: FAILED HTTP ${res.status} ${body.replace(key, "***").slice(0, 200)}`);
    continue;
  }
  console.log(`${id}: ${JSON.parse(body).candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim()}`);
  await new Promise((r) => setTimeout(r, 7000));
}
