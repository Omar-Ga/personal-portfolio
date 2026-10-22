"use client";

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { useTranslations } from 'next-intl';
import styles from './BootLoader.module.css';

const INTRO_SEEN_KEY = "og-intro-seen";

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

    // Entrance sequence enabled, except for visitors who asked for reduced motion.
    const skipIntro = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The "Hi. / My name is… / I build…" text intro plays once per visit; reloads
    // and returning within the same session go straight to the hero fade.
    let seenIntro = false;
    try {
      seenIntro = sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {
      // Storage blocked (private mode etc.): just play it.
    }
    const playText = !skipIntro && !seenIntro;
    // Recorded once the text has actually played (or been skipped), so a dev
    // StrictMode double-run or a reload mid-intro doesn't swallow it.
    const markSeen = () => {
      try {
        sessionStorage.setItem(INTRO_SEEN_KEY, "1");
      } catch {
        // ignore
      }
    };

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

      const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
      const durMult = isMobile ? 0.7 : 1.0;

      // The intro runs on its own clamped clock (see the rAF driver below), not
      // GSAP's global ticker: LenisProvider disables lag smoothing on desktop, so
      // a main-thread stall during page load would otherwise fast-forward the
      // timeline straight past the text.
      const entryTl = gsap.timeline({ 
        paused: true,
        onComplete: () => {
          // Fully transparent by now: drop the viewport-sized layer instead of
          // keeping a composited black plane above the page for the whole visit.
          gsap.set(".gsap-dark-overlay", { display: "none" });
          document.body.style.overflow = "";
          onComplete();
        }
      });

      // Act 1: Cinematic text intro. Each line drifts in, holds, and drifts on,
      // following the reading direction (mirrored in RTL).
      const lines = [".gsap-intro-1", ".gsap-intro-2", ".gsap-intro-3"];
      const dir = document.documentElement.dir === "rtl" ? -1 : 1;
      gsap.set(lines, { x: -20 * dir, opacity: 0 });

      if (playText) {
        entryTl.addLabel("intro", 0);
        lines.forEach((sel) => {
          entryTl
            .to(sel, { x: 0, scale: 1.02, opacity: 1, duration: 0.7 * durMult, ease: "power2.out" })
            .to(sel, { x: 20 * dir, scale: 1.05, opacity: 0, duration: 0.5 * durMult, ease: "power2.in" }, `+=${0.25 * durMult}`);
        });
      }

      // Reveal: fade out the overlay and bring in the video/hero
      entryTl.addLabel("reveal", ">")
        .call(markSeen, undefined, "reveal")
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
        return;
      }

      let raf = 0;
      let last = 0;
      const MAX_STEP = 0.05; // seconds; a stalled frame slows the intro instead of skipping it
      const drive = (now: number) => {
        const dt = last ? Math.min((now - last) / 1000, MAX_STEP) : 0;
        last = now;
        entryTl.time(Math.min(entryTl.duration(), entryTl.time() + dt));
        if (entryTl.progress() < 1) raf = requestAnimationFrame(drive);
      };
      raf = requestAnimationFrame(drive);
      const stopDrive = () => cancelAnimationFrame(raf);

      // Any click, tap or key during the text intro jumps straight to the reveal.
      if (playText) {
        const skip = () => {
          if (entryTl.time() < entryTl.labels.reveal) {
            gsap.set(lines, { opacity: 0 });
            entryTl.seek("reveal");
          }
          removeSkip();
        };
        const removeSkip = () => {
          window.removeEventListener("pointerdown", skip);
          window.removeEventListener("keydown", skip);
        };
        window.addEventListener("pointerdown", skip);
        window.addEventListener("keydown", skip);
        return () => {
          removeSkip();
          stopDrive();
        };
      }
      return stopDrive;
  });

  return (
    <div ref={containerRef} suppressHydrationWarning>
      {/* Dark Overlay — Starts solid black for CRT flicker */}
      <div className={`${styles.darkOverlay} gsap-dark-overlay`} suppressHydrationWarning></div>

      {/* Cinematic intro text, shown once per visit */}
      <div className={styles.introTextContainer} aria-hidden="true" suppressHydrationWarning>
        <div className={`${styles.introText} gsap-intro-1`} dir="auto" suppressHydrationWarning>{t('line1')}</div>
        <div className={`${styles.introText} gsap-intro-2`} dir="auto" suppressHydrationWarning>{t('line2')}</div>
        <div className={`${styles.introText} gsap-intro-3`} dir="auto" suppressHydrationWarning>{t('line3')}</div>
      </div>
    </div>
  );
}
