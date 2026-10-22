"use client";

import { Fragment, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/react';
import { useLocale, useTranslations } from 'next-intl';
import { getPerfTier, prefersReducedMotion } from '@/lib/devicePerf';
import { createStatementPainter, wordOpacity } from '@/lib/statementPainter';
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
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const lenis = useLenis();
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const t = useTranslations('hero');

  const rotatingPhrases = t.raw('rotatingPhrases') as string[];
  const subtitleLines = t.raw('subtitleLines') as SubtitleToken[][];
  const statementWords = t('statement').split(/\s+/).filter(Boolean);
  const ctaLabel = t('cta');

  useGSAP((context, contextSafe) => {
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

    // 6. STATEMENT SCROLL SEQUENCE
    // The hero copy fades, a light paper layer rises over the hero video and the
    // sentence is revealed word by word (faint -> solid) with the video showing
    // through the letters, ending on the same #f5f5f5 as the Services section.
    const layer = layerRef.current;
    const canvas = canvasRef.current;
    const textEl = textRef.current;
    const words = Array.from(textEl?.querySelectorAll<HTMLElement>('[data-word]') ?? []);
    const reduceMotion = prefersReducedMotion();
    // Video-in-letters costs a full-viewport canvas repaint per scroll frame, so
    // low-tier devices (and reduced motion) get solid ink words instead.
    const painter =
      layer && canvas && textEl && !reduceMotion && getPerfTier() !== 'low'
        ? createStatementPainter({ canvas, text: textEl, words, rtl: isRTL })
        : null;
    if (layer) layer.dataset.mode = painter ? 'canvas' : 'dom';

    const heroEls = ".gsap-main-elem, .gsap-title-decode, .gsap-rotating-container, .gsap-subtitle, .gsap-cta";
    let onRefresh: (() => void) | null = null;
    let statementTl: gsap.core.Timeline | null = null;

    // The footage is pale pastel; once the paper covers most of it, give it more
    // saturation/depth (a static filter, flipped here) so the colour survives inside the letters.
    let boostTrigger: ScrollTrigger | null = null;
    const videoEl = document.querySelector<HTMLElement>(".gsap-video-bg");
    if (painter && videoEl) {
      boostTrigger = ScrollTrigger.create({
        trigger: ".gsap-scrub-spacer",
        start: "top+=18% top",
        end: "max",
        onToggle: (self) => { videoEl.dataset.statement = self.isActive ? "true" : "false"; },
      });
    }

    if (painter) {
      onRefresh = () => painter.measure();
      ScrollTrigger.addEventListener('refresh', onRefresh);
      if ('fonts' in document) document.fonts.ready.then(() => painter.measure());
      painter.measure();
    }

    if (reduceMotion) {
      // No scrub: one short cross-fade once the visitor starts scrolling.
      words.forEach((w) => { w.style.opacity = '1'; });
      statementTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".gsap-scrub-spacer",
          start: "top+=6% top",
          toggleActions: "play none none reverse",
        },
      });
      statementTl
        .to(heroEls, { autoAlpha: 0, duration: 0.25, ease: "none" }, 0)
        .to(layer, { autoAlpha: 1, duration: 0.35, ease: "none" }, 0);
    } else {
      const reveal = { r: 0 };
      const paintReveal = () => {
        if (painter) painter.draw(reveal.r);
        else words.forEach((w, i) => { w.style.opacity = String(wordOpacity(i, words.length, reveal.r)); });
      };
      paintReveal();

      statementTl = gsap.timeline({
        scrollTrigger: {
          trigger: ".gsap-scrub-spacer",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      // Hero copy out (0% - 15%)
      statementTl
        .fromTo(heroEls,
          { autoAlpha: 1, y: 0, scale: 1 },
          {
            autoAlpha: 0,
            y: -25,
            scale: 0.96,
            transformOrigin: "center center",
            duration: 0.15,
            stagger: 0.015,
            ease: "power2.inOut",
            immediateRender: false,
          }, 0)
        // Paper over the video (6% - 26%)
        .fromTo(layer,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.2, ease: "power1.inOut", immediateRender: false }, 0.06)
        // Word-by-word reveal (24% - 84%), then a short hold before Services arrives
        .to(reveal, { r: 1, duration: 0.6, ease: "none", onUpdate: paintReveal }, 0.24)
        .set({}, {}, 1);
    }

    // 7. AMBIENT SUBTITLE GLITCH
    const glitchWords = gsap.utils.toArray(".gsap-glitch-word") as HTMLElement[];
    let glitchCall: gsap.core.Tween | null = null;

    const triggerGlitch = () => {
      // The glitch is ambient decoration: skip it when nobody can see the hero
      // (scrolled into the philosophy sequence / other sections, or tab hidden).
      if (glitchWords.length === 0 || document.hidden || window.scrollY > window.innerHeight * 0.6) {
        scheduleNextGlitch();
        return;
      }
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

    if (!reduceMotion) scheduleNextGlitch();

    return () => {
      if (ctaCleanup) ctaCleanup();
      if (glitchCall) glitchCall.kill();
      if (onRefresh) ScrollTrigger.removeEventListener('refresh', onRefresh);
      if (boostTrigger) boostTrigger.kill();
      if (videoEl) delete videoEl.dataset.statement;
    };
  }, { dependencies: [isRTL] });

  return (
    <div ref={containerRef} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
      {/* Main Hero Area */}
      <section className={styles.hero} suppressHydrationWarning>
        <div className={styles.heroContent}>
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
        </div>
          
      </section>
      
      {/* Statement: light paper + one sentence, revealed word by word on scroll */}
      <div ref={layerRef} className={`${styles.statementLayer} gsap-statement`} data-mode="dom" dir={isRTL ? 'rtl' : 'ltr'}>
        <canvas ref={canvasRef} className={styles.statementCanvas} aria-hidden="true" />
        <p ref={textRef} className={styles.statementText}>
          {statementWords.map((word, idx) => (
            <Fragment key={idx}>
              <span data-word className={styles.statementWord}>{word}</span>{' '}
            </Fragment>
          ))}
        </p>
      </div>
    </div>
  );
}
