import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, LOOP, Panel, Stage, Window, clamp, loopFade, ramp } from "./ui";

const KPIS = [
  { label: "Revenue (MTD)", value: 284320, fmt: (v: number) => `$${Math.round(v).toLocaleString("en-US")}`, delta: "+12.4%" },
  { label: "Open Orders", value: 1482, fmt: (v: number) => Math.round(v).toLocaleString("en-US"), delta: "+8.1%" },
  { label: "Stock Health", value: 96.4, fmt: (v: number) => `${v.toFixed(1)}%`, delta: "+1.2%" },
  { label: "Dispatch Today", value: 64, fmt: (v: number) => String(Math.round(v)), delta: "+5" },
];

const SERIES = [32, 38, 35, 44, 41, 52, 49, 58, 55, 66, 63, 74, 71, 82];

const ROWS = [
  { id: "#10428", who: "Northline Metals", amt: "$12,940", st: "Dispatched" },
  { id: "#10427", who: "Atlas Fabrication", amt: "$8,215", st: "Packing" },
  { id: "#10426", who: "Delta Construction", amt: "$21,600", st: "Approved" },
  { id: "#10425", who: "Riverside Works", amt: "$4,380", st: "Dispatched" },
];

const NAV = ["Overview", "Orders", "Inventory", "Purchasing", "Finance", "Reports"];

export const OpsDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = loopFade(frame);
  const W = 1560;
  const H = 860;

  return (
    <Stage glowAt="50% 40%">
      <div style={{ opacity: fade, transform: `translateY(${(1 - ramp(frame, 0, 20)) * 30}px)` }}>
        <Window title="Operations Hub" style={{ left: (1920 - W) / 2, top: (1080 - H) / 2, width: W, height: H }} right={<Chip tone="green">● live</Chip>}>
          <div style={{ display: "flex", height: H - 64 }}>
            <div style={{ width: 250, borderRight: `1px solid ${C.line}`, padding: "28px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
              {NAV.map((n, i) => (
                <div key={n} style={{ padding: "14px 18px", borderRadius: 14, fontSize: 23, color: i === 0 ? C.text : C.dim, background: i === 0 ? "rgba(249,115,22,0.14)" : "transparent", border: i === 0 ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent", opacity: ramp(frame, 6 + i * 3, 18 + i * 3) }}>
                  {n}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                {KPIS.map((k, i) => {
                  const a = 14 + i * 6;
                  const p = ramp(frame, a, a + 50, Easing.out(Easing.quad));
                  return (
                    <Panel key={k.label} style={{ padding: "22px 24px", opacity: ramp(frame, a, a + 12), transform: `translateY(${(1 - ramp(frame, a, a + 16)) * 20}px)` }}>
                      <div style={{ fontSize: 19, color: C.dim }}>{k.label}</div>
                      <div style={{ fontSize: 40, fontWeight: 600, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>{k.fmt(k.value * p)}</div>
                      <div style={{ fontFamily: MONO, fontSize: 18, color: C.green, marginTop: 6 }}>▲ {k.delta}</div>
                    </Panel>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 20, flex: 1 }}>
                <Chart frame={frame} />
                <Panel style={{ width: 520, padding: "22px 24px", opacity: ramp(frame, 50, 64) }}>
                  <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 14 }}>Live Orders</div>
                  {ROWS.map((r, i) => {
                    const a = 70 + i * 14;
                    const isNew = i === 0;
                    const flash = isNew ? interpolate(frame, [150, 158, 200], [0, 1, 0], clamp) : 0;
                    return (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 12px", borderRadius: 12, fontSize: 20, opacity: ramp(frame, a, a + 12), transform: `translateX(${(1 - ramp(frame, a, a + 14)) * 30}px)`, background: `rgba(249,115,22,${flash * 0.16})` }}>
                        <span style={{ fontFamily: MONO, color: C.faint, width: 92 }}>{r.id}</span>
                        <span style={{ flex: 1, whiteSpace: "nowrap" }}>{r.who}</span>
                        <span style={{ fontFamily: MONO, color: C.dim }}>{r.amt}</span>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 14, opacity: ramp(frame, 150, 160) }}>
                    <Chip tone="orange">
                      <Icon d="M20 6 9 17l-5-5" size={20} /> #10428 dispatched · Dock 02
                    </Chip>
                  </div>
                </Panel>
              </div>
            </div>
          </div>
        </Window>
      </div>
    </Stage>
  );
};

const Chart: React.FC<{ frame: number }> = ({ frame }) => {
  const w = 700;
  const h = 300;
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - (v / 90) * h] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  const draw = ramp(frame, 40, 120, Easing.inOut(Easing.cubic));
  const last = pts[pts.length - 1];
  const pulse = 0.5 + 0.5 * Math.sin((frame / LOOP) * Math.PI * 10);
  return (
    <Panel style={{ flex: 1, padding: "22px 26px", opacity: ramp(frame, 36, 50) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Revenue</div>
        <Chip>Last 14 days</Chip>
      </div>
      <svg width={w} height={h + 10} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.orange} stopOpacity="0.35" />
            <stop offset="1" stopColor={C.orange} stopOpacity="0" />
          </linearGradient>
          <clipPath id="reveal">
            <rect x={0} y={-20} width={w * draw} height={h + 40} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={w} y1={h * g} y2={h * g} stroke="rgba(255,255,255,0.06)" />
        ))}
        <g clipPath="url(#reveal)">
          <path d={area} fill="url(#ag)" />
          <path d={line} fill="none" stroke={C.orangeSoft} strokeWidth={4} strokeLinejoin="round" />
        </g>
        {draw > 0.99 ? (
          <>
            <circle cx={last[0]} cy={last[1]} r={10 + pulse * 10} fill={C.orange} opacity={0.25 * (1 - pulse)} />
            <circle cx={last[0]} cy={last[1]} r={8} fill={C.orangeSoft} />
          </>
        ) : null}
      </svg>
    </Panel>
  );
};
