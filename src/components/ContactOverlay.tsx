"use client";

import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTranslations } from 'next-intl';
import styles from './ContactOverlay.module.css';

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

interface ContactOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactOverlay({ isOpen, onClose }: ContactOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const t = useTranslations('contact');

  useGSAP(() => {
    if (!overlayRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (isOpen) {
        setShouldLoadVideo(true);
        if (videoRef.current && videoRef.current.readyState >= 2) {
          videoRef.current.play().catch(() => {});
        }

        // Fade in the transparent overlay container
        gsap.to(overlayRef.current, {
          autoAlpha: 1, // handles opacity and visibility
          duration: 0.5,
        });

        // Animate elements inside fading in
        gsap.fromTo(
          [closeBtnRef.current, contentRef.current],
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1.5,
            stagger: 0.2,
            ease: "power3.out",
            delay: 0.8 // Wait for environmental crossfade
          }
        );
      } else {
        if (videoRef.current) {
          videoRef.current.pause();
        }

        // Retract the contact form
        gsap.to([closeBtnRef.current, contentRef.current], {
          opacity: 0,
          y: -20,
          duration: 0.5,
          ease: "power2.in"
        });

        // Hide the overlay container
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.5,
          delay: 0.3
        });
      }
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      if (isOpen) {
        setShouldLoadVideo(true);
        if (videoRef.current && videoRef.current.readyState >= 2) {
          videoRef.current.play().catch(() => {});
        }

        gsap.set([closeBtnRef.current, contentRef.current], { opacity: 1, y: 0 });
        gsap.to(overlayRef.current, {
          autoAlpha: 1,
          duration: 0.15,
          ease: "none"
        });
      } else {
        if (videoRef.current) {
          videoRef.current.pause();
        }
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.15,
          ease: "none"
        });
      }
    });
  }, { scope: overlayRef, dependencies: [isOpen] });

  useGSAP(() => {
    if (isVideoLoaded && videoRef.current) {
      gsap.fromTo(
        videoRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out", force3D: true }
      );
    }
  }, { scope: overlayRef, dependencies: [isVideoLoaded] });

  // Desktop Video Mouse Parallax (only enabled when fine pointer/hover present and reduced motion is off)
  useGSAP((context, contextSafe) => {
    if (!videoRef.current) return;

    const mm = gsap.matchMedia();

    mm.add({
      isHover: "(hover: hover)",
      noReducedMotion: "(prefers-reduced-motion: no-preference)"
    }, (ctx) => {
      const { isHover, noReducedMotion } = ctx.conditions as { isHover: boolean, noReducedMotion: boolean };
      if (!isHover || !noReducedMotion || !videoRef.current) return;

      gsap.set(videoRef.current, { scale: 1.08 });

      const videoXTo = gsap.quickTo(videoRef.current, "x", { duration: 1.2, ease: "power2" });
      const videoYTo = gsap.quickTo(videoRef.current, "y", { duration: 1.2, ease: "power2" });

      const onMouseMove = (e: MouseEvent) => {
        if (!isOpen) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const globalNx = (clientX / innerWidth) * 2 - 1;
        const globalNy = (clientY / innerHeight) * 2 - 1;

        videoXTo(-globalNx * 30);
        videoYTo(-globalNy * 30);
      };

      window.addEventListener("mousemove", onMouseMove, { passive: true });
      return () => window.removeEventListener("mousemove", onMouseMove);
    });

    return () => mm.revert();
  }, { scope: overlayRef, dependencies: [isOpen] });

  return (
    <section 
      className={`${styles.overlayWrapper} ${isOpen ? styles.active : ''}`}
      ref={overlayRef}
    >
      <video
        ref={videoRef}
        className={styles.videoBackground}
        loop
        muted
        playsInline
        style={{ opacity: isVideoLoaded ? 1 : 0 }}
        onLoadedData={() => {
          setIsVideoLoaded(true);
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
      >
        {shouldLoadVideo && (
          <>
            <source src="/dark_cropped_mobile.webm" type="video/webm" media="(max-width: 768px)" />
            <source src="/dark_cropped_mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
            <source src="/dark_cropped.webm" type="video/webm" />
            <source src="/dark_cropped.mp4" type="video/mp4" />
          </>
        )}
      </video>

      <div className={styles.contentContainer}>
        <button 
          className={styles.closeBtn} 
          onClick={onClose}
          ref={closeBtnRef}
          aria-label={t('closeLabel')}
        >
          &#10005;
        </button>

        <div className={styles.mainLayout} ref={contentRef}>
          <div className={styles.leftCol}>
            <h1 className={styles.title}>
              {(t.raw('titleLines') as string[]).map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </h1>
            <p className={styles.subtitle}>{t('subtitle')}</p>
          </div>

          <div className={styles.rightCol}>
            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <div className={styles.inputGroup}>
                <input type="text" placeholder={t('form.name')} className={styles.input} required />
              </div>
              <div className={styles.inputGroup}>
                <input type="email" placeholder={t('form.email')} className={styles.input} required />
              </div>
              <div className={styles.inputGroup}>
                <textarea placeholder={t('form.message')} className={styles.textarea} required></textarea>
              </div>
              <button type="submit" className={styles.submitBtn}>{t('form.submit')}</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
