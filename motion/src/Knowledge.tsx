import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, Label, Panel, Spinner, Stage, clamp, loopFade, ramp, typed } from "./ui";

const QUESTION = "What's the refund window for enterprise clients?";
const ANSWER_A = "Enterprise clients can request a full refund within 30 days of invoice";
const ANSWER_B = ", and a pro-rated refund up to 90 days for annual plans";

const DOCS = [
  { name: "Refund Policy.pdf", meta: "public · p.4", score: "0.94", hit: true, locked: false },
  { name: "Enterprise SLA.pdf", meta: "public · p.12", score: "0.89", hit: true, locked: false },
  { name: "Finance Ops Handbook", meta: "staff only", score: "—", hit: false, locked: true },
];

const Q = [12, 52];
const SEARCH = [56, 84];
const A1 = [90, 138];
const A2 = [142, 176];

export const Knowledge: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = loopFade(frame);
  const searching = frame >= SEARCH[0] && frame < SEARCH[1];

  return (
    <Stage glowAt="50% 30%">
      <div style={{ opacity: fade }}>
        <div style={{ position: "absolute", left: 120, top: 100, display: "flex", gap: 22, alignItems: "center" }}>
          <Label dot={C.green}>KNOWLEDGE BASE</Label>
          <Chip>Customer portal</Chip>
        </div>

        <Panel style={{ position: "absolute", left: 120, top: 180, width: 1680, height: 110, display: "flex", alignItems: "center", gap: 24, padding: "0 36px" }} glow={searching ? 0.6 : 0}>
          <Icon d={["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "m21 21-4.3-4.3"]} size={38} color={C.orangeSoft} />
          <div style={{ fontSize: 36, flex: 1 }}>
            {typed(QUESTION, frame, Q[0], Q[1])}
            {frame < Q[1] + 6 ? <span style={{ opacity: Math.sin(frame * 0.4) > 0 ? 0.7 : 0 }}>▍</span> : null}
          </div>
          {searching ? <Spinner frame={frame} size={36} /> : frame >= SEARCH[1] ? <Chip tone="green">2 sources · 41ms</Chip> : null}
        </Panel>

        <Panel style={{ position: "absolute", left: 120, top: 330, width: 1060, height: 600, padding: "36px 40px", opacity: ramp(frame, A1[0] - 6, A1[0] + 6) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em", color: C.orangeSoft }}>
            <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={26} />
            ANSWER
          </div>
          <div style={{ fontSize: 38, lineHeight: 1.5, marginTop: 24 }}>
            {typed(ANSWER_A, frame, A1[0], A1[1])}
            {frame >= A1[1] ? <Cite n={1} frame={frame} at={A1[1]} /> : null}
            {typed(ANSWER_B, frame, A2[0], A2[1])}
            {frame >= A2[1] ? <>.<Cite n={2} frame={frame} at={A2[1]} /></> : null}
          </div>
          <div style={{ position: "absolute", left: 40, bottom: 36, display: "flex", gap: 14, opacity: ramp(frame, A2[1] + 4, A2[1] + 16) }}>
            <Chip tone="orange">[1] Refund Policy · §4.2</Chip>
            <Chip tone="orange">[2] Enterprise SLA · p.12</Chip>
          </div>
        </Panel>

        <div style={{ position: "absolute", left: 1220, top: 330, width: 580, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: "0.12em", color: C.faint }}>RETRIEVED</div>
          {DOCS.map((d, i) => {
            const at = SEARCH[0] + 6 + i * 7;
            const show = ramp(frame, at, at + 10);
            const hit = d.hit && frame >= SEARCH[1] ? interpolate(frame, [SEARCH[1], SEARCH[1] + 8], [0, 1], clamp) : 0;
            return (
              <Panel key={d.name} glow={hit * 0.5} style={{ padding: "24px 26px", display: "flex", alignItems: "center", gap: 20, opacity: show * (d.locked ? 0.55 : 1), transform: `translateX(${(1 - show) * 30}px)` }}>
                <div style={{ width: 58, height: 70, borderRadius: 10, background: d.locked ? "rgba(255,255,255,0.05)" : "rgba(249,115,22,0.12)", display: "grid", placeItems: "center", color: d.locked ? C.faint : C.orangeSoft }}>
                  <Icon d={d.locked ? ["M7 11V7a5 5 0 0 1 10 0v4", "M5 11h14v10H5z"] : ["M14 3H6v18h12V7z", "M14 3v4h4", "M9 13h6M9 17h4"]} size={30} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 25, fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 17, color: C.faint, marginTop: 6 }}>{d.meta}</div>
                </div>
                {d.locked ? <Chip tone="red">restricted</Chip> : <Chip tone={hit > 0.5 ? "green" : "dim"}>{d.score}</Chip>}
              </Panel>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

const Cite: React.FC<{ n: number; frame: number; at: number }> = ({ n, frame, at }) => {
  const s = ramp(frame, at, at + 8);
  return (
    <sup style={{ display: "inline-block", marginLeft: 6, padding: "2px 10px", borderRadius: 8, fontSize: 20, fontFamily: MONO, color: "#160b04", background: C.orangeSoft, transform: `scale(${s})`, verticalAlign: "super" }}>{n}</sup>
  );
};
