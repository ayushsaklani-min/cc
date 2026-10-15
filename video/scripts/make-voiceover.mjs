// Generates the narration, one clip per beat, with Gemini text-to-speech.
// Reads GEMINI_API_KEY from the repo's .env (never logged). Clips that
// already exist are kept, so the script can be re-run after a quota error.
//   node scripts/make-voiceover.mjs            generate missing clips
//   node scripts/make-voiceover.mjs --only id  regenerate one clip
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const MODEL = process.env.TTS_MODEL ?? "gemini-2.5-flash-preview-tts";
const VOICE = process.env.TTS_VOICE ?? "Charon";
// Newer speech models read a style prefix aloud; set TTS_STYLE=0 for those.
const STYLE = process.env.TTS_STYLE === "0" ? "" : "Read this as the calm, confident narrator of a premium product film. Measured pace, warm and clear: ";

const FILM_LINES = [
  { id: "intro", text: "CipherComply. Private eligibility verification, built and running on Midnight." },
  { id: "solution", text: "One document in, one fact out. A user proves they meet a policy, like an income threshold, and nothing else is revealed on-chain." },
  { id: "step1", text: "Here is the flow, end to end. The user submits a document, once." },
  { id: "step2", text: "Fixed, versioned rules decide eligibility, and an oracle signs the result." },
  { id: "step3", text: "A zero-knowledge proof is generated, and the contract checks the oracle's signature inside the circuit." },
  { id: "step4", text: "The transaction settles on Midnight, and the status becomes queryable." },
  { id: "ledger", text: "On the ledger: a pseudonymous identifier, a validity date, and a one-time marker. Never on the ledger: your document, your income, or your name." },
  { id: "signed", text: "For the over-eighteen policy, there is no AI at all. The document must carry DigiLocker's digital signature. Change a single byte, and it is refused. And one person's record can verify only one identity." },
  { id: "stack", text: "Under the hood: a Compact contract with in-circuit signature verification, block-time expiry, nullifiers, and revocation. Around it: an oracle signer, a policy engine, a gateway, and a wallet flow for Lace." },
  { id: "proof", text: "And it runs today. Two contracts are deployed on Midnight Preview. Attestations and a revocation have settled on-chain. And the full flow has been completed in the browser, with a Lace wallet." },
  { id: "protocols", text: "Protocols simply check a status. Not a document." },
  { id: "outro", text: "CipherComply. A working implementation of private financial verification, on Midnight." },
];

// Narration for the live demo recording: VO_SET=demo node scripts/make-voiceover.mjs
const DEMO_LINES = [
  { id: "d1", text: "This is a real run of CipherComply, on Midnight's Preview network." },
  { id: "d2", text: "The policy is public: an annual income of at least eighty-five thousand dollars. We connect a Lace wallet." },
  { id: "d3", text: "We accept the disclosure, and attach a sample payslip." },
  { id: "d4", text: "The document is read, the rules are applied, and the oracle signs an attestation. Eligible." },
  { id: "d5", text: "A zero-knowledge proof is generated, and the wallet approves the transaction." },
  { id: "d6", text: "Verified on Midnight. The transaction is final, and it is on the explorer." },
  { id: "d7", text: "Now, a separate app. Its member area is locked. We prove we hold the key, and it reads the status from the chain." },
  { id: "d8", text: "Access granted. The app never saw a document, an income, or a wallet address." },
];

const DEMO = process.env.VO_SET === "demo";
export const LINES = DEMO ? DEMO_LINES : FILM_LINES;

const env = readFileSync(new URL("../../.env", import.meta.url), "utf8");
const key = /^GEMINI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim().replace(/^["']|["']$/g, "");
if (!key) throw new Error("GEMINI_API_KEY is not set in .env");

const outDir = new URL(DEMO ? "../public/voiceover-demo/" : "../public/voiceover/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const wav = (pcm, rate) => {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
};

const speak = async (text) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: STYLE + text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const part = (await res.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error("no audio in response");
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType)?.[1] ?? 24000);
  return { pcm: Buffer.from(part.inlineData.data, "base64"), rate };
};

const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
let failed = 0;
for (const line of LINES) {
  const file = new URL(`${line.id}.wav`, outDir);
  if (only ? line.id !== only : existsSync(file)) continue;
  try {
    const { pcm, rate } = await speak(line.text);
    writeFileSync(file, wav(pcm, rate));
    console.log(`${line.id}: ${(pcm.length / 2 / rate).toFixed(2)}s`);
  } catch (err) {
    failed++;
    console.log(`${line.id}: FAILED ${String(err.message).replace(key, "***")}`);
    if (/HTTP 4(00|03|04)/.test(err.message)) break;
  }
  await new Promise((r) => setTimeout(r, 21_000));
}

// Durations for every clip present, used to time the scenes.
const durations = {};
for (const line of LINES) {
  const file = new URL(`${line.id}.wav`, outDir);
  if (!existsSync(file)) continue;
  const buf = readFileSync(file);
  durations[line.id] = Number(((buf.length - 44) / buf.readUInt32LE(28)).toFixed(3));
}
writeFileSync(new URL(DEMO ? "../src/voiceover-demo.json" : "../src/voiceover.json", import.meta.url), JSON.stringify(durations, null, 2) + "\n");
console.log(`${Object.keys(durations).length}/${LINES.length} clips present, ${failed} failed this run`);
