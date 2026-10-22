import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, Panel, Stage, Window, clamp, ramp } from "./ui";

const ROLES = ["Admin", "Manager", "Cashier", "Auditor"];
const PERMS = ["View", "Sell", "Refund", "Stock", "Delete"];
const BASE: boolean[][] = [
  [true, true, true, true, true],
  [true, true, true, true, false],
  [true, true, false, false, false],
  [true, false, false, false, false],
];

const WIN = { x: 110, y: 150, w: 1080, h: 780 };
const COL0 = 330;
const COLW = 150;
const ROW0 = 64 + 110;
const ROWH = 130;
const cell = (r: number, c: number) => ({ x: WIN.x + COL0 + c * COLW + 62, y: WIN.y + ROW0 + r * ROWH + 32 });

/** Toggle cashier/refund on at 46, off again at 176, so the loop ends where it began. */
const GRANT = 46;
const DENY = 112;
const REVOKE = 176;

const LOG = [
  { at: GRANT + 4, tone: "green" as const, icon: "M20 6 9 17l-5-5", text: "Sara M. granted Refund → Cashier", time: "14:32:08" },
  { at: DENY + 4, tone: "red" as const, icon: "M18 6 6 18M6 6l12 12", text: "Auditor · delete INV-2048 denied", time: "14:32:11" },
  { at: REVOKE + 4, tone: "orange" as const, icon: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z", text: "Sara M. revoked Refund → Cashier", time: "14:32:14" },
];

export const AccessControl: React.FC = () => {
  const frame = useCurrentFrame();
  const refundOn = interpolate(frame, [GRANT, GRANT + 8, REVOKE, REVOKE + 8], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const denyFlash = interpolate(frame, [DENY, DENY + 4, DENY + 30], [0, 1, 0], clamp);
  const logFade = interpolate(frame, [222, 238], [1, 0], clamp);

  // Cursor path: rest → cashier/refund → auditor/delete → cashier/refund → rest.
  const a = cell(2, 2);
  const b = cell(3, 4);
  const rest = { x: 980, y: 900 };
  const kx = [0, GRANT - 18, GRANT, DENY - 22, DENY, REVOKE - 22, REVOKE, 218, 240];
  const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
  const cx = interpolate(frame, kx, [rest.x, a.x, a.x, b.x, b.x, a.x, a.x, rest.x, rest.x], ease);
  const cy = interpolate(frame, kx, [rest.y, a.y, a.y, b.y, b.y, a.y, a.y, rest.y, rest.y], ease);
  const press = [GRANT, DENY, REVOKE].reduce((m, t) => Math.max(m, interpolate(frame, [t - 3, t, t + 5], [0, 1, 0], clamp)), 0);

  return (
    <Stage glowAt="40% 45%">
      <Window title="Access Control" style={{ left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h }} right={<Chip tone="orange">RBAC</Chip>}>
        <div style={{ position: "relative", height: WIN.h - 64 }}>
          <div style={{ position: "absolute", top: 40, left: 40, fontSize: 22, color: C.faint, fontFamily: MONO, letterSpacing: "0.12em" }}>ROLE</div>
          {PERMS.map((p, c) => (
            <div key={p} style={{ position: "absolute", top: 40, left: COL0 + c * COLW, width: 128, textAlign: "center", fontSize: 22, color: C.faint, fontFamily: MONO, letterSpacing: "0.08em" }}>
              {p.toUpperCase()}
            </div>
          ))}
          {ROLES.map((r, ri) => {
            const denied = ri === 3 ? denyFlash : 0;
            return (
              <div key={r} style={{ position: "absolute", left: 24, right: 24, top: ROW0 - 64 + ri * ROWH - 22, height: ROWH - 16, borderRadius: 18, background: `rgba(239,68,68,${denied * 0.14})`, border: `1px solid rgba(239,68,68,${denied * 0.5})` }}>
                <div style={{ position: "absolute", left: 18, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 26, background: "rgba(255,255,255,0.07)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 22, color: C.orangeSoft }}>{r[0]}</div>
                  <div style={{ fontSize: 28, fontWeight: 500 }}>{r}</div>
                </div>
                {PERMS.map((_, c) => {
                  const on = ri === 2 && c === 2 ? refundOn : BASE[ri][c] ? 1 : 0;
                  return <Toggle key={c} on={on} style={{ position: "absolute", left: COL0 - 24 + c * COLW + 32, top: (ROWH - 16) / 2 - 18 }} />;
                })}
              </div>
            );
          })}
        </div>
      </Window>

      <Panel style={{ position: "absolute", left: 1230, top: WIN.y, width: 580, height: WIN.h, padding: "30px 30px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, fontWeight: 600 }}>
          <Icon d={["M7 11V7a5 5 0 0 1 10 0v4", "M5 11h14v10H5z"]} size={30} color={C.orangeSoft} />
          Audit Log
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, color: C.faint, marginTop: 8 }}>append-only · tamper-proof</div>
        <div style={{ display: "flex", flexDirection: "column-reverse", gap: 16, marginTop: 30, opacity: logFade }}>
          {LOG.map((l, i) => {
            const t = ramp(frame, l.at, l.at + 12);
            if (t <= 0) return null;
            const col = l.tone === "green" ? C.green : l.tone === "red" ? "#f87171" : C.orangeSoft;
            return (
              <div key={i} style={{ opacity: t, transform: `translateY(${(1 - t) * -16}px)`, display: "flex", gap: 16, padding: "18px 20px", borderRadius: 18, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.line}` }}>
                <div style={{ width: 42, height: 42, flex: "none", borderRadius: 12, display: "grid", placeItems: "center", background: "rgba(255,255,255,0.05)" }}>
                  <Icon d={l.icon} size={24} color={col} sw={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: 22, lineHeight: 1.3 }}>{l.text}</div>
                  <div style={{ fontFamily: MONO, fontSize: 17, color: C.faint, marginTop: 6 }}>{l.time} · 🔒 sealed</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Cursor x={cx} y={cy} press={press} />
    </Stage>
  );
};

const Toggle: React.FC<{ on: number; style: React.CSSProperties }> = ({ on, style }) => (
  <div style={{ width: 68, height: 38, borderRadius: 19, background: on > 0.5 ? `rgba(249,115,22,${0.35 + on * 0.6})` : "rgba(255,255,255,0.1)", border: `1px solid ${on > 0.5 ? "rgba(249,115,22,0.8)" : C.line}`, ...style }}>
    <div style={{ position: "absolute", top: 4, left: 4 + on * 30, width: 28, height: 28, borderRadius: 14, background: on > 0.5 ? "#fff" : "rgba(255,255,255,0.55)", boxShadow: "0 2px 6px rgba(0,0,0,0.4)" }} />
  </div>
);

const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - press * 0.15})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))" }}>
    <div style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: 22, background: `rgba(249,115,22,${press * 0.35})`, transform: `scale(${1 + press})` }} />
    <svg width={34} height={34} viewBox="0 0 24 24">
      <path d="M4 3l7 18 2.5-7.5L21 11 4 3Z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  </div>
);
