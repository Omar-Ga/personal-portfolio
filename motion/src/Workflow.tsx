import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, Label, Panel, Spinner, Stage, clamp, loopFade, ramp } from "./ui";

const STEPS = [
  { name: "New Invoice", sub: "inbox@company", icon: ["M4 4h16v16H4z", "m4 4 8 8 8-8"] },
  { name: "AI Extract", sub: "fields + totals", icon: ["M12 3v3", "M12 18v3", "M3 12h3", "M18 12h3", "M7 7h10v10H7z"] },
  { name: "Rules Check", sub: "budget · vendor", icon: ["M9 11l3 3L22 4", "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"] },
  { name: "Manager Sign-off", sub: "human in the loop", icon: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"] },
  { name: "Update ERP", sub: "ledger + stock", icon: ["M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z", "M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6", "M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"] },
];
const X0 = 150;
const GAP = 340;
const NODE_W = 280;
const Y = 420;
const START = 18;
const STEP = 38;
const RUN = 26;

const runStart = (i: number) => START + i * STEP + (i >= 3 ? 14 : 0);

export const Workflow: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = loopFade(frame);
  const doneCount = STEPS.filter((_, i) => frame >= runStart(i) + RUN).length;

  // Token travels between node i and i+1 after node i finishes.
  let token: { x: number; y: number } | null = null;
  for (let i = 0; i < STEPS.length - 1; i++) {
    const a = runStart(i) + RUN;
    const b = runStart(i + 1);
    if (frame >= a && frame <= b) {
      const t = interpolate(frame, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
      token = { x: X0 + i * GAP + NODE_W + t * (GAP - NODE_W), y: Y + 110 };
    }
  }

  return (
    <Stage glowAt="50% 45%">
      <div style={{ opacity: fade }}>
        <div style={{ position: "absolute", left: 120, top: 110, display: "flex", alignItems: "center", gap: 24 }}>
          <Label dot={C.green}>WORKFLOW · INVOICE INTAKE</Label>
          <Chip tone="orange">Run #2048</Chip>
        </div>

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {STEPS.slice(0, -1).map((_, i) => {
            const x1 = X0 + i * GAP + NODE_W;
            const x2 = X0 + (i + 1) * GAP;
            const lit = frame >= runStart(i + 1);
            return <line key={i} x1={x1} x2={x2} y1={Y + 110} y2={Y + 110} stroke={lit ? C.orangeSoft : "rgba(255,255,255,0.15)"} strokeWidth={3} strokeDasharray={lit ? "0" : "4 10"} strokeLinecap="round" />;
          })}
          {token ? <circle cx={token.x} cy={token.y} r={11} fill={C.orangeSoft} style={{ filter: "drop-shadow(0 0 12px #f97316)" }} /> : null}
        </svg>

        {STEPS.map((s, i) => {
          const a = runStart(i);
          const running = frame >= a && frame < a + RUN;
          const done = frame >= a + RUN;
          const glow = running ? 0.6 + 0.4 * Math.sin(frame * 0.4) : done ? interpolate(frame, [a + RUN, a + RUN + 16], [0.8, 0], clamp) : 0;
          return (
            <Panel key={s.name} glow={glow} style={{ position: "absolute", left: X0 + i * GAP, top: Y, width: NODE_W, height: 220, padding: "26px 24px", opacity: ramp(frame, 4 + i * 4, 16 + i * 4) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ width: 62, height: 62, borderRadius: 18, background: done ? "rgba(52,211,153,0.12)" : "rgba(249,115,22,0.12)", display: "grid", placeItems: "center", color: done ? C.green : C.orangeSoft }}>
                  <Icon d={s.icon} size={32} />
                </div>
                {running ? <Spinner frame={frame} size={34} /> : done ? <Icon d="M20 6 9 17l-5-5" size={34} color={C.green} sw={2.6} /> : <span style={{ width: 16, height: 16, borderRadius: 8, border: `2px solid ${C.faint}` }} />}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, marginTop: 24, whiteSpace: "nowrap" }}>{s.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 18, color: C.faint, marginTop: 6 }}>{s.sub}</div>
              {i === 3 && frame >= a + 10 ? (
                <div style={{ position: "absolute", left: 24, right: 24, top: 236, opacity: ramp(frame, a + 10, a + 20) }}>
                  <Chip tone={done ? "green" : "orange"}>
                    <span style={{ width: 30, height: 30, borderRadius: 15, background: C.orange, color: "#160b04", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>LK</span>
                    {done ? "Approved by Lina" : "Awaiting Lina…"}
                  </Chip>
                </div>
              ) : null}
            </Panel>
          );
        })}

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 34, alignItems: "center", padding: "20px 36px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 24 }}>
            <span style={{ color: C.dim }}>step {Math.min(doneCount + 1, 5)}/5</span>
            <div style={{ width: 360, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(doneCount / 5) * 100}%`, background: doneCount === 5 ? C.green : C.orange, borderRadius: 5 }} />
            </div>
            <span style={{ color: doneCount === 5 ? C.green : C.orangeSoft }}>{doneCount === 5 ? "✓ INV-2048 posted" : "running"}</span>
          </div>
        </div>
      </div>
    </Stage>
  );
};
