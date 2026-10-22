import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, MONO } from "./theme";

const W = 1920;
const H = 1080;
const LOOP = 240;
const CORE = { x: 960, y: 540 };

type NodeId = "inventory" | "sales" | "accounting" | "warehouse";

const NODES: Record<NodeId, { x: number; y: number; label: string; metric: string; icon: React.ReactNode }> = {
  inventory: { x: 470, y: 300, label: "Inventory", metric: "2,486 SKUs", icon: <BoxIcon /> },
  sales: { x: 470, y: 780, label: "Sales & POS", metric: "1,482 orders", icon: <CartIcon /> },
  accounting: { x: 1450, y: 300, label: "Accounting", metric: "$284,320", icon: <LedgerIcon /> },
  warehouse: { x: 1450, y: 780, label: "Warehouse", metric: "Dock 02 · open", icon: <TruckIcon /> },
};
const IDS = Object.keys(NODES) as NodeId[];

/** One business event per 60 frames: a source node feeds the core, the core fans out. */
const EVENTS: { from: NodeId; to: NodeId[]; log: string }[] = [
  { from: "sales", to: ["inventory", "accounting"], log: "Order #10428  ·  stock −2  ·  invoice +$129.00" },
  { from: "warehouse", to: ["inventory"], log: "Goods received  ·  PO-0042  ·  +120.000 m" },
  { from: "sales", to: ["warehouse"], log: "Dispatch requested  ·  DS-01842  ·  Dock 02" },
  { from: "accounting", to: ["sales"], log: "Invoice settled  ·  INV-2048  ·  $2,450.00" },
];
const EVENT_LEN = LOOP / EVENTS.length;
const IN_FRAMES = 22;
const OUT_START = 26;
const OUT_FRAMES = 22;

const cubic = (a: number, b: number, c: number, d: number, t: number) =>
  (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

/** Curved edge from a node card to the core, bowing horizontally. */
const edge = (id: NodeId) => {
  const n = NODES[id];
  const dir = n.x < CORE.x ? 1 : -1;
  const p0 = { x: n.x + dir * 200, y: n.y };
  const p3 = { x: CORE.x - dir * 130, y: CORE.y + (n.y < CORE.y ? -40 : 40) };
  const p1 = { x: p0.x + dir * 180, y: p0.y };
  const p2 = { x: p3.x - dir * 180, y: p3.y };
  return {
    d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
    at: (t: number) => ({ x: cubic(p0.x, p1.x, p2.x, p3.x, t), y: cubic(p0.y, p1.y, p2.y, p3.y, t) }),
  };
};
const EDGES = Object.fromEntries(IDS.map((id) => [id, edge(id)])) as Record<NodeId, ReturnType<typeof edge>>;

const ease = Easing.inOut(Easing.cubic);

export const DataPipelines: React.FC = () => {
  const frame = useCurrentFrame();
  const evIndex = Math.floor(frame / EVENT_LEN) % EVENTS.length;
  const local = frame % EVENT_LEN;
  const ev = EVENTS[evIndex];

  // Glow per node: how recently a packet arrived (or left).
  const glow: Record<NodeId, number> = { inventory: 0, sales: 0, accounting: 0, warehouse: 0 };
  glow[ev.from] = Math.max(glow[ev.from], interpolate(local, [0, 6, 26], [0.4, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  for (const t of ev.to) {
    glow[t] = Math.max(glow[t], interpolate(local, [OUT_START + OUT_FRAMES - 2, OUT_START + OUT_FRAMES + 4, EVENT_LEN], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  const coreFlash = interpolate(local, [IN_FRAMES - 4, IN_FRAMES + 2, IN_FRAMES + 22], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const packets: { x: number; y: number; o: number; big: boolean }[] = [];
  if (local <= IN_FRAMES) {
    const t = ease(local / IN_FRAMES);
    packets.push({ ...EDGES[ev.from].at(t), o: 1, big: true });
  }
  if (local >= OUT_START && local <= OUT_START + OUT_FRAMES) {
    const t = ease((local - OUT_START) / OUT_FRAMES);
    for (const to of ev.to) packets.push({ ...EDGES[to].at(1 - t), o: 1, big: true });
  }
  // Ambient trickle on every edge, periodic in LOOP so the clip loops seamlessly.
  IDS.forEach((id, i) => {
    for (let k = 0; k < 3; k++) {
      const t = ((frame / LOOP) * 4 + k / 3 + i * 0.17) % 1;
      const toward = i % 2 === 0;
      packets.push({ ...EDGES[id].at(toward ? t : 1 - t), o: 0.35 * Math.sin(Math.PI * t), big: false });
    }
  });

  const gridShift = (frame / LOOP) * 48;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${C.bg1} 0%, ${C.bg0} 70%)`, fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.2px, transparent 1.2px)",
          backgroundSize: "48px 48px",
          backgroundPosition: `${gridShift}px ${gridShift}px`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(249,115,22,${0.1 + coreFlash * 0.12}) 0%, transparent 38%)` }} />

      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {IDS.map((id) => (
          <path key={id} d={EDGES[id].d} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={2.5} strokeDasharray="2 10" strokeLinecap="round" />
        ))}
        {packets.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.big ? 9 : 4} fill={p.big ? C.orangeSoft : "#fff"} opacity={p.o} filter={p.big ? "url(#glow)" : undefined} />
        ))}
      </svg>

      {IDS.map((id) => (
        <NodeCard key={id} id={id} glow={glow[id]} />
      ))}

      <Core flash={coreFlash} frame={frame} />

      <EventLog frame={frame} />

      <div style={{ position: "absolute", left: 96, top: 80, display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 22, letterSpacing: "0.14em", color: C.dim }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: C.green, boxShadow: `0 0 ${10 + 8 * Math.sin((frame / LOOP) * Math.PI * 8) ** 2}px ${C.green}` }} />
        LIVE SYNC
      </div>
    </AbsoluteFill>
  );
};

const NodeCard: React.FC<{ id: NodeId; glow: number }> = ({ id, glow }) => {
  const n = NODES[id];
  return (
    <div
      style={{
        position: "absolute",
        left: n.x - 200,
        top: n.y - 82,
        width: 400,
        height: 164,
        borderRadius: 28,
        background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`,
        border: `1.5px solid rgba(249,115,22,${0.12 + glow * 0.75})`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 ${glow * 60}px rgba(249,115,22,${glow * 0.45})`,
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "0 32px",
        transform: `scale(${1 + glow * 0.035})`,
      }}
    >
      <div style={{ width: 76, height: 76, borderRadius: 22, background: `rgba(249,115,22,${0.12 + glow * 0.25})`, display: "grid", placeItems: "center", color: C.orangeSoft }}>
        {n.icon}
      </div>
      <div style={{ whiteSpace: "nowrap" }}>
        <div style={{ color: C.text, fontSize: 34, fontWeight: 600, letterSpacing: "-0.01em" }}>{n.label}</div>
        <div style={{ color: C.dim, fontSize: 24, fontFamily: MONO, marginTop: 6 }}>{n.metric}</div>
      </div>
    </div>
  );
};

const Core: React.FC<{ flash: number; frame: number }> = ({ flash, frame }) => {
  const spin = (frame / LOOP) * 360;
  return (
    <div style={{ position: "absolute", left: CORE.x - 130, top: CORE.y - 130, width: 260, height: 260 }}>
      <svg width={260} height={260} style={{ position: "absolute", inset: 0, transform: `rotate(${spin}deg)` }}>
        <circle cx={130} cy={130} r={124} fill="none" stroke="rgba(249,115,22,0.35)" strokeWidth={2} strokeDasharray="4 14" />
      </svg>
      <svg width={260} height={260} style={{ position: "absolute", inset: 0, transform: `rotate(${-spin * 2}deg)` }}>
        <circle cx={130} cy={130} r={108} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="60 40" />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 38,
          borderRadius: 48,
          background: `linear-gradient(145deg, #1d1410, #120d0b)`,
          border: `2px solid rgba(249,115,22,${0.4 + flash * 0.6})`,
          boxShadow: `0 0 ${40 + flash * 90}px rgba(249,115,22,${0.25 + flash * 0.45}), inset 0 0 40px rgba(249,115,22,0.12)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${1 + flash * 0.06})`,
        }}
      >
        <svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={C.orangeSoft} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 3 7l9 5 9-5-9-5Z" />
          <path d="m3 12 9 5 9-5" />
          <path d="m3 17 9 5 9-5" />
        </svg>
        <div style={{ color: C.text, fontSize: 24, fontWeight: 600, marginTop: 10, letterSpacing: "0.02em" }}>Core Engine</div>
      </div>
    </div>
  );
};

const EventLog: React.FC<{ frame: number }> = ({ frame }) => {
  const evIndex = Math.floor(frame / EVENT_LEN) % EVENTS.length;
  const local = frame % EVENT_LEN;
  const enter = interpolate(local, [IN_FRAMES, IN_FRAMES + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const exit = interpolate(local, [EVENT_LEN - 10, EVENT_LEN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const latency = [42, 38, 51, 44][evIndex];
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 84,
        transform: `translate(-50%, ${(1 - enter) * 24 - exit * 12}px)`,
        opacity: enter * (1 - exit),
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "20px 34px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${C.line}`,
        fontFamily: MONO,
        fontSize: 26,
        color: C.text,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: C.green }}>✓ synced</span>
      <span style={{ color: C.faint }}>|</span>
      <span>{EVENTS[evIndex].log}</span>
      <span style={{ color: C.faint }}>|</span>
      <span style={{ color: C.orangeSoft }}>{latency}ms</span>
    </div>
  );
};

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function BoxIcon() {
  return <Svg><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></Svg>;
}
function CartIcon() {
  return <Svg><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L22 7H6" /></Svg>;
}
function LedgerIcon() {
  return <Svg><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></Svg>;
}
function TruckIcon() {
  return <Svg><path d="M3 6h11v10H3z" /><path d="M14 9h4l3 3v4h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></Svg>;
}
