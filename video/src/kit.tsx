import { Audio } from "@remotion/media";
import type { CSSProperties } from "react";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { INK, IVORY } from "./fonts";
import { VO_LEAD, WIPE } from "./timing";

export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const SWEEP = Easing.bezier(0.7, 0, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Kinetic headline: each word rises out of its own mask. */
export const Words: React.FC<{ text: string; at: number; stagger?: number; style?: CSSProperties }> = ({ text, at, stagger = 4, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={style}>
      {text.split(" ").map((word, i) => (
        <span key={i}>
          <span
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "top",
              padding: "0.1em 0.14em 0.22em 0.06em",
              margin: "-0.1em -0.14em -0.22em -0.06em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                translate: interpolate(frame, [at + i * stagger, at + i * stagger + 24], ["0% 125%", "0% 0%"], { ...clamp, easing: OUT }),
              }}
            >
              {word}
            </span>
          </span>{" "}
        </span>
      ))}
    </div>
  );
};

/** Slow push-in over the whole scene, so nothing ever sits still. */
export const Camera: React.FC<{ duration: number; children: React.ReactNode; from?: number; to?: number }> = ({ duration, children, from = 1, to = 1.05 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ scale: interpolate(frame, [0, duration], [from, to], clamp) }}>
      {children}
    </AbsoluteFill>
  );
};

/** Darkened corners for the ink scenes. */
export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)" }} />
);

/** The narration clip for a scene. */
export const Voice: React.FC<{ id: keyof typeof VO_LEAD }> = ({ id }) => (
  <Audio from={VO_LEAD[id]} src={staticFile(`voiceover/${id}.wav`)} />
);

/** A redaction bar the size of the frame: covers the cut, then lifts off the next scene. */
export const Slab: React.FC<{ dark: boolean; direction: "right" | "left" | "down" | "up" }> = ({ dark, direction }) => {
  const frame = useCurrentFrame();
  const half = WIPE / 2;
  const p = interpolate(frame, [0, half - 2, half + 2, WIPE], [-101, 0, 0, 101], {
    ...clamp,
    easing: [SWEEP, Easing.linear, SWEEP],
  });
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  const vertical = direction === "down" || direction === "up";
  return (
    <AbsoluteFill
      style={{
        backgroundColor: dark ? INK : IVORY,
        translate: vertical ? `0% ${p * sign}%` : `${p * sign}% 0%`,
      }}
    />
  );
};
