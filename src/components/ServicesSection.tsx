"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { useTranslations } from "next-intl";
import { isSmallVideoVariant, prefersReducedMotion, prefersSavedData } from "@/lib/devicePerf";
import styles from "./ServicesSection.module.css";

// Register plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, Flip);
}

/**
 * Non-translatable service data. Copy lives in `messages/<locale>/services.json`
 * under `pillars.<id>`; only the asset paths stay in code.
 */
const SERVICE_IDS = ["s1", "s2", "s3"] as const;
type ServiceId = (typeof SERVICE_IDS)[number];

const SERVICE_IMAGES: Record<ServiceId, string[]> = {
  s1: [
    "/images/o2mation/o2mation_2.webp",
    "/images/o2mation/o2mation_1.webp",
    "/images/o2mation/o2mation_3.webp",
    "/images/o2mation/o2mation_4.webp",
    "/images/o2mation/o2mation_5.webp"
  ],
  s2: [
    "/images/services/systems/systems_1.webp",
    "/images/services/systems/systems_2.webp",
    "/images/services/systems/systems_3.webp",
    "/images/services/systems/systems_4.webp",
    "/images/services/systems/systems_5.webp"
  ],
  s3: [
    "/images/services/ai/ai_1.webp",
    "/images/services/ai/ai_2.webp",
    "/images/services/ai/ai_3.webp",
    "/images/services/ai/ai_4.webp",
    "/images/services/ai/ai_5.webp"
  ]
};

/**
 * Looping motion clips (rendered with Remotion) layered over the poster image of
 * the same slide. Only the expanded slide ever loads or plays its clip.
 */
const SERVICE_VIDEOS: Partial<Record<ServiceId, string[]>> = {
  s2: [1, 2, 3, 4, 5].map((n) => `/videos/services/systems_${n}`),
  s3: [1, 2, 3, 4, 5].map((n) => `/videos/services/ai_${n}`)
};

/**
 * Plays `base`.mp4 (or the `_mobile` encode on phones / low-tier devices) over
 * the poster while it is on screen, fading in once frames are actually playing.
 * Skipped for reduced motion and Data Saver, where the poster alone is shown.
 */
function SlideVideo({ base }: { base: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    // Without a src the element stays invisible, leaving the poster alone.
    if (!video || prefersReducedMotion() || prefersSavedData()) return;
    video.src = `${base}${isSmallVideoVariant() ? "_mobile" : ""}.mp4`;

    // The services track is a horizontally pinned strip, so a panel's active
    // slide can be far off screen: only decode while it is actually visible.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) video.play().catch(() => {});
      else video.pause();
    });
    io.observe(video);
    const onVisibility = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [base]);

  return (
    <video
      ref={videoRef}
      className={styles.slideVideo}
      style={{ opacity: playing ? 1 : 0 }}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      onPlaying={() => setPlaying(true)}
    />
  );
}

/** A single feature slide within a service pillar. */
interface ServiceItem {
  title: string;
  role: string;
  description: string;
}

const ServicePanel = React.memo(({ serviceId }: { serviceId: ServiceId }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);
  const t = useTranslations(`services.pillars.${serviceId}`);
  const tSection = useTranslations("services");

  const items = t.raw("items") as ServiceItem[];

  const handleSwap = (idx: number) => {
    if (idx === activeIndex) return;
    
    // 1. Record the state of all images in this specific service
    flipStateRef.current = Flip.getState(`.img-target-${serviceId}`);
    
    // Trigger re-render which will swap the CSS classes
    setActiveIndex(idx);
  };

  useGSAP(() => {
    // 1. Image FLIP animation
    if (flipStateRef.current) {
      Flip.from(flipStateRef.current, {
        duration: 0.7,
        ease: "power3.inOut",
        absolute: true,
        nested: true
      });
      flipStateRef.current = null;
    }

    // 2. GSAP Text Transition Animation
    if (textRef.current) {
      gsap.fromTo(
        textRef.current.children,
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: "power3.out"
        }
      );
    }
  }, { scope: containerRef, dependencies: [activeIndex] });

  const getPosClass = (idx: number) => {
    if (idx === activeIndex) return styles.posMain;
    let rel = idx;
    if (idx > activeIndex) rel -= 1;
    return styles[`pos${rel}` as keyof typeof styles];
  };

  const displayImages = SERVICE_IMAGES[serviceId]?.length
    ? SERVICE_IMAGES[serviceId]
    : ["", "", "", "", ""];

  const currentText = items?.[activeIndex] ?? {
    title: t("title"),
    role: t("role"),
    description: t("description")
  };

  return (
    <div className={styles.projectPanel} ref={containerRef}>
      <div className={styles.imageLayout}>
        {displayImages.map((url, i) => (
          <div 
            key={i}
            className={`${styles.imageSlot} ${SERVICE_VIDEOS[serviceId] ? styles.motionSlot : ""} img-target-${serviceId} ${getPosClass(i)}`}
            onClick={() => handleSwap(i)}
            data-cursor="hover"
            data-flip-id={`img-${serviceId}-${i}`}
          >
            {url ? (
              <picture style={{ width: '100%', height: '100%', display: 'block' }}>
                <source media="(max-width: 768px)" srcSet={url.replace(/\.webp$/, "_mobile.webp")} />
                <img 
                  src={url}
                  className={styles.projectImage}
                  alt={tSection("imageAlt", { index: i })}
                  decoding="async"
                  loading="lazy"
                  fetchPriority="low"
                />
              </picture>
            ) : (
              <div className={styles.placeholderCard}>
                <span className={styles.placeholderLabel}>
                  {tSection("placeholderFrame", { number: i + 1 })}
                </span>
              </div>
            )}
            {i === activeIndex && SERVICE_VIDEOS[serviceId]?.[i] ? (
              <SlideVideo base={SERVICE_VIDEOS[serviceId]![i]} />
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles.textSection} ref={textRef}>
         <h2 className={styles.projectTitle}>{currentText.title}</h2>
         <p className={styles.projectRole}>{currentText.role}</p>
         <p className={styles.projectDescription}>{currentText.description}</p>
      </div>
    </div>
  );
});


ServicePanel.displayName = "ServicePanel";

export default function ServicesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const leftHalfRef = useRef<HTMLDivElement>(null);
  const rightHalfRef = useRef<HTMLDivElement>(null);
  const leftVideoRef = useRef<HTMLVideoElement>(null);
  const rightVideoRef = useRef<HTMLVideoElement>(null);
  /** Scrubs both door clips to `p` (0..1); a no-op until they are loaded. */
  const seekDoorsRef = useRef<(p: number) => void>(() => {});
  const t = useTranslations('services.teaser');

  // The finale doors carry one SkyCourt screen split down the middle: the
  // blueprint (systems) half and the finished-product (craft) half, rendered
  // with Remotion (motion/src/MindSplit.tsx). Their playback is scrubbed by the
  // door scroll timeline. Clips load once the services section is near; under
  // reduced motion or Data Saver the final-frame posters are shown instead.
  useEffect(() => {
    const section = sectionRef.current;
    const videos = [leftVideoRef.current, rightVideoRef.current].filter(Boolean) as HTMLVideoElement[];
    if (!section || videos.length < 2 || prefersReducedMotion() || prefersSavedData()) return;

    let lastP = -1;
    const seek = (p: number) => {
      lastP = p;
      for (const v of videos) {
        if (v.readyState < 1 || !v.duration) continue;
        const target = p * (v.duration - 0.05);
        if (Math.abs(v.currentTime - target) > 0.015) v.currentTime = target;
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const suffix = isSmallVideoVariant() ? "_mobile" : "";
      videos.forEach((v, i) => {
        v.preload = "auto";
        v.src = `/videos/mind/${i === 0 ? "systems" : "craft"}${suffix}.mp4`;
        v.addEventListener("loadeddata", () => {
          if (lastP >= 0) seek(lastP);
          v.classList.add(styles.doorVideoReady);
        }, { once: true });
      });
      seekDoorsRef.current = seek;
    }, { rootMargin: "100% 0px" });
    io.observe(section);

    return () => {
      io.disconnect();
      seekDoorsRef.current = () => {};
    };
  }, []);

  useGSAP(() => {
    const track = trackRef.current;
    if (!track || !leftHalfRef.current || !rightHalfRef.current) return;

    const mm = gsap.matchMedia();

    // Desktop: Horizontal Pinning & Track Scroll
    mm.add("(min-width: 769px)", () => {
      const getInitialHoldDist = () => window.innerHeight * 0.20;
      const getHorizontalDist = () => track.scrollWidth - window.innerWidth;
      const getVerticalDist = () => window.innerHeight * 1.5;
      const getHoldDist = () => window.innerHeight * 0.4;

      gsap.set(leftHalfRef.current, { xPercent: -100, yPercent: 0 });
      gsap.set(rightHalfRef.current, { xPercent: 100, yPercent: 0 });
      
      const tl = gsap.timeline({
        scrollTrigger: {
          id: "showcase-st",
          trigger: sectionRef.current,
          pin: true,
          anticipatePin: 1,
          scrub: 1.5,
          invalidateOnRefresh: true,
          end: () => "+=" + (getInitialHoldDist() + getHorizontalDist() + getVerticalDist() + getHoldDist())
        }
      });

      tl.to({}, { duration: () => getInitialHoldDist() });

      tl.to(track, {
        x: () => -getHorizontalDist(),
        ease: "none",
        duration: () => getHorizontalDist()
      });

      tl.addLabel("aboutPanel");

      tl.to(leftHalfRef.current, { 
        xPercent: 0, 
        ease: "none", 
        duration: () => getVerticalDist() 
      }, "aboutPanel")
      .to(rightHalfRef.current, { 
        xPercent: 0, 
        ease: "none", 
        duration: () => getVerticalDist() 
      }, "aboutPanel");

      const doorBuild = { p: 0 };
      tl.to(doorBuild, {
        p: 1,
        ease: "none",
        duration: () => getVerticalDist(),
        onUpdate: () => seekDoorsRef.current(doorBuild.p)
      }, "aboutPanel");

      tl.to({}, { duration: () => getHoldDist() });
    });

    // Mobile: Vertical Scroll with Pinned Window Reveal on About Teaser (Top & Bottom Doors)
    mm.add("(max-width: 768px)", () => {
      gsap.set(leftHalfRef.current, { xPercent: 0, yPercent: -100, force3D: true });
      gsap.set(rightHalfRef.current, { xPercent: 0, yPercent: 100, force3D: true });

      const teaserEl = sectionRef.current?.querySelector(`.${styles.aboutTeaserPanel}`);
      if (teaserEl) {
        const mobileTl = gsap.timeline({
          scrollTrigger: {
            id: "showcase-st",
            trigger: teaserEl,
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            start: "top top",
            end: "+=150%",
            scrub: 1,
            invalidateOnRefresh: true
          }
        });

        mobileTl.addLabel("aboutPanel");

        const mobileBuild = { p: 0 };

        mobileTl.to(leftHalfRef.current, { yPercent: 0, ease: "none", duration: 1 }, "aboutPanel")
                .to(rightHalfRef.current, { yPercent: 0, ease: "none", duration: 1 }, "aboutPanel")
                .to(mobileBuild, { p: 1, ease: "none", duration: 1, onUpdate: () => seekDoorsRef.current(mobileBuild.p) }, "aboutPanel")
                .to({}, { duration: 0.4 });
      }
    });

    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <section className={styles.showcaseWrapper} ref={sectionRef} id="services">
      <div className={styles.horizontalTrack} ref={trackRef}>
        {SERVICE_IDS.map(id => (
          <ServicePanel key={id} serviceId={id} />
        ))}
        {/* The Horizontal Finale */}
        <div className={styles.aboutTeaserPanel}>
          <h2 className={styles.teaserTitle}>
            {(t.raw('titleLines') as string[]).map((line, i, arr) => (
              <React.Fragment key={i}>
                {line}
                {i < arr.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </h2>
          <p className={styles.teaserSubtitle}>{t('subtitle')}</p>
          
          {/* The Window Split Animation (Overlay) */}
          <div className={styles.windowContainer}>
            {/* Left Pillar */}
            <div className={`${styles.windowHalf} ${styles.leftHalf}`} ref={leftHalfRef}>
              <picture style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                <source media="(max-width: 768px)" srcSet="/images/split/mind_systems_mobile.webp" />
                <img 
                  src="/images/split/mind_systems.webp" 
                  alt={t('left.imageAlt')} 
                  className={`${styles.founderImage} ${styles.doorLeft}`}
                />
              </picture>
              <video ref={leftVideoRef} className={`${styles.doorVideo} ${styles.doorLeft}`} muted playsInline preload="none" aria-hidden="true" />
              <div className={styles.overlay}></div>
              <div className={styles.founderInfo}>
                <p className={styles.founderRole}>{t('left.role')}</p>
                <h3 className={styles.founderName} style={{ fontSize: "clamp(2rem, 3.5vw, 4rem)" }}>
                  {(t.raw('left.nameLines') as string[]).map((line, i, arr) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < arr.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </h3>
              </div>
            </div>

            {/* Right Pillar */}
            <div className={`${styles.windowHalf} ${styles.rightHalf}`} ref={rightHalfRef}>
              <picture style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                <source media="(max-width: 768px)" srcSet="/images/split/mind_craft_mobile.webp" />
                <img 
                  src="/images/split/mind_craft.webp" 
                  alt={t('right.imageAlt')} 
                  className={`${styles.founderImage} ${styles.doorRight}`}
                />
              </picture>
              <video ref={rightVideoRef} className={`${styles.doorVideo} ${styles.doorRight}`} muted playsInline preload="none" aria-hidden="true" />
              <div className={styles.overlay}></div>
              <div className={styles.founderInfo}>
                <p className={styles.founderRole}>{t('right.role')}</p>
                <h3 className={styles.founderName} style={{ fontSize: "clamp(2rem, 3.5vw, 4rem)" }}>
                  {(t.raw('right.nameLines') as string[]).map((line, i, arr) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < arr.length - 1 ? <br /> : null}
                    </React.Fragment>
                  ))}
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
