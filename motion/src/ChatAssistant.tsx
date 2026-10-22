import React from "react";
import { useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, Spinner, Stage, Window, loopFade, ramp, typed } from "./ui";

const USER = "Where is order #10428, and when will it arrive?";
const REPLY = "It left Dock 02 this morning and is now with the courier. Estimated delivery is tomorrow between 10:00 and 12:00.";
const TOOLS = [
  { call: "orders.get(#10428)", at: 44 },
  { call: "shipping.track(DS-01842)", at: 62 },
];
const U = [10, 34];
const R = [88, 168];

const W = 1320;
const H = 880;

export const ChatAssistant: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = loopFade(frame);
  const thinking = frame >= U[1] + 4 && frame < R[0];

  return (
    <Stage glowAt="50% 40%">
      <div style={{ opacity: fade }}>
        <Window
          title="Company Assistant"
          style={{ left: (1920 - W) / 2, top: (1080 - H) / 2, width: W, height: H }}
          right={<Chip tone="green">● online</Chip>}
        >
          <div style={{ position: "relative", height: H - 64, padding: "40px 56px", display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ alignSelf: "flex-end", maxWidth: 760, opacity: ramp(frame, U[0], U[0] + 8) }}>
              <div style={{ padding: "22px 28px", borderRadius: 26, borderTopRightRadius: 6, background: "rgba(255,255,255,0.08)", border: `1px solid ${C.line}`, fontSize: 31, lineHeight: 1.4 }}>
                {typed(USER, frame, U[0], U[1])}
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", opacity: ramp(frame, U[1] + 4, U[1] + 12) }}>
              <div style={{ width: 60, height: 60, flex: "none", borderRadius: 18, background: `linear-gradient(135deg, ${C.orange}, #9a3412)`, display: "grid", placeItems: "center" }}>
                <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={30} color="#fff" />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  {TOOLS.map((t) =>
                    frame >= t.at ? (
                      <Chip key={t.call} tone={frame >= t.at + 16 ? "green" : "orange"} style={{ opacity: ramp(frame, t.at, t.at + 8) }}>
                        {frame >= t.at + 16 ? "✓" : <Spinner frame={frame} size={20} />} {t.call}
                      </Chip>
                    ) : null,
                  )}
                </div>
                {thinking && frame < TOOLS[0].at ? <Dots frame={frame} /> : null}
                {frame >= R[0] ? (
                  <div style={{ padding: "24px 30px", borderRadius: 26, borderTopLeftRadius: 6, background: "linear-gradient(140deg, rgba(249,115,22,0.2), rgba(249,115,22,0.06))", border: "1px solid rgba(249,115,22,0.35)", fontSize: 31, lineHeight: 1.5, maxWidth: 1000 }}>
                    {typed(REPLY, frame, R[0], R[1])}
                    {frame < R[1] ? <span style={{ opacity: 0.6 }}>▍</span> : null}
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 12, opacity: ramp(frame, R[1] + 4, R[1] + 14) }}>
                  <Chip>source · Orders API</Chip>
                  <Chip>source · Shipping policy §2</Chip>
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 6, opacity: ramp(frame, R[1] + 16, R[1] + 28) }}>
                  {["Notify me on arrival", "Change delivery time"].map((s) => (
                    <span key={s} style={{ padding: "14px 24px", borderRadius: 16, border: "1px solid rgba(249,115,22,0.4)", color: C.orangeSoft, fontSize: 23 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ position: "absolute", left: 56, right: 56, bottom: 36, height: 84, borderRadius: 22, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", padding: "0 28px", gap: 18 }}>
              <span style={{ flex: 1, fontSize: 25, color: C.faint }}>Ask about orders, stock, policies…</span>
              <span style={{ fontFamily: MONO, fontSize: 18, color: C.faint }}>grounded in your data</span>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: C.orange, display: "grid", placeItems: "center" }}>
                <Icon d={["M5 12h14", "m13 6 6 6-6 6"]} size={28} color="#160b04" sw={2.4} />
              </div>
            </div>
          </div>
        </Window>
      </div>
    </Stage>
  );
};

const Dots: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ display: "flex", gap: 10, padding: "20px 26px", borderRadius: 22, background: "rgba(255,255,255,0.06)", alignSelf: "flex-start" }}>
    {[0, 1, 2].map((i) => (
      <span key={i} style={{ width: 12, height: 12, borderRadius: 6, background: C.dim, opacity: 0.35 + 0.65 * Math.max(0, Math.sin(frame * 0.35 - i * 0.9)) }} />
    ))}
  </div>
);
