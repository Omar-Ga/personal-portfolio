import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, MONO } from "./theme";

const LOOP = 240;
const ORB = { x: 600, y: 540, r: 170 };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Line =
  | { kind: "caller" | "agent"; text: string; start: number; end: number }
  | { kind: "tool"; text: string; start: number };

const SCRIPT: Line[] = [
  { kind: "caller", text: "Hi, can I book a table for four tomorrow at 8?", start: 8, end: 58 },
  { kind: "agent", text: "Of course, let me check availability.", start: 70, end: 102 },
  { kind: "tool", text: "check_availability(party: 4, time: 20:00)", start: 106 },
  { kind: "agent", text: "You're booked for 8 PM. I've texted you the confirmation.", start: 128, end: 184 },
  { kind: "tool", text: "send_sms(confirmation)", start: 190 },
];
const FADE_OUT = 222;

/** Who is speaking right now, and how loud (0..1), from the script. */
const speech = (frame: number) => {
  for (const l of SCRIPT) {
    if (l.kind === "tool") continue;
    if (frame >= l.start && frame <= l.end + 4) {
      const env = interpolate(frame, [l.start, l.start + 5, l.end - 2, l.end + 4], [0, 1, 1, 0], clamp);
      // Syllable-like amplitude: a few incommensurate sines.
      const syl = 0.55 + 0.45 * Math.abs(Math.sin(frame * 0.9) * Math.sin(frame * 0.37 + 1.3));
      return { who: l.kind, level: env * syl };
    }
  }
  return { who: "idle" as const, level: 0 };
};

export const VoiceAI: React.FC = () => {
  const frame = useCurrentFrame();
  const s = speech(frame);
  const agent = s.who === "agent" ? s.level : 0;
  const caller = s.who === "caller" ? s.level : 0;
  const idleBreath = 0.5 + 0.5 * Math.sin((frame / LOOP) * Math.PI * 6);
  const fadeAll = interpolate(frame, [FADE_OUT, LOOP - 2], [1, 0], clamp);
  const fadeIn = interpolate(frame, [0, 8], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 32% 50%, #17110e 0%, ${C.bg0} 65%)`, fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${ORB.x}px ${ORB.y}px, rgba(249,115,22,${0.12 + agent * 0.22}) 0%, transparent 30%)` }} />

      <Orb frame={frame} agent={agent} caller={caller} breath={idleBreath} />

      <div style={{ position: "absolute", left: ORB.x, top: ORB.y + ORB.r + 120, transform: "translateX(-50%)", fontFamily: MONO, fontSize: 24, letterSpacing: "0.16em", color: s.who === "agent" ? C.orangeSoft : s.who === "caller" ? C.text : C.faint, textAlign: "center", whiteSpace: "nowrap" }}>
        {s.who === "agent" ? "AGENT SPEAKING" : s.who === "caller" ? "LISTENING" : "THINKING"}
      </div>

      <CallChip frame={frame} />

      <div style={{ position: "absolute", left: 1040, top: 200, width: 760, display: "flex", flexDirection: "column", gap: 22, opacity: fadeAll * fadeIn }}>
        {SCRIPT.map((l, i) => (frame >= l.start ? <Message key={i} line={l} frame={frame} /> : null))}
      </div>

      <div style={{ position: "absolute", right: 120, bottom: 96, display: "flex", gap: 16, fontFamily: MONO, fontSize: 22 }}>
        {["WebRTC", "SIP", "180ms"].map((t, i) => (
          <span key={t} style={{ padding: "10px 20px", borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.05)", color: i === 2 ? C.orangeSoft : C.dim }}>
            {i === 2 ? `⚡ ${t}` : t}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Orb: React.FC<{ frame: number; agent: number; caller: number; breath: number }> = ({ frame, agent, caller, breath }) => {
  const BARS = 72;
  const scale = 1 + agent * 0.08 + breath * 0.015;
  const spin = (frame / LOOP) * 360;
  return (
    <>
      {/* Listening ripples (caller voice) */}
      {[0, 1, 2].map((k) => {
        const t = ((frame / 30) + k / 3) % 1;
        return (
          <div key={k} style={{ position: "absolute", left: ORB.x, top: ORB.y, width: ORB.r * 2, height: ORB.r * 2, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", transform: `translate(-50%,-50%) scale(${1 + t * 0.9})`, opacity: caller * (1 - t) * 0.6 }} />
        );
      })}

      <svg width={1200} height={1080} style={{ position: "absolute", left: ORB.x - 600, top: 0 }}>
        <g transform={`translate(600 ${ORB.y}) rotate(${spin})`}>
          {Array.from({ length: BARS }, (_, i) => {
            const a = (i / BARS) * Math.PI * 2;
            const wave = 0.5 + 0.5 * Math.sin(i * 0.55 + frame * 0.35) * Math.sin(i * 0.21 - frame * 0.18);
            const len = 10 + wave * (8 + agent * 70 + caller * 26);
            const r0 = ORB.r * scale + 26;
            return (
              <line key={i} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * (r0 + len)} y2={Math.sin(a) * (r0 + len)} stroke={agent > caller ? C.orangeSoft : "rgba(255,255,255,0.75)"} strokeOpacity={0.25 + wave * 0.6} strokeWidth={4} strokeLinecap="round" />
            );
          })}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: ORB.x - ORB.r,
          top: ORB.y - ORB.r,
          width: ORB.r * 2,
          height: ORB.r * 2,
          borderRadius: "50%",
          transform: `scale(${scale})`,
          background: `radial-gradient(circle at 35% 30%, #ffd9b8 0%, ${C.orangeSoft} 22%, ${C.orange} 45%, #7c2d12 78%, #2a0f06 100%)`,
          boxShadow: `0 0 ${80 + agent * 120}px rgba(249,115,22,${0.35 + agent * 0.4}), inset -30px -40px 80px rgba(0,0,0,0.45)`,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: -40, background: `conic-gradient(from ${spin * 2}deg, transparent 0deg, rgba(255,255,255,0.18) 40deg, transparent 90deg, transparent 200deg, rgba(255,220,180,0.14) 250deg, transparent 300deg)`, filter: "blur(18px)" }} />
      </div>
    </>
  );
};

const CallChip: React.FC<{ frame: number }> = ({ frame }) => {
  const secs = 12 + Math.floor(frame / 30);
  const dot = 0.5 + 0.5 * Math.sin(frame * 0.25);
  return (
    <div style={{ position: "absolute", left: 96, top: 80, display: "flex", alignItems: "center", gap: 18, padding: "16px 28px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.line}`, color: C.text, fontSize: 26, fontWeight: 500 }}>
      <span style={{ width: 14, height: 14, borderRadius: 7, background: "#ef4444", opacity: 0.5 + dot * 0.5, boxShadow: `0 0 ${6 + dot * 10}px #ef4444` }} />
      AI Agent · Live call
      <span style={{ fontFamily: MONO, color: C.dim }}>00:{String(secs).padStart(2, "0")}</span>
    </div>
  );
};

const Message: React.FC<{ line: Line; frame: number }> = ({ line, frame }) => {
  const appear = interpolate(frame, [line.start, line.start + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const base: React.CSSProperties = { opacity: appear, transform: `translateY(${(1 - appear) * 18}px)` };

  if (line.kind === "tool") {
    const done = frame >= line.start + 14;
    return (
      <div style={{ ...base, alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderRadius: 14, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)", fontFamily: MONO, fontSize: 22, color: C.green }}>
        <span>{done ? "✓" : "⟳"}</span>
        {line.text}
      </div>
    );
  }

  const isAgent = line.kind === "agent";
  const chars = Math.round(interpolate(frame, [line.start, line.end], [0, line.text.length], clamp));
  const typing = chars < line.text.length;
  return (
    <div style={{ ...base, alignSelf: isAgent ? "flex-start" : "flex-end", maxWidth: 620 }}>
      <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.14em", color: isAgent ? C.orangeSoft : C.faint, marginBottom: 8, textAlign: isAgent ? "left" : "right" }}>
        {isAgent ? "AI AGENT" : "CALLER"}
      </div>
      <div
        style={{
          padding: "20px 26px",
          borderRadius: 24,
          borderTopLeftRadius: isAgent ? 6 : 24,
          borderTopRightRadius: isAgent ? 24 : 6,
          background: isAgent ? "linear-gradient(140deg, rgba(249,115,22,0.22), rgba(249,115,22,0.08))" : "rgba(255,255,255,0.07)",
          border: `1px solid ${isAgent ? "rgba(249,115,22,0.35)" : C.line}`,
          color: C.text,
          fontSize: 31,
          lineHeight: 1.35,
        }}
      >
        {line.text.slice(0, chars)}
        {typing ? <span style={{ opacity: 0.6 }}>▍</span> : null}
      </div>
    </div>
  );
};
