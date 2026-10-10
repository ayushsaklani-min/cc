import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, LINE, MONO, MUTED, PAPER } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Voice, Words } from "../kit";
import { DUR } from "../timing";

const D = DUR.solution;
const k = (x: number) => Math.round(x * D);

const FIELDS = ["NAME", "ADDRESS", "EMPLOYER", "SALARY", "TAX ID", "BANK ACCOUNT"];
const WIDTHS = [62, 84, 70, 46, 58, 78];

// Every line of the document is covered. One line survives: the result.
export const Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const redact = k(0.3);
  const result = k(0.62);

  return (
    <AbsoluteFill name="Solution" style={{ backgroundColor: IVORY }}>
      <Voice id="solution" />
      <Camera duration={D}>
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
          § 01 — THE PRODUCT
        </Interactive.Div>

        <div style={{ position: "absolute", left: 150, top: 300, fontFamily: DISPLAY, fontSize: 120, lineHeight: 1.04, letterSpacing: "-0.035em", color: INK }}>
          <Words text="One document in." at={22} />
          <Words text="One fact out." at={56} style={{ fontStyle: "italic" }} />
        </div>

        <Interactive.Div
          name="Supporting line"
          style={{
            position: "absolute",
            left: 150,
            bottom: 160,
            width: 880,
            fontFamily: DISPLAY,
            fontSize: 50,
            lineHeight: 1.25,
            color: MUTED,
            opacity: interpolate(frame, [k(0.28), k(0.28) + 30], [0, 1], { ...clamp, easing: OUT }),
            translate: interpolate(frame, [k(0.28), k(0.28) + 30], ["0px 30px", "0px 0px"], { ...clamp, easing: OUT }),
          }}
        >
          A user proves they meet a policy. Nothing else is revealed on-chain.
        </Interactive.Div>

        <Interactive.Div
          name="Document"
          style={{
            position: "absolute",
            right: 190,
            top: 150,
            width: 600,
            height: 790,
            backgroundColor: PAPER,
            border: `2px solid ${INK}`,
            padding: 46,
            boxSizing: "border-box",
            opacity: interpolate(frame, [16, 44], [0, 1], { ...clamp, easing: OUT }),
            translate: interpolate(frame, [16, 56], ["0px 90px", "0px 0px"], { ...clamp, easing: OUT }),
          }}
        >
          <div style={{ width: 150, height: 14, backgroundColor: INK, marginBottom: 44 }} />
          {FIELDS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 38 }}>
              <div style={{ width: 200, fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: MUTED }}>{label}</div>
              <div style={{ position: "relative", height: 20, width: `${WIDTHS[i]}%` }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 12, backgroundColor: LINE }} />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: INK,
                    transformOrigin: "left center",
                    scale: interpolate(frame, [redact + i * 12, redact + 22 + i * 12], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
                  }}
                />
              </div>
            </div>
          ))}
          <div style={{ borderTop: `2px solid ${INK}`, marginTop: 14, paddingTop: 28 }}>
            <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em", color: MUTED, whiteSpace: "nowrap" }}>RESULT — POLICY income-usd-85k:v1</div>
            <Interactive.Div
              name="Result"
              style={{
                fontFamily: DISPLAY,
                fontStyle: "italic",
                fontSize: 104,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: INK,
                opacity: interpolate(frame, [result, result + 24], [0, 1], { ...clamp, easing: OUT }),
                translate: interpolate(frame, [result, result + 24], ["0px 24px", "0px 0px"], { ...clamp, easing: OUT }),
              }}
            >
              Eligible
            </Interactive.Div>
          </div>
        </Interactive.Div>
      </Camera>
    </AbsoluteFill>
  );
};
