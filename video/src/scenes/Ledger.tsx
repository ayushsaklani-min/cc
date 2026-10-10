import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, MONO, ON_INK_LINE, ON_INK_MUTED } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Vignette, Voice, Words } from "../kit";
import { DUR } from "../timing";

const D = DUR.ledger;
const k = (x: number) => Math.round(x * D);

const ON_LEDGER = ["A pseudonymous identifier", "A validity date", "A one-time marker"];
const NEVER = ["Your document", "Your income", "Your name"];
/** When each item is named by the narration, as a fraction of the scene. */
const ON_AT = [0.15, 0.26, 0.35];
const NEVER_AT = [0.66, 0.75, 0.84];

// What the public ledger holds, and what it never does.
export const Ledger: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Ledger" style={{ backgroundColor: INK, color: IVORY }}>
      <Voice id="ledger" />
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
          § 03 — THE PRIVACY BOUNDARY
        </Interactive.Div>

        <Interactive.Div
          name="Divider"
          style={{
            position: "absolute",
            left: 959,
            top: 250,
            width: 2,
            height: 560,
            backgroundColor: ON_INK_LINE,
            transformOrigin: "center top",
            scale: interpolate(frame, [20, 70], ["1 0", "1 1"], { ...clamp, easing: SWEEP }),
          }}
        />

        <div style={{ position: "absolute", left: 150, top: 250, width: 740 }}>
          <Words text="On the ledger" at={22} style={{ fontFamily: DISPLAY, fontSize: 88, lineHeight: 1.02, letterSpacing: "-0.035em" }} />
          <div style={{ marginTop: 56, borderTop: `1px solid ${ON_INK_LINE}` }}>
            {ON_LEDGER.map((item, i) => (
              <div
                key={item}
                style={{
                  padding: "30px 0",
                  borderBottom: `1px solid ${ON_INK_LINE}`,
                  fontFamily: DISPLAY,
                  fontSize: 54,
                  opacity: interpolate(frame, [k(ON_AT[i]), k(ON_AT[i]) + 24], [0, 1], { ...clamp, easing: OUT }),
                  translate: interpolate(frame, [k(ON_AT[i]), k(ON_AT[i]) + 24], ["-30px 0px", "0px 0px"], { ...clamp, easing: OUT }),
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", left: 1030, top: 250, width: 740 }}>
          <Words
            text="Never on the ledger"
            at={k(0.52)}
            style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 88, lineHeight: 1.02, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}
          />
          <div style={{ marginTop: 56, borderTop: `1px solid ${ON_INK_LINE}` }}>
            {NEVER.map((item, i) => (
              <div
                key={item}
                style={{
                  padding: "30px 0",
                  borderBottom: `1px solid ${ON_INK_LINE}`,
                  fontFamily: DISPLAY,
                  fontSize: 54,
                  opacity: interpolate(frame, [k(NEVER_AT[i]), k(NEVER_AT[i]) + 14], [0, 1], { ...clamp, easing: OUT }),
                }}
              >
                <span style={{ position: "relative", display: "inline-block" }}>
                  {item}
                  <span
                    style={{
                      position: "absolute",
                      left: -8,
                      right: -8,
                      top: 14,
                      bottom: 8,
                      backgroundColor: IVORY,
                      transformOrigin: "left center",
                      scale: interpolate(frame, [k(NEVER_AT[i]) + 22, k(NEVER_AT[i]) + 44], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>

        <Interactive.Div
          name="Footnote"
          style={{
            position: "absolute",
            left: 150,
            right: 150,
            bottom: 130,
            fontFamily: MONO,
            fontSize: 26,
            letterSpacing: "0.12em",
            lineHeight: 1.5,
            color: ON_INK_MUTED,
            opacity: interpolate(frame, [k(0.9), k(0.9) + 24], [0, 1], { ...clamp, easing: OUT }),
          }}
        >
          THE SERVICE READS YOUR DOCUMENT TO CHECK IT. IT IS NEVER WRITTEN TO THE CHAIN.
        </Interactive.Div>
      </Camera>
      <Vignette />
    </AbsoluteFill>
  );
};
