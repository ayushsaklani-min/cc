import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, LINE, MONO, MUTED, PAPER } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Voice, Words } from "../kit";
import { DUR } from "../timing";

// The relying party's view: a status lookup, nothing else.
export const Protocols: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Protocols" style={{ backgroundColor: IVORY }}>
      <Voice id="protocols" />
      <Camera duration={DUR.protocols}>
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
          § 07 — FOR PROTOCOLS
        </Interactive.Div>

        <div style={{ position: "absolute", left: 150, top: 250, fontFamily: DISPLAY, fontSize: 138, lineHeight: 1.04, letterSpacing: "-0.035em", color: INK }}>
          <Words text="Protocols check a status," at={22} />
          <Words text="not a document." at={84} style={{ fontStyle: "italic" }} />
        </div>

        <Interactive.Div
          name="Status panel"
          style={{
            position: "absolute",
            left: 150,
            right: 150,
            bottom: 150,
            backgroundColor: PAPER,
            border: `2px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "50px 56px",
            boxSizing: "border-box",
            clipPath: `inset(0 ${interpolate(frame, [56, 92], [100, 0], { ...clamp, easing: SWEEP })}% 0 0)`,
          }}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: MUTED }}>REQUEST</div>
            <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 46, color: INK }}>GET /v1/status/{"{subject}"}</div>
          </div>
          <div style={{ width: 2, alignSelf: "stretch", backgroundColor: LINE }} />
          <div style={{ opacity: interpolate(frame, [104, 124], [0, 1], { ...clamp, easing: OUT }) }}>
            <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: MUTED }}>RESPONSE</div>
            <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 46, color: INK }}>verified: true</div>
          </div>
        </Interactive.Div>
      </Camera>
    </AbsoluteFill>
  );
};
