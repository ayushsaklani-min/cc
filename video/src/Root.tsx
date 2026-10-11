import { Composition, Folder } from "remotion";
import { CipherComplyVideo, SCENES, TOTAL_FRAMES } from "./CipherComplyVideo";
import { Full, FULL_FRAMES } from "./Full";
import { LIVE_DEMO_FRAMES, LiveDemo } from "./LiveDemo";
import { FPS } from "./timing";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CipherComply"
        component={CipherComplyVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition id="Full" component={Full} durationInFrames={FULL_FRAMES} fps={FPS} width={1920} height={1080} />
      <Composition id="LiveDemo" component={LiveDemo} durationInFrames={LIVE_DEMO_FRAMES} fps={FPS} width={1920} height={1080} />
      <Folder name="Scenes">
        {SCENES.map((scene) => (
          <Composition
            key={scene.id}
            id={scene.id}
            component={scene.component}
            durationInFrames={scene.durationInFrames}
            fps={FPS}
            width={1920}
            height={1080}
          />
        ))}
      </Folder>
    </>
  );
};
