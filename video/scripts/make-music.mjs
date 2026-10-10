// Synthesises the soundtrack (public/music.wav). Original, generated from
// scratch: a slow pad, a bass, a plucked arpeggio and a soft pulse.
// 96 bpm. Pass the video length in seconds; it is rounded up to whole bars.
//   node scripts/make-music.mjs 100
import { mkdirSync, writeFileSync } from "node:fs";

const SR = 44100;
const BEAT = 0.625;
const DURATION = Math.ceil(Number(process.argv[2] ?? 62.5) / (BEAT * 4)) * BEAT * 4;
const N = Math.round(SR * DURATION);
const TAU = Math.PI * 2;

const CHORDS = [
  { bass: 73.42, notes: [146.83, 174.61, 220.0, 329.63] }, // Dm9
  { bass: 58.27, notes: [116.54, 174.61, 220.0, 293.66] }, // Bbmaj7
  { bass: 87.31, notes: [174.61, 220.0, 261.63, 329.63] }, // Fmaj7
  { bass: 65.41, notes: [130.81, 196.0, 293.66, 329.63] }, // Cadd9
];
const CHORD_LEN = BEAT * 8;

const L = new Float64Array(N);
const R = new Float64Array(N);
const wetL = new Float64Array(N);
const wetR = new Float64Array(N);

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** How much of each layer plays over time, following the video's arc. */
const arpLevel = (t) => smooth((t - 4.5) / 6) * (1 - smooth((t - (DURATION - 9)) / 5));
const pulseLevel = (t) => smooth((t - 24) / 4) * (1 - smooth((t - (DURATION - 12)) / 4));

// Pad and bass
for (let c = 0; c * CHORD_LEN < DURATION; c++) {
  const chord = CHORDS[c % CHORDS.length];
  const start = c * CHORD_LEN;
  const from = Math.max(0, Math.round((start - 1.2) * SR));
  const to = Math.min(N, Math.round((start + CHORD_LEN + 1.6) * SR));
  for (let i = from; i < to; i++) {
    const t = i / SR;
    const env = smooth((t - (start - 1.2)) / 1.6) * (1 - smooth((t - (start + CHORD_LEN - 0.4)) / 2.0));
    let l = 0;
    let r = 0;
    chord.notes.forEach((f, k) => {
      const drift = 1 + 0.0025 * Math.sin(TAU * 0.11 * t + k);
      const a = TAU * f * t;
      l += Math.sin(a * drift * 0.998) + 0.28 * Math.sin(2 * a * 0.999) + 0.08 * Math.sin(3 * a);
      r += Math.sin(a * drift * 1.002) + 0.28 * Math.sin(2 * a * 1.001) + 0.08 * Math.sin(3 * a);
    });
    const bass = Math.sin(TAU * chord.bass * t) + 0.25 * Math.sin(TAU * chord.bass * 2 * t);
    L[i] += env * (0.05 * l + 0.16 * bass);
    R[i] += env * (0.05 * r + 0.16 * bass);
    wetL[i] += env * 0.04 * l;
    wetR[i] += env * 0.04 * r;
  }
}

// Plucked arpeggio, eighth notes
const STEP = BEAT / 2;
const PATTERN = [0, 2, 1, 3, 2, 1, 3, 2];
for (let s = 0; s * STEP < DURATION; s++) {
  const start = s * STEP;
  const level = arpLevel(start);
  if (level < 0.01) continue;
  const chord = CHORDS[Math.floor(start / CHORD_LEN) % CHORDS.length];
  const f = chord.notes[PATTERN[s % PATTERN.length]] * 2;
  const pan = s % 2 === 0 ? 0.3 : 0.7;
  const accent = s % 4 === 0 ? 1 : 0.7;
  const from = Math.round(start * SR);
  const to = Math.min(N, from + Math.round(0.9 * SR));
  for (let i = from; i < to; i++) {
    const t = (i - from) / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.16);
    const v = level * accent * env * (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.05));
    L[i] += 0.07 * v * (1 - pan);
    R[i] += 0.07 * v * pan;
    wetL[i] += 0.09 * v * (1 - pan);
    wetR[i] += 0.09 * v * pan;
  }
}

// Soft pulse on the beat
for (let b = 0; b * BEAT < DURATION; b++) {
  const start = b * BEAT;
  const level = pulseLevel(start) * (b % 4 === 0 ? 1 : 0.55);
  if (level < 0.01) continue;
  const from = Math.round(start * SR);
  const to = Math.min(N, from + Math.round(0.35 * SR));
  let phase = 0;
  for (let i = from; i < to; i++) {
    const t = (i - from) / SR;
    phase += (TAU * (46 + 60 * Math.exp(-t / 0.03))) / SR;
    const v = 0.22 * level * Math.exp(-t / 0.11) * Math.sin(phase);
    L[i] += v;
    R[i] += v;
  }
}

// Reverb: four feedback combs into two allpasses, per channel
const reverb = (input, offset) => {
  const out = new Float64Array(N);
  for (const d of [1557, 1617, 1491, 1422]) {
    const len = d + offset;
    const buf = new Float64Array(len);
    let p = 0;
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[p];
      lp = y * 0.72 + lp * 0.28;
      buf[p] = input[i] + lp * 0.86;
      p = (p + 1) % len;
      out[i] += y * 0.25;
    }
  }
  for (const d of [225, 556]) {
    const len = d + offset;
    const buf = new Float64Array(len);
    let p = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[p];
      const x = out[i];
      buf[p] = x + b * 0.5;
      out[i] = b - x * 0.5;
      p = (p + 1) % len;
    }
  }
  return out;
};
const revL = reverb(wetL, 0);
const revR = reverb(wetR, 23);

let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const master = smooth(t / 1.5) * (1 - smooth((t - (DURATION - 4.5)) / 4.5));
  L[i] = (L[i] + revL[i]) * master;
  R[i] = (R[i] + revR[i]) * master;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const gain = 0.82 / peak;

const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(L[i] * gain * 32767), i * 4);
  data.writeInt16LE(Math.round(R[i] * gain * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/music.wav", import.meta.url), Buffer.concat([header, data]));
console.log(`music.wav written: ${DURATION}s, peak before gain ${peak.toFixed(3)}`);
