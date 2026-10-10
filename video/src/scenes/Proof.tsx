import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, MONO, ON_INK_LINE, ON_INK_MUTED } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Vignette, Voice, Words } from "../kit";
import { DUR } from "../timing";

const D = DUR.proof;
const k = (x: number) => Math.round(x * D);

/**
 * Results recorded in SPIKE-REPORT.md from runs against Midnight Preview.
 * Identifiers are shortened, not altered. `at` follows the narration.
 */
const EVIDENCE = [
  { label: "CONTRACT DEPLOYED", value: "f414a418…39b322df", note: "BLOCK 1221482", at: 0.16 },
  { label: "ATTESTATION SETTLED", value: "tx 007900e4…9113c22d", note: "BLOCK 1225891", at: 0.36 },
  { label: "REVOCATION SETTLED", value: "tx 007ffae0…18172634", note: "BLOCK 1225895", at: 0.47 },
  { label: "END-TO-END RUN", value: "23 of 23 cases passed", note: "CLI WALLET", at: 0.62 },
  { label: "BROWSER FLOW", value: "Verified on Midnight", note: "LACE WALLET", at: 0.76 },
];

// Evidence that the system runs, taken from the project's own test record.
export const Proof: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Proof" style={{ backgroundColor: INK, color: IVORY }}>
      <Voice id="proof" />
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
            color: ON_INK_MUTED,
            opacity: interpolate(frame, [14, 38], [0, 1], { ...clamp, easing: OUT }),
          }}
        >
          § 05 — RUNNING ON MIDNIGHT PREVIEW
        </Interactive.Div>

        <Words
          text="It runs today."
          at={20}
          style={{ position: "absolute", left: 150, top: 200, fontFamily: DISPLAY, fontStyle: "italic", fontSize: 130, lineHeight: 1.04, letterSpacing: "-0.035em" }}
        />

        <div style={{ position: "absolute", left: 150, right: 150, top: 400, borderTop: `1px solid ${ON_INK_LINE}` }}>
          {EVIDENCE.map((row) => {
            const at = k(row.at);
            return (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "25px 0",
                  borderBottom: `1px solid ${ON_INK_LINE}`,
                  opacity: interpolate(frame, [at, at + 20], [0, 1], { ...clamp, easing: OUT }),
                  translate: interpolate(frame, [at, at + 24], ["-30px 0px", "0px 0px"], { ...clamp, easing: OUT }),
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    marginRight: 30,
                    backgroundColor: IVORY,
                    color: INK,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: MONO,
                    fontSize: 26,
                    scale: interpolate(frame, [at + 12, at + 28], [0, 1], { ...clamp, easing: OUT, output: "perceptual-scale" }),
                  }}
                >
                  ✓
                </div>
                <div style={{ width: 520, fontFamily: MONO, fontSize: 30, letterSpacing: "0.14em", color: ON_INK_MUTED }}>{row.label}</div>
                <div style={{ flex: 1, fontFamily: MONO, fontSize: 38, whiteSpace: "nowrap" }}>{row.value}</div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 24,
                    letterSpacing: "0.14em",
                    color: ON_INK_MUTED,
                    clipPath: `inset(0 0 0 ${interpolate(frame, [at + 14, at + 34], [100, 0], { ...clamp, easing: SWEEP })}%)`,
                  }}
                >
                  {row.note}
                </div>
              </div>
            );
          })}
        </div>
      </Camera>
      <Vignette />
    </AbsoluteFill>
  );
};
