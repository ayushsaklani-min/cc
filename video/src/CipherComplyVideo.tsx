import { Audio } from "@remotion/media";
import { TransitionSeries } from "@remotion/transitions";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from "remotion";
import { INK } from "./fonts";
import { Slab } from "./kit";
import { HowItWorks } from "./scenes/HowItWorks";
import { Intro } from "./scenes/Intro";
import { Ledger } from "./scenes/Ledger";
import { Outro } from "./scenes/Outro";
import { Proof } from "./scenes/Proof";
import { Protocols } from "./scenes/Protocols";
import { Solution } from "./scenes/Solution";
import { Stack } from "./scenes/Stack";
import { DUR, HOW_IT_WORKS, WIPE } from "./timing";

/** `dark` is the scene's background; `wipe` is how the bar leaves it. */
export const SCENES = [
  { id: "Intro", component: Intro, durationInFrames: DUR.intro, dark: true, wipe: "right" },
  { id: "Solution", component: Solution, durationInFrames: DUR.solution, dark: false, wipe: "right" },
  { id: "HowItWorks", component: HowItWorks, durationInFrames: HOW_IT_WORKS, dark: false, wipe: "up" },
  { id: "Ledger", component: Ledger, durationInFrames: DUR.ledger, dark: true, wipe: "right" },
  { id: "Stack", component: Stack, durationInFrames: DUR.stack, dark: false, wipe: "down" },
  { id: "Proof", component: Proof, durationInFrames: DUR.proof, dark: true, wipe: "right" },
  { id: "Protocols", component: Protocols, durationInFrames: DUR.protocols, dark: false, wipe: "left" },
  { id: "Outro", component: Outro, durationInFrames: DUR.outro, dark: true, wipe: "right" },
] as const;

// The bar wipes sit on top of the cuts, so they do not shorten the timeline.
export const TOTAL_FRAMES = SCENES.reduce((sum, s) => sum + s.durationInFrames, 0);

/** Thin line along the bottom edge showing how far the film has run. */
const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "difference" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 6,
          width: "100%",
          backgroundColor: "#ffffff",
          transformOrigin: "left center",
          scale: `${interpolate(frame, [0, TOTAL_FRAMES], [0, 1])} 1`,
        }}
      />
    </AbsoluteFill>
  );
};

export const CipherComplyVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* Music sits under the narration and fades out with the last scene. */}
      <Audio
        src={staticFile("music.wav")}
        volume={(f) =>
          interpolate(f, [0, 40, 80, TOTAL_FRAMES - 90, TOTAL_FRAMES - 5], [0, 0.7, 0.3, 0.3, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <TransitionSeries>
        {SCENES.flatMap((scene, i) => {
          const Scene = scene.component;
          const parts = [
            <TransitionSeries.Sequence key={scene.id} name={scene.id} durationInFrames={scene.durationInFrames}>
              <Scene />
            </TransitionSeries.Sequence>,
          ];
          if (i < SCENES.length - 1) {
            parts.push(
              <TransitionSeries.Overlay key={`${scene.id}-wipe`} durationInFrames={WIPE}>
                <Slab dark={!scene.dark} direction={scene.wipe} />
              </TransitionSeries.Overlay>,
            );
          }
          return parts;
        })}
      </TransitionSeries>
      <Progress />
    </AbsoluteFill>
  );
};
