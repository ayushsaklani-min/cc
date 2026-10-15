import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, LINE, MONO, MUTED, PAPER } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Voice, Words } from "../kit";
import { DUR } from "../timing";

const D = DUR.signed;
const k = (x: number) => Math.round(x * D);

/** The checks the over-18 policy makes, in order. `at` follows the narration. */
const CHECKS = [
  { label: "NO AI MODEL INVOLVED", at: 0.12 },
  { label: "SIGNED BY DIGILOCKER", at: 0.3 },
  { label: "SIGNATURE COVERS EVERY BYTE", at: 0.4 },
  { label: "DATE OF BIRTH: 18 OR OVER", at: 0.48 },
  { label: "ONE RECORD, ONE IDENTITY", at: 0.76 },
];

// Evidence that is checked by its issuer's signature instead of being read by a model.
export const Signed: React.FC = () => {
  const frame = useCurrentFrame();
  const forged = k(0.56);

  return (
    <AbsoluteFill name="Signed" style={{ backgroundColor: IVORY }}>
      <Voice id="signed" />
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
          § 04 — SIGNED, NOT READ
        </Interactive.Div>

        <div style={{ position: "absolute", left: 150, top: 210, fontFamily: DISPLAY, fontSize: 104, lineHeight: 1.04, letterSpacing: "-0.035em", color: INK }}>
          <Words text="Signed by the issuer." at={22} />
          <Words text="Not read by an AI." at={60} style={{ fontStyle: "italic" }} />
        </div>

        {/* The checks, ticking off as the narration names them. */}
        <div style={{ position: "absolute", left: 150, top: 500, width: 820, borderTop: `2px solid ${INK}` }}>
          {CHECKS.map((c) => (
            <div
              key={c.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 0",
                borderBottom: `1px solid ${LINE}`,
                opacity: interpolate(frame, [k(c.at), k(c.at) + 16], [0, 1], { ...clamp, easing: OUT }),
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 30, letterSpacing: "0.12em" }}>{c.label}</span>
              <span
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: INK,
                  color: IVORY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 26,
                  scale: interpolate(frame, [k(c.at) + 8, k(c.at) + 22], [0, 1], { ...clamp, easing: OUT, output: "perceptual-scale" }),
                }}
              >
                ✓
              </span>
            </div>
          ))}
        </div>

        {/* The record, then a forged copy that is refused. */}
        <div style={{ position: "absolute", right: 170, top: 230, width: 560 }}>
          <Interactive.Div
            name="Record"
            style={{
              backgroundColor: PAPER,
              border: `2px solid ${INK}`,
              padding: 40,
              boxSizing: "border-box",
              opacity: interpolate(frame, [16, 44], [0, 1], { ...clamp, easing: OUT }),
              translate: interpolate(frame, [16, 52], ["0px 80px", "0px 0px"], { ...clamp, easing: OUT }),
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: MUTED }}>PAN VERIFICATION RECORD</div>
            {[78, 60, 70, 52].map((w, i) => (
              <div key={i} style={{ marginTop: 28, height: 14, width: `${w}%`, backgroundColor: LINE }} />
            ))}
            <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: `3px solid ${INK}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 30,
                  scale: interpolate(frame, [k(0.3), k(0.3) + 18], [0, 1], { ...clamp, easing: OUT, output: "perceptual-scale" }),
                }}
              >
                ✓
              </div>
              <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.1em", opacity: interpolate(frame, [k(0.3), k(0.3) + 18], [0, 1], clamp) }}>
                DIGITALLY SIGNED · DIGILOCKER
              </div>
            </div>
          </Interactive.Div>

          <Interactive.Div
            name="Forged copy"
            style={{
              marginTop: 28,
              padding: "22px 30px",
              border: `2px solid ${INK}`,
              backgroundColor: INK,
              color: IVORY,
              fontFamily: MONO,
              fontSize: 26,
              letterSpacing: "0.1em",
              clipPath: `inset(0 ${interpolate(frame, [forged, forged + 24], [100, 0], { ...clamp, easing: SWEEP })}% 0 0)`,
            }}
          >
            ONE BYTE EDITED → REFUSED
            <div style={{ marginTop: 8, fontSize: 22, color: "#a9a69d" }}>signature_invalid</div>
          </Interactive.Div>
        </div>
      </Camera>
    </AbsoluteFill>
  );
};
