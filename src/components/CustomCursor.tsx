"use client";

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './CustomCursor.module.css';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isHoverDevice = window.matchMedia("(hover: hover)").matches;
    const cursorDot = cursorRef.current;

    if (!isHoverDevice || !cursorDot) return;

    // Reveal cursor element
    cursorDot.style.visibility = "visible";
    cursorDot.style.opacity = "1";

    // Hide default cursor globally
    document.body.classList.add("hide-default-cursor");

    // Use GSAP quickSetter for performant transform updates
    const xSet = gsap.quickSetter(cursorDot, "x", "px");
    const ySet = gsap.quickSetter(cursorDot, "y", "px");

    const onMouseMove = (e: MouseEvent) => {
      xSet(e.clientX);
      ySet(e.clientY);
    };

    // Hide cursor when pointer leaves the window
    const onMouseLeave = () => {
      gsap.to(cursorDot, { autoAlpha: 0, duration: 0.15 });
    };

    const onMouseEnter = () => {
      gsap.to(cursorDot, { autoAlpha: 1, duration: 0.15 });
    };

    // Scale cursor on interactive element hover
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"], [tabindex="0"]')) {
        gsap.to(cursorDot, { scale: 3, duration: 0.25, ease: "power2.out" });
      }
    };

    const onPointerOut = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"], [tabindex="0"]')) {
        gsap.to(cursorDot, { scale: 1, duration: 0.25, ease: "power2.out" });
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.body.classList.remove("hide-default-cursor");
    };
  }, []);

  return (
    <div ref={cursorRef} className={`${styles.cursorDot} gsap-cursor-dot`}></div>
  );
}
