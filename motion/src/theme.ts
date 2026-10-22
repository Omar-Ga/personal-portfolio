import { loadFont } from "@remotion/google-fonts/Outfit";

const { fontFamily } = loadFont("normal", { weights: ["300", "400", "500", "600", "700"], subsets: ["latin"] });

export const FONT = fontFamily;
export const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace";

export const C = {
  bg0: "#07070a",
  bg1: "#101016",
  panel: "rgba(255,255,255,0.045)",
  panelHi: "rgba(255,255,255,0.08)",
  line: "rgba(255,255,255,0.10)",
  text: "#f4f4f5",
  dim: "rgba(244,244,245,0.55)",
  faint: "rgba(244,244,245,0.28)",
  orange: "#f97316",
  orangeSoft: "#fb923c",
  amber: "#fbbf24",
  green: "#34d399",
};

/** 0→1→0 over a loop, so animations driven by it are seamless at the loop point. */
export const loopPhase = (frame: number, period: number) => (frame % period) / period;
