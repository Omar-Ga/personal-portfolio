import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/ReadexPro";
import { C, FONT, MONO } from "./theme";
import { Chip, Panel, Stage, Window, clamp } from "./ui";

const { fontFamily: ARABIC } = loadFont("normal", { weights: ["400", "500", "600"], subsets: ["arabic", "latin"] });

const T = {
  en: {
    hello: "Welcome back, Sara",
    sub: "Here's what's happening across your operations today.",
    nav: ["Dashboard", "Orders", "Inventory", "Customers", "Reports"],
    cards: [
      { k: "Orders", v: "1,482", p: 0.72 },
      { k: "Inventory", v: "2,486", p: 0.58 },
      { k: "Revenue", v: "$284K", p: 0.86 },
    ],
    cta: "New order",
  },
  ar: {
    hello: "مرحبًا بعودتك، سارة",
    sub: "إليك ما يحدث في عملياتك اليوم.",
    nav: ["لوحة التحكم", "الطلبات", "المخزون", "العملاء", "التقارير"],
    cards: [
      { k: "الطلبات", v: "1,482", p: 0.72 },
      { k: "المخزون", v: "2,486", p: 0.58 },
      { k: "الإيرادات", v: "$284K", p: 0.86 },
    ],
    cta: "طلب جديد",
  },
};

const W = 1440;
const H = 820;
const SIDE = 300;

export const Localization: React.FC = () => {
  const frame = useCurrentFrame();
  // EN → AR → EN, ending where it started so the loop is seamless.
  const p = interpolate(frame, [0, 84, 118, 190, 224, 240], [0, 0, 1, 1, 0, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const en = 1 - smooth(p, 0.15, 0.5);
  const ar = smooth(p, 0.5, 0.85);
  const sideX = p * (W - SIDE);
  const contentX = SIDE - p * SIDE;

  return (
    <Stage glowAt="50% 40%">
      <div style={{ position: "absolute", top: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <LangToggle p={p} />
      </div>
      <Window title="Operations Suite" style={{ left: (1920 - W) / 2, top: 170, width: W, height: H }} right={<Chip>{p < 0.5 ? "LTR" : "RTL"}</Chip>}>
        <div style={{ position: "relative", height: H - 64 }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, width: SIDE, left: sideX, borderLeft: `1px solid ${p > 0.5 ? C.line : "transparent"}`, borderRight: `1px solid ${p <= 0.5 ? C.line : "transparent"}`, padding: "30px 22px", background: "#141418", zIndex: 2, boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {T.en.nav.map((_, i) => (
                <div key={i} style={{ position: "relative", height: 56, borderRadius: 14, background: i === 0 ? "rgba(249,115,22,0.14)" : "transparent", border: i === 0 ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent" }}>
                  <Swap en={en} ar={ar} enNode={<span style={{ color: i === 0 ? C.text : C.dim }}>{T.en.nav[i]}</span>} arNode={<span style={{ color: i === 0 ? C.text : C.dim }}>{T.ar.nav[i]}</span>} size={23} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "absolute", top: 0, bottom: 0, left: contentX, width: W - SIDE, padding: "40px 48px" }}>
            <div style={{ position: "relative", height: 64 }}>
              <Swap en={en} ar={ar} enNode={<b style={{ fontWeight: 600 }}>{T.en.hello}</b>} arNode={<b style={{ fontWeight: 600 }}>{T.ar.hello}</b>} size={46} />
            </div>
            <div style={{ position: "relative", height: 40, marginTop: 6 }}>
              <Swap en={en} ar={ar} enNode={<span style={{ color: C.dim }}>{T.en.sub}</span>} arNode={<span style={{ color: C.dim }}>{T.ar.sub}</span>} size={24} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 22, marginTop: 40 }}>
              {T.en.cards.map((c, i) => (
                <Panel key={i} style={{ padding: "26px 28px", height: 210, position: "relative" }}>
                  <div style={{ position: "relative", height: 34 }}>
                    <Swap en={en} ar={ar} enNode={<span style={{ color: C.dim }}>{c.k}</span>} arNode={<span style={{ color: C.dim }}>{T.ar.cards[i].k}</span>} size={22} />
                  </div>
                  <div style={{ fontSize: 50, fontWeight: 600, marginTop: 14, textAlign: p > 0.5 ? "right" : "left", fontVariantNumeric: "tabular-nums" }}>{c.v}</div>
                  <div style={{ marginTop: 22, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, width: `${c.p * 100}%`, left: `${p * (1 - c.p) * 100}%`, borderRadius: 5, background: `linear-gradient(90deg, ${C.orange}, ${C.amber})` }} />
                  </div>
                </Panel>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: p > 0.5 ? "flex-start" : "flex-end", marginTop: 40 }}>
              <div style={{ position: "relative", width: 240, height: 66, borderRadius: 18, background: C.orange, boxShadow: "0 10px 40px rgba(249,115,22,0.35)" }}>
                <Swap en={en} ar={ar} enNode={<b style={{ color: "#160b04", fontWeight: 600 }}>+ {T.en.cta}</b>} arNode={<b style={{ color: "#160b04", fontWeight: 600 }}>{T.ar.cta} +</b>} size={24} center />
              </div>
            </div>
          </div>
        </div>
      </Window>
    </Stage>
  );
};

function smooth(x: number, a: number, b: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** English and Arabic copies of the same slot, cross-fading with their own direction and alignment. */
const Swap: React.FC<{ en: number; ar: number; enNode: React.ReactNode; arNode: React.ReactNode; size: number; center?: boolean }> = ({ en, ar, enNode, arNode, size, center }) => {
  const base: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", padding: center ? 0 : "0 18px", fontSize: size, whiteSpace: "nowrap" };
  return (
    <>
      <div style={{ ...base, justifyContent: center ? "center" : "flex-start", opacity: en, transform: `translateX(${(1 - en) * -14}px)`, fontFamily: FONT }}>{enNode}</div>
      <div dir="rtl" style={{ ...base, justifyContent: center ? "center" : "flex-start", opacity: ar, transform: `translateX(${(1 - ar) * 14}px)`, fontFamily: ARABIC, fontSize: size * 0.94 }}>{arNode}</div>
    </>
  );
};

const LangToggle: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "relative", display: "flex", width: 300, height: 64, borderRadius: 999, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.line}`, padding: 6 }}>
    <div style={{ position: "absolute", top: 6, bottom: 6, width: 144, left: 6 + p * 144, borderRadius: 999, background: C.orange, boxShadow: "0 6px 24px rgba(249,115,22,0.4)" }} />
    <div style={{ position: "relative", flex: 1, display: "grid", placeItems: "center", fontFamily: MONO, fontSize: 22, letterSpacing: "0.12em", color: p < 0.5 ? "#160b04" : C.dim }}>EN</div>
    <div style={{ position: "relative", flex: 1, display: "grid", placeItems: "center", fontFamily: ARABIC, fontSize: 24, color: p >= 0.5 ? "#160b04" : C.dim }}>عربي</div>
  </div>
);
