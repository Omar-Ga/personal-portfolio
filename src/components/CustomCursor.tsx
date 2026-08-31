"use client";

import { useEffect, useRef } from 'react';
import styles from './CustomCursor.module.css';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isHoverDevice = window.matchMedia("(hover: hover)").matches;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cursorDot = cursorRef.current;

    if (!isHoverDevice || prefersReducedMotion || !cursorDot) return;

    // Reveal cursor element
    cursorDot.style.visibility = "visible";
    cursorDot.style.opacity = "1";

    // Hide default cursor globally
    document.body.classList.add("hide-default-cursor");

    // Instant zero-inertia tracking
    const onMouseMove = (e: MouseEvent) => {
      cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.body.classList.remove("hide-default-cursor");
    };
  }, []);

  return (
    <div ref={cursorRef} className={`${styles.cursorDot} gsap-cursor-dot`}></div>
  );
}
