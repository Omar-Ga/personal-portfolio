import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, MONO } from "./theme";

/**
 * "The mind behind the work" finale: one SkyCourt WMS screen split at the seam.
 * Left of x=960 it is drawn as a blueprint (systems), right of it as the finished
 * product (craft). Both layers share the same layout, so they meet exactly.
 *
 * `progress` (0..1) is the build-up; on the site it is driven by scroll.
 */

const SEAM = 960;
const BP = {
  bg: "#06090d",
  grid: "rgba(148, 197, 255, 0.07)",
  line: "rgba(186, 214, 255, 0.55)",
  dim: "rgba(186, 214, 255, 0.32)",
  text: "rgba(214, 230, 255, 0.78)",
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Box = { x: number; y: number; w: number; h: number };
const L = {
  win: { x: 110, y: 96, w: 1700, h: 888 },
  side: { x: 110, y: 160, w: 250, h: 824 },
  kpi: [0, 1, 2, 3].map((i) => ({ x: 392 + i * 351, y: 196, w: 327, h: 138 })),
  chart: { x: 392, y: 362, w: 760, h: 380 },
  table: { x: 1176, y: 362, w: 606, h: 380 },
  dispatch: { x: 392, y: 770, w: 700, h: 186 },
  recon: { x: 1116, y: 770, w: 666, h: 186 },
};

const KPI = [
  { label: "Items in Stock", value: "2,486", q: "COUNT(items)" },
  { label: "Pending Dispatch", value: "18", q: "status = 'reserved'" },
  { label: "Low Stock", value: "7", q: "qty < reorder_at" },
  { label: "Movements Today", value: "64", q: "movements · today" },
];
const SERIES = [30, 36, 33, 42, 40, 51, 47, 56, 54, 63, 60, 71, 68, 78];
const LEDGER = [
  ["14:32", "Steel Tube 40×40", "−12.500 m"],
  ["14:17", "Aluminum Sheet", "+24.000 pcs"],
  ["13:48", "Copper Cable", "−8.250 m"],
  ["13:05", "Flat Bar 50mm", "+15.000 m"],
];

const span = (p: number, a: number, b: number, e = Easing.inOut(Easing.cubic)) => interpolate(p, [a, b], [0, 1], { ...clamp, easing: e });

export const MindSplitScene: React.FC<{ progress: number }> = ({ progress: p }) => (
  <AbsoluteFill style={{ fontFamily: FONT, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${1920 - SEAM}px 0 0)` }}>
      <Blueprint p={p} />
    </div>
    <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${SEAM}px)` }}>
      <Product p={p} />
    </div>
    <div style={{ position: "absolute", left: SEAM - 1, top: 0, bottom: 0, width: 2, background: `linear-gradient(180deg, transparent, rgba(249,115,22,${0.25 + 0.55 * span(p, 0.6, 1)}) 20%, rgba(249,115,22,${0.25 + 0.55 * span(p, 0.6, 1)}) 80%, transparent)` }} />
  </AbsoluteFill>
);

/* ------------------------------------------------------------ blueprint */

const Blueprint: React.FC<{ p: number }> = ({ p }) => {
  // Each outline draws in turn; annotations fade in just after their box.
  const boxes: { b: Box; at: number; label?: string }[] = [
    { b: L.win, at: 0.0, label: "app.window · 1700 × 888" },
    { b: L.side, at: 0.08, label: "nav · 250px" },
    ...L.kpi.map((b, i) => ({ b, at: 0.14 + i * 0.04, label: KPI[i].q })),
    { b: L.chart, at: 0.3, label: "GET /api/v1/movements?range=14d" },
    { b: L.table, at: 0.36, label: "movement_log (append-only)" },
    { b: L.dispatch, at: 0.44, label: "reserve() → confirm()" },
    { b: L.recon, at: 0.5, label: "Decimal(12, 3) reconciliation" },
  ];
  return (
    <AbsoluteFill style={{ background: BP.bg }}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${BP.grid} 1px, transparent 1px), linear-gradient(90deg, ${BP.grid} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(rgba(148,197,255,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(148,197,255,0.11) 1px, transparent 1px)`, backgroundSize: "160px 160px" }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {boxes.map(({ b, at }, i) => (
          <OutlineBox key={i} b={b} draw={span(p, at, at + 0.16)} r={i === 0 ? 26 : 18} />
        ))}
        {/* header rule + sidebar items */}
        <line x1={L.win.x} x2={L.win.x + L.win.w * span(p, 0.06, 0.2)} y1={L.win.y + 64} y2={L.win.y + 64} stroke={BP.dim} strokeWidth={1.5} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={L.side.x + 22} y={L.side.y + 56 + i * 62} width={(L.side.w - 44) * span(p, 0.12 + i * 0.02, 0.2 + i * 0.02)} height={40} rx={10} fill="none" stroke={BP.dim} strokeDasharray="4 6" />
        ))}
        {/* chart axes + dashed series */}
        <ChartSkeleton p={p} />
        {/* ledger columns */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={L.table.x + 24} x2={L.table.x + 24 + (L.table.w - 48) * span(p, 0.42 + i * 0.02, 0.52 + i * 0.02)} y1={L.table.y + 92 + i * 54} y2={L.table.y + 92 + i * 54} stroke={BP.dim} strokeDasharray="3 7" />
        ))}
        {/* dispatch flow */}
        <FlowSkeleton p={p} />
        {/* dimension line under the KPI row */}
        <DimLine x1={L.kpi[0].x} x2={L.kpi[0].x + L.kpi[0].w} y={L.kpi[0].y - 18} p={span(p, 0.2, 0.3)} label="327" />
        <DimLine x1={L.chart.x} x2={L.chart.x + L.chart.w} y={L.chart.y + L.chart.h + 14} p={span(p, 0.36, 0.46)} label="760" />
      </svg>
      {boxes.map(({ b, at, label }, i) =>
        label ? (
          <div key={i} style={{ position: "absolute", left: b.x + 18, top: i === 0 ? b.y + 20 : b.y + 16, fontFamily: MONO, fontSize: i === 0 ? 20 : 17, color: BP.text, opacity: span(p, at + 0.08, at + 0.16), whiteSpace: "nowrap" }}>
            {label}
          </div>
        ) : null,
      )}
      {["/overview", "/orders", "/inventory", "/dispatch", "/ledger", "/reports"].map((r, i) => (
        <div key={r} style={{ position: "absolute", left: L.side.x + 40, top: L.side.y + 66 + i * 62, fontFamily: MONO, fontSize: 16, color: BP.dim, opacity: span(p, 0.16 + i * 0.02, 0.24 + i * 0.02) }}>{r}</div>
      ))}
      {L.kpi.map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x + 18, top: b.y + 64, fontFamily: MONO, fontSize: 30, color: BP.text, opacity: span(p, 0.24 + i * 0.04, 0.32 + i * 0.04) }}>{"{ value }"}</div>
      ))}
      <div style={{ position: "absolute", left: L.dispatch.x + 22, top: L.dispatch.y + 150, fontFamily: MONO, fontSize: 15, color: BP.dim, opacity: span(p, 0.6, 0.7), whiteSpace: "nowrap" }}>
        office.reserve · dock.verify · 2-operator sign-off
      </div>
      <div style={{ position: "absolute", left: L.table.x + 24, top: L.table.y + 52, fontFamily: MONO, fontSize: 16, color: BP.dim, opacity: span(p, 0.42, 0.52), whiteSpace: "nowrap" }}>
        id · item_id · delta NUMERIC(12,3) · operator · created_at
      </div>
    </AbsoluteFill>
  );
};

const OutlineBox: React.FC<{ b: Box; draw: number; r: number }> = ({ b, draw, r }) => (
  <g>
    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={r} fill="none" stroke={BP.line} strokeWidth={1.6} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
    {draw > 0.98
      ? [
          [b.x, b.y],
          [b.x + b.w, b.y],
          [b.x, b.y + b.h],
          [b.x + b.w, b.y + b.h],
        ].map(([x, y], i) => <path key={i} d={`M ${x - 7} ${y} H ${x + 7} M ${x} ${y - 7} V ${y + 7}`} stroke={BP.text} strokeWidth={1.4} />)
      : null}
  </g>
);

const DimLine: React.FC<{ x1: number; x2: number; y: number; p: number; label: string }> = ({ x1, x2, y, p, label }) => {
  const mid = (x1 + x2) / 2;
  const half = ((x2 - x1) / 2) * p;
  return (
    <g opacity={p > 0 ? 1 : 0}>
      <line x1={mid - half} x2={mid + half} y1={y} y2={y} stroke={BP.dim} />
      <line x1={mid - half} x2={mid - half} y1={y - 6} y2={y + 6} stroke={BP.dim} />
      <line x1={mid + half} x2={mid + half} y1={y - 6} y2={y + 6} stroke={BP.dim} />
      <text x={mid} y={y - 8} fill={BP.text} fontFamily={MONO} fontSize={14} textAnchor="middle" opacity={p}>
        {label}
      </text>
    </g>
  );
};

const chartPts = () => {
  const c = L.chart;
  const w = c.w - 72;
  const h = c.h - 120;
  return SERIES.map((v, i) => [c.x + 40 + (i / (SERIES.length - 1)) * w, c.y + 80 + h - (v / 90) * h] as const);
};

const ChartSkeleton: React.FC<{ p: number }> = ({ p }) => {
  const c = L.chart;
  const pts = chartPts();
  const d = pts.map((q, i) => `${i ? "L" : "M"} ${q[0]} ${q[1]}`).join(" ");
  const ax = span(p, 0.32, 0.42);
  return (
    <g>
      <line x1={c.x + 40} y1={c.y + c.h - 40} x2={c.x + 40 + (c.w - 72) * ax} y2={c.y + c.h - 40} stroke={BP.dim} />
      <line x1={c.x + 40} y1={c.y + c.h - 40} x2={c.x + 40} y2={c.y + c.h - 40 - (c.h - 120) * ax} stroke={BP.dim} />
      <path d={d} fill="none" stroke={BP.line} strokeWidth={2} strokeDasharray="6 6" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 - span(p, 0.38, 0.56) }} />
      {pts.map(([x, y], i) => (span(p, 0.38, 0.56) * (pts.length - 1) >= i ? <circle key={i} cx={x} cy={y} r={3.5} fill="none" stroke={BP.text} /> : null))}
    </g>
  );
};

const FlowSkeleton: React.FC<{ p: number }> = ({ p }) => {
  const d = L.dispatch;
  const y = d.y + 116;
  const t = span(p, 0.5, 0.64);
  const nodes = [d.x + 60, d.x + 330, d.x + 600];
  return (
    <g>
      {nodes.map((x, i) => (
        <circle key={i} cx={x} cy={y} r={18} fill="none" stroke={BP.line} strokeWidth={1.6} opacity={t * 3 - i >= 0 ? 1 : 0} />
      ))}
      <line x1={nodes[0] + 18} x2={nodes[0] + 18 + (nodes[2] - nodes[0] - 36) * t} y1={y} y2={y} stroke={BP.line} strokeDasharray="5 6" />
    </g>
  );
};

/* -------------------------------------------------------------- product */

const Product: React.FC<{ p: number }> = ({ p }) => {
  const appear = (at: number) => {
    const t = span(p, at, at + 0.14, Easing.out(Easing.cubic));
    return { opacity: t, transform: `translateY(${(1 - t) * 16}px)` };
  };
  const panel: React.CSSProperties = { position: "absolute", borderRadius: 20, background: "linear-gradient(160deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))", border: `1px solid ${C.line}` };
  const at = (b: Box): React.CSSProperties => ({ left: b.x, top: b.y, width: b.w, height: b.h });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 70% 40%, #1a120d 0%, ${C.bg0} 70%)`, color: C.text }}>
      <div style={{ ...panel, ...at(L.win), borderRadius: 26, background: "rgba(16,16,22,0.92)", boxShadow: "0 40px 120px rgba(0,0,0,0.6)", ...appear(0.02) }}>
        <div style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 26px", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 18, color: C.green }}>● live</span>
        </div>
      </div>
      <div style={{ position: "absolute", ...at(L.side), borderRight: `1px solid ${C.line}`, ...appear(0.1) }} />

      {L.kpi.map((b, i) => (
        <div key={i} style={{ ...panel, ...at(b), padding: "22px 24px", ...appear(0.2 + i * 0.04) }}>
          <div style={{ fontSize: 19, color: C.dim }}>{KPI[i].label}</div>
          <div style={{ fontSize: 44, fontWeight: 600, marginTop: 8 }}>{KPI[i].value}</div>
        </div>
      ))}

      <div style={{ ...panel, ...at(L.chart), ...appear(0.36) }}>
        <div style={{ position: "absolute", left: 26, top: 22, fontSize: 22, fontWeight: 600 }}>Stock movements</div>
        <ProductChart p={p} />
      </div>

      <div style={{ ...panel, ...at(L.table), padding: "22px 24px", ...appear(0.42) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Movement Ledger</div>
          <span style={{ fontFamily: MONO, fontSize: 15, color: C.orangeSoft, padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(249,115,22,0.4)" }}>🔒 append-only</span>
        </div>
        {LEDGER.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 20, marginTop: i ? 14 : 30, opacity: span(p, 0.48 + i * 0.03, 0.58 + i * 0.03) }}>
            <span style={{ fontFamily: MONO, color: C.faint, width: 64 }}>{r[0]}</span>
            <span style={{ flex: 1 }}>{r[1]}</span>
            <span style={{ fontFamily: MONO, color: r[2].startsWith("+") ? C.green : C.orangeSoft }}>{r[2]}</span>
          </div>
        ))}
      </div>

      <div style={{ ...panel, ...at(L.dispatch), padding: "22px 26px", ...appear(0.5) }}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>Dispatch #DS-01842</div>
        <ProductFlow p={p} />
      </div>

      <div style={{ ...panel, ...at(L.recon), padding: "22px 26px", ...appear(0.56) }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Reconciliation</div>
          <span style={{ fontFamily: MONO, fontSize: 17, color: C.green }}>45 / 48 matched</span>
        </div>
        <div style={{ marginTop: 26, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${93.75 * span(p, 0.62, 0.84)}%`, borderRadius: 6, background: `linear-gradient(90deg, ${C.orange}, ${C.amber})` }} />
        </div>
        <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 17, color: C.dim }}>3 drifts flagged · −0.250 m largest</div>
      </div>
    </AbsoluteFill>
  );
};

const ProductChart: React.FC<{ p: number }> = ({ p }) => {
  const c = L.chart;
  const pts = chartPts().map(([x, y]) => [x - c.x, y - c.y] as const);
  const line = pts.map((q, i) => `${i ? "L" : "M"} ${q[0]} ${q[1]}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0]} ${c.h - 40} L ${pts[0][0]} ${c.h - 40} Z`;
  const draw = span(p, 0.42, 0.66);
  return (
    <svg width={c.w} height={c.h} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.orange} stopOpacity="0.38" />
          <stop offset="1" stopColor={C.orange} stopOpacity="0" />
        </linearGradient>
        <clipPath id="mclip">
          <rect x={0} y={0} width={40 + (c.w - 72) * draw} height={c.h} />
        </clipPath>
      </defs>
      <g clipPath="url(#mclip)">
        <path d={area} fill="url(#mg)" />
        <path d={line} fill="none" stroke={C.orangeSoft} strokeWidth={4} strokeLinejoin="round" />
      </g>
    </svg>
  );
};

const ProductFlow: React.FC<{ p: number }> = ({ p }) => {
  const steps = ["Reserved · Office", "Picked · Dock 02", "Confirmed"];
  const t = span(p, 0.58, 0.8);
  return (
    <div style={{ position: "absolute", left: 26, right: 26, top: 92, display: "flex", alignItems: "center" }}>
      {steps.map((s, i) => {
        const done = t * 3 > i + 0.5;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
              <span style={{ width: 36, height: 36, borderRadius: 18, display: "grid", placeItems: "center", background: done ? (i === 2 ? C.green : C.orange) : "rgba(255,255,255,0.08)", color: "#160b04", fontWeight: 700, fontSize: 18 }}>{done ? "✓" : i + 1}</span>
              <span style={{ fontSize: 18, color: done ? C.text : C.faint, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < 2 ? <div style={{ flex: 1, height: 2, margin: "0 14px", background: done ? C.orange : "rgba(255,255,255,0.12)" }} /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------ previews */

/** Full-frame build-up (0→1 over the clip), the source for the site's scrubbed halves. */
export const MindSplit: React.FC = () => {
  const frame = useCurrentFrame();
  return <MindSplitScene progress={interpolate(frame, [0, 149], [0, 1], clamp)} />;
};

/** Demo of the scroll moment: doors close over the title while the scene builds. */
export const MindSplitPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const close = interpolate(frame, [30, 190], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const progress = interpolate(frame, [40, 200], [0, 1], clamp);
  const label = (t: number) => ({ opacity: interpolate(frame, [t, t + 20], [0, 1], clamp) });
  return (
    <AbsoluteFill style={{ background: "#000", fontFamily: FONT, color: "#fff", overflow: "hidden" }}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 150, fontWeight: 500, lineHeight: 1, textAlign: "center" }}>THE MIND<br />BEHIND THE<br />WORK.</div>
        <div style={{ fontSize: 30, color: C.orange, letterSpacing: "0.1em", marginTop: 20 }}>FULL-STACK ENGINEER</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: SEAM, overflow: "hidden", transform: `translateX(${-(1 - close) * SEAM}px)` }}>
        <div style={{ position: "absolute", inset: 0, width: 1920 }}>
          <MindSplitScene progress={progress} />
        </div>
        <Caption role="The Systems" name={["SYSTEMS", "ARCHITECTURE"]} style={label(180)} />
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: SEAM, width: SEAM, overflow: "hidden", transform: `translateX(${(1 - close) * SEAM}px)` }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: -SEAM, width: 1920 }}>
          <MindSplitScene progress={progress} />
        </div>
        <Caption role="The Craft" name={["CREATIVE", "ENGINEERING"]} style={label(186)} />
      </div>
    </AbsoluteFill>
  );
};

const Caption: React.FC<{ role: string; name: string[]; style: React.CSSProperties }> = ({ role, name, style }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "220px 52px 52px", background: "linear-gradient(to top, rgba(0,0,0,0.92) 35%, rgba(0,0,0,0))", ...style }}>
    <div style={{ fontSize: 22, letterSpacing: "0.1em", color: C.orange, textTransform: "uppercase", marginBottom: 10 }}>{role}</div>
    <div style={{ fontSize: 64, fontWeight: 500, lineHeight: 1 }}>
      {name[0]}
      <br />
      {name[1]}
    </div>
  </div>
);
