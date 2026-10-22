"use client";

import React, { useEffect, useRef } from "react";
import { getPerfTier, prefersReducedMotion } from "@/lib/devicePerf";

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  pulse: number;
  pulseSpeed: number;
  layer: number;
  variant: number; // 0: Orange-White, 1: Radiant White-Gold, 2: Warm Amber-White
}

interface ShimmeringBeamsBackgroundProps {
  /** Whether the parent container/overlay is active and visible */
  active?: boolean;
  /**
   * Something opaque-ish now covers most of the beams (e.g. a detail view):
   * keep them alive but at a reduced frame rate.
   */
  dimmed?: boolean;
  /** Custom additional CSS classes for the container */
  className?: string;
}

const LAYERS = 3;
const BEAMS_PER_LAYER = 9;

/** Motion/pulse constants below are authored per frame at 60fps. */
const FRAME_MS = 1000 / 60;

/** Same warm black gradient the canvas used to repaint every frame; now static CSS. */
const BACKDROP = "linear-gradient(to bottom, #050406 0%, #08060a 50%, #0d090e 100%)";

/** [primary, core, secondary] per beam variant. */
const PALETTES: ReadonlyArray<readonly [string, string, string]> = [
  ["251, 146, 60", "255, 255, 255", "245, 158, 11"],
  ["253, 186, 116", "255, 248, 235", "251, 146, 60"],
  ["245, 158, 11", "255, 255, 255", "234, 88, 12"],
];

/**
 * The beam gradient is smooth along its length, so each sprite is rasterised at
 * a quarter of its vertical resolution and stretched back when drawn. This keeps
 * the (expensive) blur pass and the texture ~4x smaller with no visible change.
 */
const SPRITE_VSCALE = 0.25;

/** Highest alpha a beam can reach: (maxBaseOpacity + 0.12 jitter) * 1.2 pulse. */
const maxPulseOpacity = (layer: number) => (0.09 + layer * 0.06 + 0.12) * 1.2;

function createBeam(width: number, height: number, layer: number): Beam {
  const angle = -35 + Math.random() * 10;
  const baseSpeed = 0.2 + layer * 0.2;
  const baseOpacity = 0.09 + layer * 0.06;
  const baseWidth = 12 + layer * 6;
  const variant = Math.floor(Math.random() * 3);

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    width: baseWidth,
    length: height * 2.5,
    angle,
    speed: baseSpeed + Math.random() * 0.25,
    opacity: baseOpacity + Math.random() * 0.12,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.012 + Math.random() * 0.018,
    layer,
    variant,
  };
}

interface Sprite {
  canvas: HTMLCanvasElement;
  /** Where the sprite's top-left sits relative to the beam origin, in beam space. */
  offsetX: number;
  offsetY: number;
  drawW: number;
  drawH: number;
  /** The pulse opacity the sprite was baked at (globalAlpha = actual / baked). */
  baked: number;
}

/**
 * Bakes one beam (outer aura + bright core, both blurred) into an offscreen
 * canvas at its brightest pulse. Per frame we only draw it with a globalAlpha, so
 * the per-frame `ctx.filter = blur()` and gradient allocation are gone.
 */
function bakeSprite(layer: number, variant: number, length: number): Sprite {
  const w = 12 + layer * 6;
  const auraBlur = 3 + layer * 2;
  const coreBlur = 1 + layer;
  const pad = Math.ceil(auraBlur * 3);
  const len = Math.max(1, Math.round(length * SPRITE_VSCALE));

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w + pad * 2);
  canvas.height = len + pad * 2;
  const ctx = canvas.getContext("2d")!;

  const p = maxPulseOpacity(layer);
  const [primary, core, secondary] = PALETTES[variant];
  const top = pad;
  const cx = canvas.width / 2;

  const aura = ctx.createLinearGradient(0, top, 0, top + len);
  aura.addColorStop(0, `rgba(${primary}, 0)`);
  aura.addColorStop(0.18, `rgba(${primary}, ${p * 0.4})`);
  aura.addColorStop(0.42, `rgba(${core}, ${p * 0.95})`);
  aura.addColorStop(0.55, `rgba(${core}, ${p * 0.95})`);
  aura.addColorStop(0.78, `rgba(${secondary}, ${p * 0.5})`);
  aura.addColorStop(1, `rgba(${secondary}, 0)`);
  ctx.fillStyle = aura;
  ctx.filter = `blur(${auraBlur}px)`;
  ctx.fillRect(cx - w / 2, top, w, len);

  const inner = ctx.createLinearGradient(0, top, 0, top + len);
  inner.addColorStop(0, "rgba(255, 255, 255, 0)");
  inner.addColorStop(0.3, `rgba(255, 255, 255, ${p * 0.6})`);
  inner.addColorStop(0.5, `rgba(255, 255, 255, ${p * 0.95})`);
  inner.addColorStop(0.7, `rgba(255, 240, 220, ${p * 0.6})`);
  inner.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = inner;
  ctx.filter = `blur(${coreBlur}px)`;
  ctx.fillRect(cx - w / 4, top, w / 2, len);

  return {
    canvas,
    offsetX: -canvas.width / 2,
    offsetY: -pad / SPRITE_VSCALE,
    drawW: canvas.width,
    drawH: canvas.height / SPRITE_VSCALE,
    baked: p,
  };
}

export function ShimmeringBeamsBackground({
  active = true,
  dimmed = false,
  className = "",
}: ShimmeringBeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);
  const dimmedRef = useRef(dimmed);

  useEffect(() => {
    dimmedRef.current = dimmed;
  }, [dimmed]);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const tier = getPerfTier();
    const reduceMotion = prefersReducedMotion();
    // The beams are soft light: 1x is indistinguishable and a quarter of the
    // fill cost on high-DPI screens.
    const dpr = 1;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let sprites: Sprite[][] = [];
    let lastTime = 0;
    let running = false;

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      beamsRef.current = [];
      for (let layer = 1; layer <= LAYERS; layer++) {
        for (let i = 0; i < BEAMS_PER_LAYER; i++) {
          beamsRef.current.push(createBeam(width, height, layer));
        }
      }

      sprites = [];
      for (let layer = 1; layer <= LAYERS; layer++) {
        sprites[layer] = PALETTES.map((_, variant) => bakeSprite(layer, variant, height * 2.5));
      }
    };

    const drawBeam = (beam: Beam) => {
      const sprite = sprites[beam.layer][beam.variant];
      const pulsingOpacity = Math.min(1, beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.4));

      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);
      ctx.globalAlpha = Math.min(1, pulsingOpacity / sprite.baked);
      ctx.drawImage(sprite.canvas, sprite.offsetX, sprite.offsetY, sprite.drawW, sprite.drawH);
      ctx.restore();
    };

    const drawFrame = (step: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const beams = beamsRef.current;
      for (let i = 0; i < beams.length; i++) {
        const beam = beams[i];
        beam.y -= beam.speed * (beam.layer / LAYERS + 0.5) * step;
        beam.pulse += beam.pulseSpeed * step;
        if (beam.y + beam.length < -50) {
          beam.y = height + 50;
          beam.x = Math.random() * width;
        }
        drawBeam(beam);
      }
      ctx.globalAlpha = 1;
    };

    const animate = (time: number) => {
      animationFrameRef.current = 0;
      if (!running || document.hidden) {
        running = false;
        return;
      }

      // Lower tiers (and the dimmed detail view) run at 30fps. Motion is
      // delta-time based so apparent speed is unchanged.
      const minInterval = tier === "high" && !dimmedRef.current ? 0 : 1000 / 30;
      const elapsed = lastTime ? time - lastTime : FRAME_MS;
      if (minInterval && elapsed < minInterval - 2) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastTime = time;

      drawFrame(Math.min(elapsed, 100) / FRAME_MS);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const start = () => {
      if (reduceMotion || running || document.hidden) return;
      running = true;
      lastTime = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    build();
    // Always paint one frame so reduced-motion visitors see a static backdrop.
    drawFrame(0);
    start();

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        drawFrame(0);
      }, 150);
    };
    window.addEventListener("resize", onResize);

    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      sprites = [];
      beamsRef.current = [];
    };
  }, [active]);

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
        background: BACKDROP,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "block",
          zIndex: 1,
        }}
      />
    </div>
  );
}

export default ShimmeringBeamsBackground;
