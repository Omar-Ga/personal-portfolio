"use client";

import React, { useEffect, useRef } from "react";

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
  /** Custom additional CSS classes for the container */
  className?: string;
}

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

export function ShimmeringBeamsBackground({
  active = true,
  className = "",
}: ShimmeringBeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beamsRef = useRef<Beam[]>([]);
  const animationFrameRef = useRef<number>(0);

  const LAYERS = 3;
  const BEAMS_PER_LAYER = 9;

  useEffect(() => {
    if (!active) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      beamsRef.current = [];
      for (let layer = 1; layer <= LAYERS; layer++) {
        for (let i = 0; i < BEAMS_PER_LAYER; i++) {
          beamsRef.current.push(createBeam(width, height, layer));
        }
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawBeam = (beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);

      const pulsingOpacity = Math.min(
        1,
        beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.4)
      );

      // Color Palette definition per beam variant (Orange-White gradient)
      let primaryColor = "251, 146, 60";  // #fb923c warm orange
      let coreColor = "255, 255, 255";     // brilliant white
      let secondaryColor = "245, 158, 11"; // #f59e0b amber gold

      if (beam.variant === 1) {
        primaryColor = "253, 186, 116";   // peach orange
        coreColor = "255, 248, 235";      // warm ivory white
        secondaryColor = "251, 146, 60";
      } else if (beam.variant === 2) {
        primaryColor = "245, 158, 11";    // amber gold
        coreColor = "255, 255, 255";
        secondaryColor = "234, 88, 12";   // deep orange
      }

      // Outer glowing orange aura gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      gradient.addColorStop(0, `rgba(${primaryColor}, 0)`);
      gradient.addColorStop(0.18, `rgba(${primaryColor}, ${pulsingOpacity * 0.4})`);
      gradient.addColorStop(0.42, `rgba(${coreColor}, ${pulsingOpacity * 0.95})`);
      gradient.addColorStop(0.55, `rgba(${coreColor}, ${pulsingOpacity * 0.95})`);
      gradient.addColorStop(0.78, `rgba(${secondaryColor}, ${pulsingOpacity * 0.5})`);
      gradient.addColorStop(1, `rgba(${secondaryColor}, 0)`);

      ctx.fillStyle = gradient;
      ctx.filter = `blur(${3 + beam.layer * 2}px)`;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);

      // Inner brilliant white shimmering core beam
      const coreGradient = ctx.createLinearGradient(0, 0, 0, beam.length);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      coreGradient.addColorStop(0.3, `rgba(255, 255, 255, ${pulsingOpacity * 0.6})`);
      coreGradient.addColorStop(0.5, `rgba(255, 255, 255, ${pulsingOpacity * 0.95})`);
      coreGradient.addColorStop(0.7, `rgba(255, 240, 220, ${pulsingOpacity * 0.6})`);
      coreGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = coreGradient;
      ctx.filter = `blur(${1 + beam.layer}px)`;
      ctx.fillRect(-beam.width / 4, 0, beam.width / 2, beam.length);

      ctx.restore();
    };

    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const animate = () => {
      if (!canvas || !ctx) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      // Rich deep warm black background gradient matching portfolio aesthetic
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#050406");
      gradient.addColorStop(0.5, "#08060a");
      gradient.addColorStop(1, "#0d090e");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw active shimmering orangeish-white light beams
      beamsRef.current.forEach((beam) => {
        if (!prefersReducedMotion) {
          beam.y -= beam.speed * (beam.layer / LAYERS + 0.5);
          beam.pulse += beam.pulseSpeed;
          if (beam.y + beam.length < -50) {
            beam.y = height + 50;
            beam.x = Math.random() * width;
          }
        }
        drawBeam(beam);
      });

      if (!prefersReducedMotion) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
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
