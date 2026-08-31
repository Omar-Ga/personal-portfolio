"use client";

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/react';
import { useTranslations } from 'next-intl';
import styles from './HeroSection.module.css';

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrambleTextPlugin, ScrollTrigger);
}

/** One word of the hero subtitle; `glitch` opts it into the ambient scramble. */
interface SubtitleToken {
  text: string;
  glitch: boolean;
}

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const t = useTranslations('hero');

  const rotatingPhrases = t.raw('rotatingPhrases') as string[];
  const subtitleLines = t.raw('subtitleLines') as SubtitleToken[][];
  const philosophyPhrases = t.raw('philosophy') as string[];
  const ctaLabel = t('cta');

  useGSAP((context, contextSafe) => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // 2. ROTATING TEXT (runs independently, cycles in background)
      const textContainers = gsap.utils.toArray('[class*="rotatingTextContainer"]');

      textContainers.forEach(container => {
        const rotatingItems = gsap.utils.toArray(".gsap-rotating-item", container as Element) as Element[];
        if (rotatingItems.length === 0) return;

        gsap.set(rotatingItems, { yPercent: 100, opacity: 0 });
        gsap.set(rotatingItems[0], { yPercent: 0, opacity: 1 });

        const rotatingTl = gsap.timeline({ repeat: -1 });

        rotatingItems.forEach((item, i) => {
          const nextItem = rotatingItems[(i + 1) % rotatingItems.length];

          rotatingTl
            .to({}, { duration: 2.5 })
            .to(item, {
              yPercent: -100,
              opacity: 0,
              duration: 0.7,
              ease: "power2.inOut"
            }, "transition" + i)
            .set(nextItem, { yPercent: 100, opacity: 0 }, "transition" + i)
            .to(nextItem, {
              yPercent: 0,
              opacity: 1,
              duration: 0.7,
              ease: "power2.inOut"
            }, "transition" + i);
        });
      });

      // 6. CTA BUTTON — Blueprint Fracture Animation
      const ctaBtn = document.querySelector(".gsap-cta") as HTMLElement | null;
      let ctaCleanup: (() => void) | null = null;

      if (ctaBtn) {
        const ctaBg       = ctaBtn.querySelector(".gsap-cta-bg") as HTMLElement;
        const ctaTextBase = ctaBtn.querySelector(".gsap-cta-text-base") as HTMLElement;
        const ctaTextWhite= ctaBtn.querySelector(".gsap-cta-text-white") as HTMLElement;
        const strip1      = ctaBtn.querySelector(".gsap-cta-strip-1") as HTMLElement;
        const strip2      = ctaBtn.querySelector(".gsap-cta-strip-2") as HTMLElement;
        const strip3      = ctaBtn.querySelector(".gsap-cta-strip-3") as HTMLElement;

        gsap.set([strip1, strip2, strip3], { autoAlpha: 0 });

        const ctaTl = gsap.timeline({ paused: true });

        // Act 1 — Fracture
        ctaTl.addLabel("fracture", 0)
          .set([strip1, strip2, strip3], { autoAlpha: 1 }, "fracture")
          .to(strip1, { x: 10, duration: 0.12, ease: "power4.out" }, "fracture")
          .to(strip2, { x: -14, duration: 0.12, ease: "power4.out" }, "fracture")
          .to(strip3, { x: 10, duration: 0.12, ease: "power4.out" }, "fracture")

        // Act 2 — Reassemble + Scramble
          .addLabel("reassemble", "fracture+=0.12")
          .to([strip1, strip2, strip3], { x: 0, duration: 0.08, ease: "power4.in" }, "reassemble")
          .set([strip1, strip2, strip3], { autoAlpha: 0 }, "reassemble+=0.08")
          .to(ctaTextBase, {
            duration: 0.55,
            scrambleText: { text: ctaLabel, chars: "<>/[]{}=%", revealDelay: 0.1, speed: 0.8 },
            ease: "none"
          }, "reassemble")

        // Act 3 — Dark Fill + text swap
          .addLabel("fill", "reassemble+=0.15")
          .to(ctaBg, { scaleX: 1, duration: 0.35, ease: "power3.inOut" }, "fill")
          .to(ctaTextWhite, { autoAlpha: 1, duration: 0.2, ease: "power2.out" }, "fill+=0.15")
          .to(ctaTextBase, { autoAlpha: 0, duration: 0.15, ease: "power2.out" }, "fill");

        const onCtaEnter = () => {
          ctaTl.play();
        };
        const onCtaLeave = () => {
          ctaTl.reverse();
        };

        ctaBtn.addEventListener("pointerenter", onCtaEnter);
        ctaBtn.addEventListener("pointerleave", onCtaLeave);
        ctaBtn.addEventListener("touchend", onCtaLeave);

        ctaCleanup = () => {
          ctaBtn.removeEventListener("pointerenter", onCtaEnter);
          ctaBtn.removeEventListener("pointerleave", onCtaLeave);
          ctaBtn.removeEventListener("touchend", onCtaLeave);
          ctaTl.kill();
        };
      }

      // 6. PHILOSOPHY SCROLL SEQUENCE
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".gsap-scrub-spacer",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
          refreshPriority: 12,
        }
      });

      // Act 1: Fade out hero content (0% - 15%)
      scrollTl.addLabel("act1", 0)
        .fromTo(".gsap-main-elem, .gsap-title-decode, .gsap-rotating-container, .gsap-subtitle, .gsap-cta", 
        { autoAlpha: 1, y: 0 },
        {
          autoAlpha: 0,
          y: -30,
          duration: 0.15,
          stagger: 0.02,
          ease: "power2.inOut",
          immediateRender: false
        }, "act1");

      // Act 2: Video Collapse into Void (15% - 30%)
      scrollTl.addLabel("act2", 0.15)
        .fromTo(".gsap-video-bg", 
        { scale: 1.05, borderRadius: "0%", autoAlpha: 1 },
        {
          scale: 0,
          borderRadius: "50%",
          duration: 0.15,
          ease: "power2.inOut",
          immediateRender: false
        }, "act2")
        .to(".gsap-video-bg", {
          autoAlpha: 0,
          duration: 0.05,
          ease: "power2.in"
        }, "act2+=0.10");

      // Act 3: Typography Bespoke Flythrough (30% - 90%)
      const getPhrase1StartX = () => (window.innerWidth <= 768 ? 100 : 150);
      const getPhrase1EndX = () => (window.innerWidth <= 768 ? -100 : -150);

      gsap.set(".gsap-phrase-1", { xPercent: getPhrase1StartX(), autoAlpha: 0 });
      
      scrollTl.to(".gsap-phrase-1", { autoAlpha: 1, duration: 0.01 }, 0.29);
      
      scrollTl.fromTo(".gsap-phrase-1",
        { xPercent: () => getPhrase1StartX() },
        { xPercent: () => getPhrase1EndX(), duration: 0.15, ease: "none", immediateRender: false },
        0.30
      );

      scrollTl.to(".gsap-phrase-1", { autoAlpha: 0, duration: 0.01 }, 0.45);

      // Phrase 2: Sleek fade up with transform scale
      gsap.set(".gsap-phrase-2", { y: 50, autoAlpha: 0, scale: 0.95 });
      scrollTl.fromTo(".gsap-phrase-2",
        { y: 50, autoAlpha: 0, scale: 0.95 },
        { y: -20, autoAlpha: 1, scale: 1.05, duration: 0.08, ease: "power2.out", immediateRender: false },
        0.43
      ).to(".gsap-phrase-2", {
        y: -50, autoAlpha: 0, scale: 1.1, duration: 0.04, ease: "power2.in"
      }, 0.51);

      // Phrase 3: Slide-in reveal from left
      gsap.set(".gsap-phrase-3", { xPercent: -100, autoAlpha: 0 });
      scrollTl.fromTo(".gsap-phrase-3",
        { xPercent: -100, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: 0.08, ease: "power3.inOut", immediateRender: false },
        0.53
      ).to(".gsap-phrase-3", {
        xPercent: 100, autoAlpha: 0, duration: 0.04, ease: "power2.in"
      }, 0.61);

      // Phrase 4: Scale and opacity fade
      gsap.set(".gsap-phrase-4", { autoAlpha: 0, scale: 1.2 });
      scrollTl.fromTo(".gsap-phrase-4",
        { autoAlpha: 0, scale: 1.2 },
        { autoAlpha: 1, scale: 1, duration: 0.08, ease: "power2.out", immediateRender: false },
        0.63
      ).to(".gsap-phrase-4", {
        autoAlpha: 0, scale: 0.8, duration: 0.04, ease: "power2.in"
      }, 0.71);

      // Phrase 5: Slam into center and hold
      gsap.set(".gsap-phrase-5", { scale: 0.1, autoAlpha: 0 });
      scrollTl.fromTo(".gsap-phrase-5",
        { scale: 0.1, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.05, ease: "power2.out", immediateRender: false },
        0.75
      ).to(".gsap-phrase-5", {
        scale: 1.05, duration: 0.10, ease: "none"
      }, 0.80);

      // 7. AMBIENT SUBTITLE GLITCH
      const glitchWords = gsap.utils.toArray(".gsap-glitch-word") as HTMLElement[];
      let glitchCall: gsap.core.Tween | null = null;

      const triggerGlitch = () => {
        if (glitchWords.length === 0) return;
        const word = glitchWords[Math.floor(Math.random() * glitchWords.length)];
        const original = word.dataset.original || word.textContent || "";

        gsap.to(word, {
          duration: 1.2,
          scrambleText: { text: original, chars: "<>/[]{}=%", speed: 0.3 },
          ease: "none",
          onComplete: scheduleNextGlitch
        });
      };

      const scheduleNextGlitch = () => {
        const delay = gsap.utils.random(2, 4);
        glitchCall = gsap.delayedCall(delay, triggerGlitch);
      };

      scheduleNextGlitch();

      return () => {
        if (ctaCleanup) ctaCleanup();
        if (glitchCall) glitchCall.kill();
      };
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      // In reduced motion, ensure all rotating phrases, title tokens, CTA and philosophy phrases are static and visible
      const textContainers = gsap.utils.toArray('[class*="rotatingTextContainer"]');
      textContainers.forEach(container => {
        const rotatingItems = gsap.utils.toArray(".gsap-rotating-item", container as Element) as Element[];
        if (rotatingItems.length > 0) {
          gsap.set(rotatingItems, { yPercent: 0, opacity: 0 });
          gsap.set(rotatingItems[0], { yPercent: 0, opacity: 1 });
        }
      });

      gsap.set(".gsap-main-elem, .gsap-title-decode, .gsap-rotating-container, .gsap-subtitle, .gsap-cta", {
        autoAlpha: 1,
        y: 0,
        x: 0,
        scale: 1
      });

      gsap.set(".gsap-video-bg", { autoAlpha: 1, scale: 1, borderRadius: "0%" });
      gsap.set(".gsap-phrase-1, .gsap-phrase-2, .gsap-phrase-3, .gsap-phrase-4, .gsap-phrase-5", {
        autoAlpha: 1,
        scale: 1,
        xPercent: 0,
        y: 0
      });
    });
  });

  return (
    <div ref={containerRef} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
      {/* Main Hero Area */}
      <section className={styles.hero} suppressHydrationWarning>
        
        {/* Title with ScrambleText decode + rotating element */}
        <h1 className={`${styles.title} gsap-main-elem`} suppressHydrationWarning>
          <span>
            <div className={`${styles.rotatingTextContainer} gsap-rotating-container`} suppressHydrationWarning>
              {rotatingPhrases.map((phrase, idx) => (
                <div 
                  key={idx} 
                  className={`${styles.rotatingItem} gsap-rotating-item ${idx === 0 ? styles.first : ''}`}
                  dir="auto"
                >
                  {phrase}
                </div>
              ))}
            </div>
          </span>
          <span className="gsap-title-decode gsap-glitch-word" data-original={t('titleLine1')}>{t('titleLine1')}</span>
          <span className="gsap-title-decode gsap-glitch-word" data-original={t('titleLine2')}>{t('titleLine2')}</span>
        </h1>
        
        <div className={`${styles.bottomSection} gsap-main-elem`}>
          {/* Text Content & Button */}
          <div className={styles.textContent}>
            <p className={`${styles.subtitle} gsap-subtitle`}>
              {subtitleLines.map((line, lineIdx) => (
                <span key={lineIdx}>
                  {line.map((token, tokenIdx) => (
                    <span key={tokenIdx}>
                      {token.glitch ? (
                        <span className="gsap-glitch-word" data-original={token.text}>{token.text}</span>
                      ) : (
                        token.text
                      )}
                      {tokenIdx < line.length - 1 ? ' ' : null}
                    </span>
                  ))}
                  {lineIdx < subtitleLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
            
            <button 
              className={`${styles.cta} gsap-cta`}
              onClick={() => {
                const targetEl = document.querySelector("#projects") as HTMLElement;
                if (targetEl) {
                  if (lenis) {
                    lenis.scrollTo(targetEl, { duration: 1.5 });
                  } else {
                    targetEl.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }}
            >
              <span className={styles.ctaSpacer}>{ctaLabel}</span>
              <span className={`${styles.ctaBg} gsap-cta-bg`}></span>
              <span className={`${styles.ctaTextLayer} gsap-cta-text-base`}>{ctaLabel}</span>
              <span className={`${styles.ctaTextLayer} ${styles.ctaTextWhite} gsap-cta-text-white`}>{ctaLabel}</span>
              <span className={`${styles.ctaStrip} ${styles.ctaStrip1} gsap-cta-strip-1`}>{ctaLabel}</span>
              <span className={`${styles.ctaStrip} ${styles.ctaStrip2} gsap-cta-strip-2`}>{ctaLabel}</span>
              <span className={`${styles.ctaStrip} ${styles.ctaStrip3} gsap-cta-strip-3`}>{ctaLabel}</span>
            </button>
          </div>
        </div>
          
      </section>
      
      {/* Philosophy Sequence container */}
      <div className={styles.philosophyContainer}>
        {philosophyPhrases.map((phrase, idx) => (
          <div
            key={idx}
            className={`${styles.philosophyPhrase} ${styles[`phrase${idx + 1}`]} gsap-phrase-${idx + 1}`}
            dir="auto"
          >
            {phrase}
          </div>
        ))}
      </div>
    </div>
  );
}
