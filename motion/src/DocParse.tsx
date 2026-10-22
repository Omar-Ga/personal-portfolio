import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, Label, Panel, Stage, clamp, loopFade, ramp, typed } from "./ui";

const PAPER = { x: 170, y: 120, w: 640, h: 860 };
const SCAN = [24, 124];

/** Field boxes on the paper (paper-local coords) and where they land in the panel. */
const FIELDS = [
  { key: "Vendor", value: "Oak Studio Supplies", box: { x: 44, y: 70, w: 320, h: 44 } },
  { key: "Invoice No.", value: "INV-2048", box: { x: 420, y: 170, w: 180, h: 36 } },
  { key: "Date", value: "2026-10-22", box: { x: 420, y: 214, w: 180, h: 36 } },
  { key: "Due Date", value: "2026-11-21", box: { x: 420, y: 258, w: 180, h: 36 } },
  { key: "Total", value: "$2,450.00", box: { x: 380, y: 690, w: 220, h: 54 } },
];
const ROW0 = 250;
const ROWH = 96;
const PANEL_X = 980;

const scanY = (frame: number) => interpolate(frame, SCAN, [0, PAPER.h], { ...clamp, easing: Easing.inOut(Easing.quad) });
const hitAt = (y: number) => interpolate(y, [0, PAPER.h], SCAN, clamp);

export const DocParse: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = loopFade(frame);
  const y = scanY(frame);
  const scanning = frame >= SCAN[0] && frame <= SCAN[1];

  return (
    <Stage glowAt="30% 50%">
      <div style={{ opacity: fade }}>
        <Paper frame={frame} />

        {scanning ? (
          <div style={{ position: "absolute", left: PAPER.x - 30, width: PAPER.w + 60, top: PAPER.y + y, height: 4, background: C.green, boxShadow: `0 0 30px 10px rgba(52,211,153,0.45)`, borderRadius: 2 }} />
        ) : null}

        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {FIELDS.map((f, i) => {
            const t0 = hitAt(f.box.y) + 4;
            const draw = ramp(frame, t0, t0 + 14);
            if (draw <= 0) return null;
            const x1 = PAPER.x + f.box.x + f.box.w;
            const y1 = PAPER.y + f.box.y + f.box.h / 2;
            const x2 = PANEL_X + 30;
            const y2 = ROW0 + i * ROWH + 40;
            const d = `M ${x1} ${y1} C ${x1 + 120} ${y1}, ${x2 - 120} ${y2}, ${x2} ${y2}`;
            return <path key={i} d={d} fill="none" stroke={C.orangeSoft} strokeWidth={2.5} strokeOpacity={0.6} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />;
          })}
        </svg>

        <Panel style={{ position: "absolute", left: PANEL_X, top: 120, width: 800, height: 860, padding: "34px 36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Label color={C.orangeSoft}>EXTRACTED FIELDS</Label>
            <Chip tone={frame >= SCAN[1] + 30 ? "green" : "orange"}>{frame >= SCAN[1] + 30 ? "✓ 5/5 · 99% conf." : "parsing…"}</Chip>
          </div>
          {FIELDS.map((f, i) => {
            const t0 = hitAt(f.box.y) + 10;
            const on = ramp(frame, t0, t0 + 10);
            return (
              <div key={f.key} style={{ position: "absolute", left: 30, right: 30, top: ROW0 - 120 + i * ROWH, height: 80, borderRadius: 16, display: "flex", alignItems: "center", padding: "0 26px", gap: 20, background: `rgba(255,255,255,${0.03 + on * 0.03})`, border: `1px solid ${on > 0.5 ? "rgba(249,115,22,0.35)" : C.line}` }}>
                <div style={{ width: 170, fontFamily: MONO, fontSize: 20, color: C.faint }}>{f.key}</div>
                <div style={{ flex: 1, fontSize: 30, fontWeight: 500 }}>{typed(f.value, frame, t0, t0 + 16)}</div>
                {frame >= t0 + 16 ? <Icon d="M20 6 9 17l-5-5" size={30} color={C.green} sw={2.6} /> : null}
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 30, right: 30, bottom: 34, padding: "20px 24px", borderRadius: 16, background: "#0b0b0e", border: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 20, lineHeight: 1.6, color: C.dim, opacity: ramp(frame, SCAN[1] + 30, SCAN[1] + 44) }}>
            <span style={{ color: C.faint }}>→ POST /erp/invoices</span>
            <br />
            {"{ "}<span style={{ color: C.orangeSoft }}>"invoice_no"</span>: "INV-2048", <span style={{ color: C.orangeSoft }}>"total"</span>: 2450.00, <span style={{ color: C.orangeSoft }}>"status"</span>: <span style={{ color: C.green }}>"created"</span>{" }"}
          </div>
        </Panel>
      </div>
    </Stage>
  );
};

const Paper: React.FC<{ frame: number }> = ({ frame }) => {
  const ink = "#2b2b2b";
  const soft = "#9a948c";
  return (
    <div style={{ position: "absolute", left: PAPER.x, top: PAPER.y, width: PAPER.w, height: PAPER.h, background: "#f6f2ea", borderRadius: 10, boxShadow: "0 40px 90px rgba(0,0,0,0.6)", fontFamily: MONO, color: ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 44, top: 40, fontSize: 15, color: soft, letterSpacing: "0.2em" }}>FROM</div>
      <div style={{ position: "absolute", left: 50, top: 78, fontSize: 24, fontWeight: 700, fontFamily: "Georgia, serif" }}>Oak Studio Supplies</div>
      <div style={{ position: "absolute", right: 44, top: 60, fontSize: 40, fontWeight: 700, letterSpacing: "0.12em", fontFamily: "Georgia, serif" }}>INVOICE</div>
      {[["No.", "INV-2048"], ["Date", "2026-10-22"], ["Due", "2026-11-21"]].map(([k, v], i) => (
        <div key={k} style={{ position: "absolute", left: 300, right: 48, top: 176 + i * 44, display: "flex", justifyContent: "space-between", fontSize: 18 }}>
          <span style={{ color: soft }}>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: 44, right: 44, top: 360, borderTop: `2px solid ${ink}` }} />
      {[["Walnut panels ×12", "1,140.00"], ["Brass fittings ×40", "520.00"], ["Finishing oil ×8", "310.00"], ["Delivery", "480.00"]].map(([k, v], i) => (
        <div key={k} style={{ position: "absolute", left: 44, right: 44, top: 390 + i * 56, display: "flex", justifyContent: "space-between", fontSize: 19, borderBottom: "1px solid #ddd5c8", paddingBottom: 14 }}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: 300, right: 48, top: 700, display: "flex", justifyContent: "space-between", fontSize: 26, fontWeight: 700 }}>
        <span>TOTAL</span>
        <span>$2,450.00</span>
      </div>
      {FIELDS.map((f) => {
        const t0 = hitAt(f.box.y) + 2;
        const on = interpolate(frame, [t0, t0 + 6], [0, 1], clamp);
        return <div key={f.key} style={{ position: "absolute", left: f.box.x - 6, top: f.box.y - 6, width: f.box.w + 12, height: f.box.h + 12, borderRadius: 8, border: `2.5px solid rgba(249,115,22,${on})`, background: `rgba(249,115,22,${on * 0.12})` }} />;
      })}
    </div>
  );
};
