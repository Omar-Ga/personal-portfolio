"use client";

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useTranslations } from 'next-intl';
import styles from './BootLoader.module.css';

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrambleTextPlugin);
}

interface BootLoaderProps {
  onComplete: () => void;
}

export default function BootLoader({ onComplete }: BootLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('boot');

  useGSAP(() => {
    // Performance optimizations
    gsap.config({ force3D: true });

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(".gsap-dark-overlay", { opacity: 0, display: "none" });
      gsap.set(".gsap-video-bg", { autoAlpha: 1, scale: 1 });
      gsap.set(".gsap-main-hero", { opacity: 1 });
      gsap.set(".gsap-main-elem", { autoAlpha: 1, y: 0 });
      gsap.set(".gsap-title-decode", { autoAlpha: 1 });
      gsap.set(".gsap-rotating-container", { autoAlpha: 1 });
      gsap.set(".gsap-cta", { autoAlpha: 1, y: 0 });
      gsap.set(".gsap-subtitle", { autoAlpha: 1, y: 0 });
      document.body.style.overflow = "";
      onComplete();
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const skipIntro = false; // Entrance sequence enabled

      // Lock scroll and reset position during boot phase
      if (!skipIntro) {
        if (typeof window !== "undefined") {
          if ("scrollRestoration" in window.history) {
            window.history.scrollRestoration = "manual";
          }
          window.scrollTo(0, 0);
        }
        document.body.style.overflow = "hidden";
      }

      // 1. CINEMATIC BOOT-UP ENTRY SEQUENCE
      // Initial states: everything hidden
      gsap.set(".gsap-video-bg", { autoAlpha: 0, scale: 1.08 });
      gsap.set(".gsap-main-hero", { opacity: 0 });
      gsap.set(".gsap-main-elem", { autoAlpha: 0, y: 30 });
      gsap.set(".gsap-title-decode", { autoAlpha: 0 });
      gsap.set(".gsap-rotating-container", { autoAlpha: 0 });
      gsap.set(".gsap-cta", { autoAlpha: 0, y: 40 });
      gsap.set(".gsap-subtitle", { autoAlpha: 0, y: 20 });
      gsap.set(".gsap-intro-1, .gsap-intro-2, .gsap-intro-3", { x: -20, opacity: 0 });

      const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
      const durMult = isMobile ? 0.7 : 1.0;

      const entryTl = gsap.timeline({ 
        delay: skipIntro ? 0 : 0.1,
        onComplete: () => {
          document.body.style.overflow = "";
          onComplete();
        }
      });

      // Directly fade out overlay and reveal video/hero immediately
      entryTl.addLabel("reveal", 0)
        .to(".gsap-dark-overlay", { opacity: 0, duration: 1.0 * durMult }, "reveal")
        .to(".gsap-video-bg", { autoAlpha: 1, duration: 1.0 * durMult }, "reveal")
        .to(".gsap-main-hero", { opacity: 1, duration: 1.0 * durMult }, "reveal");

      // Act 2: Title Decode — ScrambleText reveals each title line
      entryTl.addLabel("decode", `reveal+=${0.3 * durMult}`)
        .to(".gsap-title-decode", { autoAlpha: 1, duration: 0.01 }, "decode");

      const titleLines = gsap.utils.toArray(".gsap-title-decode") as HTMLElement[];
      titleLines.forEach((line, i) => {
        const originalText = line.textContent || "";
        entryTl.to(line, {
          duration: 2.0 * durMult,
          scrambleText: {
            text: originalText,
            chars: "!@#$%^&*<>[]{}=/\\|~`",
            revealDelay: 0.5 * durMult,
            speed: 0.4 / durMult
          },
          ease: "none"
        }, `decode+=${i * (0.3 * durMult)}`);
      });

      // Show rotating text container alongside decode
      entryTl.to(".gsap-rotating-container", { autoAlpha: 1, duration: 0.4 }, "decode+=0.2");

      // Act 3: Elements slide into place
      entryTl.addLabel("elements", "decode+=0.8")
        .to(".gsap-main-elem", {
          autoAlpha: 1, y: 0,
          stagger: 0.12,
          duration: 0.8,
          ease: "power3.out"
        }, "elements")
        .to(".gsap-subtitle", {
          autoAlpha: 1, y: 0,
          duration: 0.7,
          ease: "power3.out"
        }, "elements+=0.2");

      // Act 4: CTA button slams in with overshoot
      entryTl.addLabel("cta", "elements+=0.4")
        .to(".gsap-cta", {
          autoAlpha: 1, y: 0,
          duration: 0.6,
          ease: "back.out(1.7)"
        }, "cta");

      if (skipIntro) {
        entryTl.progress(1);
      }
    });
  });

  return (
    <div ref={containerRef} suppressHydrationWarning>
      {/* Dark Overlay — Starts solid black for CRT flicker */}
      <div className={`${styles.darkOverlay} gsap-dark-overlay`} suppressHydrationWarning></div>

      {/* Cinematic Intro Texts (legacy structure, kept for potential reuse) */}
      <div className={styles.introTextContainer} suppressHydrationWarning>
        <div className={`${styles.introText} gsap-intro-1`} dir="auto" suppressHydrationWarning>{t('line1')}</div>
        <div className={`${styles.introText} gsap-intro-2`} dir="auto" suppressHydrationWarning>{t('line2')}</div>
        <div className={`${styles.introText} gsap-intro-3`} dir="auto" suppressHydrationWarning>{t('line3')}</div>
      </div>
    </div>
  );
}
