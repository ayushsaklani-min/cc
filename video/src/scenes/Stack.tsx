import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, MONO, MUTED, PAPER } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Voice, Words } from "../kit";
import { DUR } from "../timing";

const D = DUR.stack;
const k = (x: number) => Math.round(x * D);

/** What exists in the repository today. `at` follows the narration. */
const ON_CHAIN = [
  { name: "COMPACT CONTRACT", at: 0.1 },
  { name: "IN-CIRCUIT SIGNATURE CHECK", at: 0.2 },
  { name: "BLOCK-TIME EXPIRY", at: 0.33 },
  { name: "NULLIFIERS", at: 0.41 },
  { name: "REVOCATION", at: 0.47 },
];
const OFF_CHAIN = [
  { name: "ORACLE SIGNER", at: 0.62 },
  { name: "POLICY ENGINE", at: 0.7 },
  { name: "GATEWAY API", at: 0.78 },
  { name: "LACE WALLET FLOW", at: 0.86 },
];

const Column: React.FC<{ title: string; items: { name: string; at: number }[]; filled: boolean; frame: number }> = ({ title, items, filled, frame }) => (
  <div style={{ flex: 1 }}>
    <div
      style={{
        fontFamily: MONO,
        fontSize: 26,
        letterSpacing: "0.2em",
        color: MUTED,
        marginBottom: 22,
        opacity: interpolate(frame, [k(items[0].at) - 14, k(items[0].at) + 6], [0, 1], { ...clamp, easing: OUT }),
      }}
    >
      {title}
    </div>
    {items.map((item) => (
      <div
        key={item.name}
        style={{
          marginBottom: 14,
          padding: "24px 30px",
          boxSizing: "border-box",
          fontFamily: MONO,
          fontSize: 34,
          letterSpacing: "0.1em",
          border: `2px solid ${INK}`,
          backgroundColor: filled ? INK : PAPER,
          color: filled ? IVORY : INK,
          clipPath: `inset(0 ${interpolate(frame, [k(item.at), k(item.at) + 22], [100, 0], { ...clamp, easing: SWEEP })}% 0 0)`,
        }}
      >
        {item.name}
      </div>
    ))}
  </div>
);

// The parts that are built, split by where they run.
export const Stack: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Stack" style={{ backgroundColor: IVORY }}>
      <Voice id="stack" />
      <Camera duration={D} to={1.04}>
        <Interactive.Div
          name="Section label"
          style={{
            position: "absolute",
            left: 150,
            top: 130,
            fontFamily: MONO,
            fontSize: 28,
            letterSpacing: "0.2em",
            color: MUTED,
            opacity: interpolate(frame, [14, 38], [0, 1], { ...clamp, easing: OUT }),
          }}
        >
          § 04 — WHAT IS BUILT
        </Interactive.Div>

        <Words
          text="A complete, working stack."
          at={20}
          style={{ position: "absolute", left: 150, top: 210, fontFamily: DISPLAY, fontSize: 110, lineHeight: 1.04, letterSpacing: "-0.035em", color: INK }}
        />

        <div style={{ position: "absolute", left: 150, right: 150, top: 410, display: "flex", gap: 60 }}>
          <Column title="ON MIDNIGHT" items={ON_CHAIN} filled frame={frame} />
          <Column title="AROUND IT" items={OFF_CHAIN} filled={false} frame={frame} />
        </div>
      </Camera>
    </AbsoluteFill>
  );
};
