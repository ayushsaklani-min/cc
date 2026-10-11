import { Audio } from "@remotion/media";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { INK, IVORY, MONO, ON_INK_LINE, ON_INK_MUTED } from "./fonts";
import { clamp } from "./kit";
import { FPS } from "./timing";
import voiceover from "./voiceover-demo.json";

type LineId = keyof typeof voiceover;

/** The recorded run, in order. Each step is narrated by one clip and shows one or more screenshots. */
const STEPS: { id: LineId; caption: string; shots: number[] }[] = [
  { id: "d1", caption: "SIGN IN", shots: [0, 1] },
  { id: "d2", caption: "POLICY AND WALLET", shots: [2, 3] },
  { id: "d3", caption: "CONSENT AND DOCUMENT", shots: [4, 5] },
  { id: "d4", caption: "ELIGIBLE", shots: [6] },
  { id: "d5", caption: "PROOF AND APPROVAL", shots: [7, 8] },
  { id: "d6", caption: "VERIFIED ON MIDNIGHT", shots: [9] },
  { id: "d7", caption: "A SEPARATE APP", shots: [10, 11, 12] },
  { id: "d8", caption: "ACCESS GRANTED", shots: [13, 14] },
];

const LEAD = 10;
const TAIL = 16;
const FADE = 8;
const BAND = 84;

/** Where every step and screenshot sits on the timeline. */
const TIMELINE = (() => {
  let at = 0;
  const steps = STEPS.map((step) => {
    const duration = LEAD + Math.ceil(voiceover[step.id] * FPS) + TAIL;
    const each = duration / step.shots.length;
    const shots = step.shots.map((shot, i) => ({ shot, from: Math.round(at + i * each), duration: Math.ceil(each) }));
    const placed = { ...step, from: at, duration, shots };
    at += duration;
    return placed;
  });
  return { steps, total: at };
})();

export const LIVE_DEMO_FRAMES = TIMELINE.total;

const shotFile = (n: number) => staticFile(`demo/f${String(n).padStart(3, "0")}.png`);

export const LiveDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const shots = TIMELINE.steps.flatMap((s) => s.shots);
  const stepIndex = Math.max(0, TIMELINE.steps.findIndex((s) => frame < s.from + s.duration));
  const step = TIMELINE.steps[stepIndex];
  // The shot on screen, and the one before it to fade from.
  const current = shots.reduce((last, s, i) => (frame >= s.from - FADE ? i : last), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: INK, color: IVORY, fontFamily: MONO }}>
      <Audio
        src={staticFile("music-demo.wav")}
        volume={(f) => interpolate(f, [0, 30, LIVE_DEMO_FRAMES - 75, LIVE_DEMO_FRAMES - 5], [0, 0.22, 0.22, 0], clamp)}
      />
      {TIMELINE.steps.map((s) => (
        <Audio key={s.id} from={s.from + LEAD} src={staticFile(`voiceover-demo/${s.id}.wav`)} />
      ))}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: BAND,
          padding: "0 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 24,
          letterSpacing: "0.18em",
        }}
      >
        <span style={{ color: ON_INK_MUTED }}>CIPHERCOMPLY — LIVE RUN ON MIDNIGHT PREVIEW</span>
        <span>
          {String(stepIndex + 1).padStart(2, "0")} / {String(TIMELINE.steps.length).padStart(2, "0")} — {step.caption}
        </span>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: BAND, bottom: BAND, overflow: "hidden", backgroundColor: IVORY }}>
        {[current - 1, current]
          .filter((i) => i >= 0)
          .map((i) => {
            const s = shots[i];
            return (
              <Img
                key={s.shot}
                src={shotFile(s.shot)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: i === current && i > 0 ? interpolate(frame, [s.from - FADE, s.from], [0, 1], clamp) : 1,
                  scale: interpolate(frame, [s.from, s.from + s.duration], [1, 1.025], clamp),
                }}
              />
            );
          })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: BAND,
          padding: "0 48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 22,
          letterSpacing: "0.16em",
          color: ON_INK_MUTED,
        }}
      >
        <span>REAL RUN, SHOWN AS SCREENSHOTS · RECORDED ON A LOCAL BUILD</span>
        <span>TX 0x4b5672b5…4339be</span>
        <div style={{ position: "absolute", left: 0, top: 0, height: 3, width: "100%", backgroundColor: ON_INK_LINE }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: 3,
            width: "100%",
            backgroundColor: IVORY,
            transformOrigin: "left center",
            scale: `${interpolate(frame, [0, LIVE_DEMO_FRAMES], [0, 1], clamp)} 1`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
