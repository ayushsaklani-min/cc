// The site's typefaces: a Didone for headlines, a technical mono for labels.
import { loadFont as loadDisplay } from "@remotion/google-fonts/BodoniModa";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

const display = loadDisplay("normal", { weights: ["400", "500"], subsets: ["latin"] });
loadDisplay("italic", { weights: ["400", "500"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const DISPLAY = display.fontFamily;
export const MONO = mono.fontFamily;

export const IVORY = "#f7f5f1";
export const PAPER = "#fffefb";
export const INK = "#171916";
export const MUTED = "#6d6b65";
export const LINE = "#d6cfc4";
export const ON_INK_MUTED = "#a9a69d";
export const ON_INK_LINE = "#3a3d35";
