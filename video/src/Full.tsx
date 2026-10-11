import { AbsoluteFill, interpolate, Series, useCurrentFrame } from "remotion";
import { CipherComplyVideo, TOTAL_FRAMES } from "./CipherComplyVideo";
import { DISPLAY, INK, IVORY, MONO, ON_INK_MUTED } from "./fonts";
import { Camera, clamp, OUT, SWEEP, Vignette, Words } from "./kit";
import { LIVE_DEMO_FRAMES, LiveDemo } from "./LiveDemo";

const TITLE = 110;

/** A chapter card: part label, a bar that sweeps under it, then the title. */
const TitleCard: React.FC<{ part: string; title: string; note: string }> = ({ part, title, note }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: INK, color: IVORY }}>
      <Camera duration={TITLE} from={1.05} to={1}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 30,
              letterSpacing: "0.24em",
              color: ON_INK_MUTED,
              opacity: interpolate(frame, [4, 24], [0, 1], { ...clamp, easing: OUT }),
            }}
          >
            {part}
          </div>
          <div
            style={{
              marginTop: 34,
              width: 220,
              height: 8,
              backgroundColor: IVORY,
              scale: interpolate(frame, [8, 34], ["0 1", "1 1"], { ...clamp, easing: SWEEP }),
            }}
          />
          <Words
            text={title}
            at={18}
            style={{ marginTop: 44, fontFamily: DISPLAY, fontSize: 150, lineHeight: 1.04, letterSpacing: "-0.035em" }}
          />
          <div
            style={{
              marginTop: 36,
              fontFamily: DISPLAY,
              fontStyle: "italic",
              fontSize: 54,
              color: ON_INK_MUTED,
              opacity: interpolate(frame, [44, 68], [0, 1], { ...clamp, easing: OUT }),
            }}
          >
            {note}
          </div>
        </AbsoluteFill>
      </Camera>
      <Vignette />
      {/* Fade to black into the next part. */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame, [TITLE - 12, TITLE], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};

export const FULL_FRAMES = TITLE + TOTAL_FRAMES + TITLE + LIVE_DEMO_FRAMES;

// The product film and the live run, joined under two chapter titles.
export const Full: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: INK }}>
    <Series>
      <Series.Sequence name="Title — What is CipherComply" durationInFrames={TITLE}>
        <TitleCard part="PART ONE" title="What is CipherComply?" note="Private eligibility verification on Midnight" />
      </Series.Sequence>
      <Series.Sequence name="Product film" durationInFrames={TOTAL_FRAMES}>
        <CipherComplyVideo />
      </Series.Sequence>
      <Series.Sequence name="Title — How it works" durationInFrames={TITLE}>
        <TitleCard part="PART TWO" title="How it works" note="A real run on Midnight Preview" />
      </Series.Sequence>
      <Series.Sequence name="Live run" durationInFrames={LIVE_DEMO_FRAMES}>
        <LiveDemo />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
