import { Composition, Folder } from "remotion";
import { CipherComplyVideo, SCENES, TOTAL_FRAMES } from "./CipherComplyVideo";
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
