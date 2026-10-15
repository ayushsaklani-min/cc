import { AbsoluteFill, Interactive, interpolate, useCurrentFrame } from "remotion";
import { DISPLAY, INK, IVORY, MONO, ON_INK_LINE, ON_INK_MUTED } from "../fonts";
import { Camera, clamp, OUT, SWEEP, Vignette, Voice, Words } from "../kit";
import { DUR } from "../timing";

// The name, then the claim the film has just backed up.
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill name="Outro" style={{ backgroundColor: INK, color: IVORY }}>
      <Voice id="outro" />
      <Camera duration={DUR.outro} from={1.06} to={1}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 124, lineHeight: 1.06, letterSpacing: "-0.035em", marginTop: -170 }}>
            <Words text="Private financial verification," at={70} />
            <Words text="working on Midnight." at={130} style={{ fontStyle: "italic" }} />
          </div>

          <Interactive.Div
            name="Rule"
            style={{
              position: "absolute",
              bottom: 356,
              width: 420,
              height: 2,
              backgroundColor: ON_INK_LINE,
              scale: interpolate(frame, [20, 56], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
            }}
          />
          <Interactive.Div
            name="Wordmark"
            style={{
              position: "absolute",
              bottom: 218,
              fontFamily: DISPLAY,
              fontSize: 84,
              letterSpacing: "-0.03em",
              opacity: interpolate(frame, [24, 52], [0, 1], { ...clamp, easing: OUT }),
            }}
          >
            CipherComply
          </Interactive.Div>
          <Interactive.Div
            name="Status line"
            style={{
              position: "absolute",
              bottom: 150,
              fontFamily: MONO,
              fontSize: 24,
              letterSpacing: "0.16em",
              color: ON_INK_MUTED,
              opacity: interpolate(frame, [210, 236], [0, 1], { ...clamp, easing: OUT }),
            }}
          >
            TRY IT: CIPHERCOMPLY.VERCEL.APP/SANDBOX — RUNNING ON MIDNIGHT PREVIEW
          </Interactive.Div>
        </AbsoluteFill>
      </Camera>
      <Vignette />
    </AbsoluteFill>
  );
};
