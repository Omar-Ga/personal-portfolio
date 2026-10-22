"use client";

import { ReactLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<any>(null);
  // "Mobile" here means: no JS-driven smooth wheel. Phones/tablets scroll
  // natively, and reduced-motion visitors opt out of smoothed scrolling too.
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const queries = [
      window.matchMedia("(max-width: 768px)"),
      window.matchMedia("(prefers-reduced-motion: reduce)"),
    ];
    const update = () => setIsMobile(queries.some((q) => q.matches));
    update();

    queries.forEach((q) => q.addEventListener("change", update));
    return () => {
      queries.forEach((q) => q.removeEventListener("change", update));
    };
  }, []);

  useEffect(() => {
    // Smoothed desktop scrolling needs unthrottled frame deltas; everywhere else
    // keep GSAP's default lag smoothing so a slow frame doesn't teleport tweens.
    if (!isMobile) gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
    }

    // Lenis still needs a frame source for programmatic scrollTo() (nav links,
    // hero CTA) even when wheel smoothing is off.
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    ScrollTrigger.refresh();

    return () => {
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
      }
      gsap.ticker.remove(update);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [isMobile]);

  return (
    <ReactLenis
      ref={lenisRef}
      autoRaf={false}
      root
      options={{ smoothWheel: !isMobile }}
    >
      {children}
    </ReactLenis>
  );
}
