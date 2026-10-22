import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { C, FONT, MONO } from "./theme";

export const LOOP = 240;
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0→1 between frames a and b, eased. */
export const ramp = (frame: number, a: number, b: number, easing = Easing.out(Easing.cubic)) =>
  interpolate(frame, [a, b], [0, 1], { ...clamp, easing });

/** Fade the whole scene in at the start and out before the loop point. */
export const loopFade = (frame: number, outStart = 222) =>
  interpolate(frame, [0, 8, outStart, LOOP - 2], [0, 1, 1, 0], clamp);

/** Characters of `text` typed between frames a and b. */
export const typed = (text: string, frame: number, a: number, b: number) =>
  text.slice(0, Math.round(interpolate(frame, [a, b], [0, text.length], clamp)));

export const Stage: React.FC<{ glowAt?: string; children: React.ReactNode }> = ({ glowAt = "50% 45%", children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at ${glowAt}, #17110e 0%, ${C.bg0} 68%)`, fontFamily: FONT, color: C.text, overflow: "hidden" }}>
    <AbsoluteFill
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1.2px, transparent 1.2px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
      }}
    />
    {children}
  </AbsoluteFill>
);

export const Label: React.FC<{ children: React.ReactNode; color?: string; dot?: string; style?: React.CSSProperties }> = ({ children, color = C.dim, dot, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color, ...style }}>
    {dot ? <span style={{ width: 12, height: 12, borderRadius: 6, background: dot, boxShadow: `0 0 12px ${dot}` }} /> : null}
    {children}
  </div>
);

export const Panel: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode; glow?: number }> = ({ style, children, glow = 0 }) => (
  <div
    style={{
      borderRadius: 28,
      background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`,
      border: `1.5px solid rgba(249,115,22,${0.1 + glow * 0.7})`,
      boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 ${glow * 60}px rgba(249,115,22,${glow * 0.4})`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** App window with traffic-light chrome and a title. */
export const Window: React.FC<{ title: string; style?: React.CSSProperties; children: React.ReactNode; right?: React.ReactNode }> = ({ title, style, children, right }) => (
  <Panel style={{ position: "absolute", overflow: "hidden", ...style }}>
    <div style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 26px", borderBottom: `1px solid ${C.line}` }}>
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.75 }} />
      ))}
      <span style={{ marginLeft: 16, fontSize: 22, fontWeight: 500, color: C.dim }}>{title}</span>
      <span style={{ marginLeft: "auto" }}>{right}</span>
    </div>
    {children}
  </Panel>
);

export const Chip: React.FC<{ children: React.ReactNode; tone?: "orange" | "green" | "red" | "dim"; style?: React.CSSProperties }> = ({ children, tone = "dim", style }) => {
  const t = {
    orange: ["rgba(249,115,22,0.12)", "rgba(249,115,22,0.4)", C.orangeSoft],
    green: ["rgba(52,211,153,0.09)", "rgba(52,211,153,0.35)", C.green],
    red: ["rgba(239,68,68,0.1)", "rgba(239,68,68,0.4)", "#f87171"],
    dim: ["rgba(255,255,255,0.05)", C.line, C.dim],
  }[tone];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, background: t[0], border: `1px solid ${t[1]}`, color: t[2], fontFamily: MONO, fontSize: 21, whiteSpace: "nowrap", ...style }}>
      {children}
    </span>
  );
};

export const Spinner: React.FC<{ frame: number; size?: number; color?: string }> = ({ frame, size = 26, color = C.orangeSoft }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${frame * 14}deg)` }}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
    <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const Icon: React.FC<{ d: string | string[]; size?: number; color?: string; sw?: number }> = ({ d, size = 36, color = "currentColor", sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);

export const MONO_FONT = MONO;
