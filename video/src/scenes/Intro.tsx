import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, MONO, ON_INK_LINE, ON_INK_MUTED } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Vignette, Voice, Words } from "../kit";
import { DUR } from "../timing";

/** Thin bars that streak across the dark frame before the name appears. */
const STREAKS = [
  { top: 170, width: 620, height: 10, at: 0, reverse: false },
  { top: 330, width: 980, height: 22, at: 5, reverse: true },
  { top: 720, width: 760, height: 14, at: 9, reverse: false },
  { top: 880, width: 1180, height: 8, at: 13, reverse: true },
  { top: 250, width: 420, height: 16, at: 17, reverse: false },
  { top: 800, width: 540, height: 26, at: 21, reverse: true },
];

// Streaks cross the dark frame, one bar covers the name, then lifts to reveal it.
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Intro" style={{ backgroundColor: INK }}>
      <Voice id="intro" />
      {STREAKS.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: 0,
            width: s.width,
            height: s.height,
            backgroundColor: i % 2 === 0 ? IVORY : ON_INK_LINE,
            translate: interpolate(frame, [s.at, s.at + 26], s.reverse ? ["1920px 0px", `${-s.width}px 0px`] : [`${-s.width}px 0px`, "1920px 0px"], {
              ...clamp,
              easing: SWEEP,
            }),
          }}
        />
      ))}

      <Camera duration={DUR.intro} from={1.08} to={1}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Interactive.Div
            name="Label"
            style={{
              position: "absolute",
              top: 200,
              fontFamily: MONO,
              fontSize: 30,
              letterSpacing: "0.22em",
              color: ON_INK_MUTED,
              opacity: interpolate(frame, [96, 126], [0, 1], { ...clamp, easing: OUT }),
            }}
          >
            PRIVATE ELIGIBILITY VERIFICATION — BUILT ON MIDNIGHT
          </Interactive.Div>

          <div style={{ position: "relative", overflow: "hidden", padding: "0 30px", marginTop: -40 }}>
            <Interactive.Div
              name="Wordmark"
              style={{
                fontFamily: DISPLAY,
                fontSize: 210,
                lineHeight: 1.1,
                letterSpacing: "-0.035em",
                color: IVORY,
                opacity: interpolate(frame, [62, 63], [0, 1], clamp),
              }}
            >
              CipherComply
            </Interactive.Div>
            <Interactive.Div
              name="Redaction bar"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 34,
                bottom: 22,
                backgroundColor: IVORY,
                translate: interpolate(frame, [30, 62, 72, 104], ["-101% 0px", "0% 0px", "0% 0px", "101% 0px"], {
                  ...clamp,
                  easing: [SWEEP, Easing.linear, SWEEP],
                }),
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 220,
              display: "flex",
              gap: 26,
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 84,
              letterSpacing: "-0.02em",
              color: IVORY,
              whiteSpace: "nowrap",
            }}
          >
            <Words text="Prove the result." at={112} />
            <Words text="Not the document." at={156} />
          </div>
        </AbsoluteFill>
      </Camera>
      <Vignette />
    </AbsoluteFill>
  );
};
