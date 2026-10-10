import voiceover from "./voiceover.json";

export const FPS = 30;
/** Length of the bar wipe that covers each cut. */
export const WIPE = 30;

type LineId = keyof typeof voiceover;

/** Frames of picture before the narration starts in each scene. */
export const VO_LEAD: Record<LineId, number> = {
  intro: 50,
  solution: 16,
  step1: 16,
  step2: 12,
  step3: 12,
  step4: 12,
  ledger: 16,
  stack: 16,
  proof: 16,
  protocols: 16,
  outro: 16,
};

const TAIL = 24;
const len = (id: LineId, extra = 0) => VO_LEAD[id] + Math.ceil(voiceover[id] * FPS) + TAIL + extra;

/** Every scene is as long as its narration needs. */
export const DUR = {
  intro: len("intro"),
  solution: len("solution"),
  step1: len("step1"),
  step2: len("step2"),
  step3: len("step3"),
  step4: len("step4"),
  ledger: len("ledger"),
  stack: len("stack"),
  proof: len("proof", 20),
  protocols: len("protocols"),
  outro: len("outro", 45),
};

export const HOW_IT_WORKS = DUR.step1 + DUR.step2 + DUR.step3 + DUR.step4;
