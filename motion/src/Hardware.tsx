import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MONO } from "./theme";
import { Chip, Icon, Panel, Stage, Window, clamp, loopFade, ramp } from "./ui";

const ITEMS = [
  { name: "Steel Tube 40×40", qty: "12.500 m", price: 186.25 },
  { name: "Aluminum Sheet 2mm", qty: "4 pcs", price: 96.0 },
  { name: "Copper Cable 6mm²", qty: "25.000 m", price: 142.5 },
];
const SCANS = [22, 56, 90];
const CHARGE = 122;
const TAP = 142;
const APPROVED = 156;
const PRINT = [166, 214];

const money = (v: number) => `$${v.toFixed(2)}`;

export const Hardware: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = loopFade(frame);
  const count = SCANS.filter((s) => frame >= s + 6).length;
  const total = ITEMS.slice(0, count).reduce((a, b) => a + b.price, 0);

  return (
    <Stage glowAt="45% 45%">
      <div style={{ opacity: fade }}>
        <Window title="Checkout · Register 02" style={{ left: 110, top: 130, width: 900, height: 820 }} right={<Chip tone="green">● devices online</Chip>}>
          <div style={{ padding: "30px 36px", display: "flex", flexDirection: "column", height: 820 - 64 }}>
            {ITEMS.map((it, i) => {
              const t = ramp(frame, SCANS[i] + 6, SCANS[i] + 18);
              const flash = interpolate(frame, [SCANS[i] + 6, SCANS[i] + 10, SCANS[i] + 34], [0, 1, 0], clamp);
              return (
                <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 20, padding: "22px 22px", marginBottom: 12, borderRadius: 18, background: `rgba(249,115,22,${0.04 + flash * 0.14})`, border: `1px solid ${flash > 0.05 ? "rgba(249,115,22,0.45)" : C.line}`, opacity: t, transform: `translateY(${(1 - t) * 20}px)` }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", color: C.orangeSoft }}>
                    <Icon d={["M21 8 12 3 3 8v8l9 5 9-5V8Z", "m3 8 9 5 9-5", "M12 13v8"]} size={30} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 27, fontWeight: 500 }}>{it.name}</div>
                    <div style={{ fontFamily: MONO, fontSize: 19, color: C.faint, marginTop: 4 }}>{it.qty}</div>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 26 }}>{money(it.price)}</div>
                </div>
              );
            })}
            <div style={{ marginTop: "auto", borderTop: `1px solid ${C.line}`, paddingTop: 26, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 22, color: C.dim }}>Total</div>
                <div style={{ fontSize: 58, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(total)}</div>
              </div>
              <ChargeButton frame={frame} amount={money(total)} />
            </div>
          </div>
        </Window>

        <Scanner frame={frame} />
        <CardTerminal frame={frame} amount={money(ITEMS.reduce((a, b) => a + b.price, 0))} />
        <Printer frame={frame} />
      </div>
    </Stage>
  );
};

const ChargeButton: React.FC<{ frame: number; amount: string }> = ({ frame, amount }) => {
  const press = interpolate(frame, [CHARGE - 2, CHARGE, CHARGE + 6], [0, 1, 0], clamp);
  const paid = frame >= APPROVED;
  return (
    <div style={{ padding: "24px 40px", borderRadius: 20, fontSize: 28, fontWeight: 600, color: "#160b04", background: paid ? C.green : C.orange, transform: `scale(${1 - press * 0.05})`, boxShadow: `0 10px 40px ${paid ? "rgba(52,211,153,0.35)" : "rgba(249,115,22,0.35)"}` }}>
      {paid ? "✓ Paid" : frame >= CHARGE ? "Waiting for card…" : `Charge ${amount}`}
    </div>
  );
};

const Scanner: React.FC<{ frame: number }> = ({ frame }) => {
  const active = SCANS.reduce((m, s) => Math.max(m, interpolate(frame, [s - 10, s, s + 8], [0, 1, 0], clamp)), 0);
  const sweep = (Math.sin(frame * 0.5) + 1) / 2;
  const beep = SCANS.some((s) => frame >= s && frame < s + 8);
  return (
    <Panel style={{ position: "absolute", left: 1070, top: 130, width: 740, height: 330, padding: 28, overflow: "hidden" }} glow={active * 0.8}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Barcode Scanner</div>
        <Chip tone={beep ? "green" : "dim"}>{beep ? "✓ beep" : "USB · HID"}</Chip>
      </div>
      <div style={{ position: "absolute", left: 120, top: 110, width: 500, height: 170, borderRadius: 16, background: "#f4efe8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 3, height: 90, alignItems: "stretch" }}>
          {Array.from({ length: 46 }, (_, i) => (
            <div key={i} style={{ width: [2, 4, 2, 6, 3][(i * 7) % 5], background: "#1a1a1a" }} />
          ))}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 18, color: "#333", letterSpacing: "0.2em" }}>6 291041 500213</div>
        <div style={{ position: "absolute", left: 20 + sweep * 460, top: -20, bottom: -20, width: 3, background: "#ef4444", boxShadow: "0 0 18px 6px rgba(239,68,68,0.7)", opacity: active }} />
      </div>
    </Panel>
  );
};

const CardTerminal: React.FC<{ frame: number; amount: string }> = ({ frame, amount }) => {
  const shown = ramp(frame, CHARGE, CHARGE + 10);
  const card = interpolate(frame, [TAP - 14, TAP, APPROVED + 6, APPROVED + 22], [140, 0, 0, 140], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const ok = frame >= APPROVED;
  return (
    <Panel style={{ position: "absolute", left: 1070, top: 490, width: 350, height: 460, padding: 26, overflow: "hidden" }} glow={ok ? interpolate(frame, [APPROVED, APPROVED + 30], [1, 0], clamp) : 0}>
      <div style={{ fontSize: 24, fontWeight: 600 }}>Card Terminal</div>
      <div style={{ margin: "26px auto 0", width: 230, height: 300, borderRadius: 28, background: "#0b0b0e", border: `2px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        {ok ? (
          <>
            <div style={{ width: 84, height: 84, borderRadius: 42, background: "rgba(52,211,153,0.15)", display: "grid", placeItems: "center", transform: `scale(${0.6 + ramp(frame, APPROVED, APPROVED + 10) * 0.4})` }}>
              <Icon d="M20 6 9 17l-5-5" size={48} color={C.green} sw={2.6} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: C.green }}>Approved</div>
          </>
        ) : (
          <div style={{ opacity: shown, textAlign: "center" }}>
            <div style={{ fontFamily: MONO, fontSize: 30 }}>{amount}</div>
            <div style={{ fontSize: 20, color: C.dim, marginTop: 10 }}>Tap to pay</div>
            <Icon d={["M8.5 14.5a5 5 0 0 1 0-5", "M12 17a8.5 8.5 0 0 0 0-10", "M15.5 19.5a12 12 0 0 0 0-15"]} size={44} color={C.orangeSoft} />
          </div>
        )}
      </div>
      <div style={{ position: "absolute", left: 90, top: 250 + card, width: 170, height: 106, borderRadius: 14, background: `linear-gradient(135deg, ${C.orange}, #9a3412)`, boxShadow: "0 12px 30px rgba(0,0,0,0.5)", opacity: card < 139 ? 1 : 0 }}>
        <div style={{ position: "absolute", left: 18, top: 30, width: 34, height: 26, borderRadius: 5, background: "#fcd34d" }} />
      </div>
    </Panel>
  );
};

const Printer: React.FC<{ frame: number }> = ({ frame }) => {
  const out = ramp(frame, PRINT[0], PRINT[1], Easing.linear);
  const lines = ["SKYCOURT · REG 02", "Steel Tube   186.25", "Alum Sheet    96.00", "Copper Cbl   142.50", "TOTAL        424.75", "PAID · CARD ••42"];
  return (
    <Panel style={{ position: "absolute", left: 1460, top: 490, width: 350, height: 460, padding: 26, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Printer</div>
        {out > 0 && out < 1 ? <Chip tone="orange">ESC/POS</Chip> : null}
      </div>
      {/* Paper rises out of the slot, header first, like a real receipt printer. */}
      <div style={{ position: "absolute", left: 76, width: 198, top: 372 - out * 270, height: out * 270, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 270, background: "#f7f3ec", padding: "16px 16px", fontFamily: MONO, fontSize: 14, color: "#222", lineHeight: 1.9, whiteSpace: "pre" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontWeight: i === 0 || i === 4 ? 700 : 400 }}>{l}</div>
          ))}
          <div style={{ display: "flex", gap: 2, height: 24, marginTop: 6 }}>
            {Array.from({ length: 30 }, (_, i) => (
              <div key={i} style={{ width: [1, 3, 2][(i * 5) % 3], background: "#222" }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 360, height: 64, borderRadius: 14, background: "#1b1b20", border: `1px solid ${C.line}` }}>
        <div style={{ position: "absolute", left: 30, right: 30, top: 10, height: 4, borderRadius: 2, background: "#000" }} />
        <div style={{ position: "absolute", right: 22, bottom: 16, width: 10, height: 10, borderRadius: 5, background: out > 0 && out < 1 ? C.green : "rgba(255,255,255,0.2)" }} />
      </div>
    </Panel>
  );
};
