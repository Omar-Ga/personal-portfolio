"use client";

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTranslations } from 'next-intl';
import { attachVideoSources } from '@/lib/devicePerf';
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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const t = useTranslations('contact');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'submitting') return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || t('form.error'));
      }

      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : t('form.error'));
    }
  };

  // (attachVideoSources also calls load(), which covers the Safari/iOS quirk.)
  useEffect(() => {
    if (shouldLoadVideo && videoRef.current) attachVideoSources(videoRef.current, 'dark_cropped');
  }, [shouldLoadVideo]);

  // Dismiss overlay on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useGSAP(() => {
    if (!overlayRef.current) return;

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

  // Desktop Video Mouse Parallax (enabled when fine pointer/hover present)
  useGSAP((context, contextSafe) => {
    if (!videoRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(hover: hover)", () => {
      if (!videoRef.current) return;

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
        {/* <source> children are attached on demand by attachVideoSources() */}
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
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder={t('form.name')}
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === 'submitting'}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  placeholder={t('form.email')}
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'submitting'}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <textarea
                  placeholder={t('form.message')}
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={status === 'submitting'}
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? t('form.submitting') : t('form.submit')}
              </button>

              {status === 'success' && (
                <div className={`${styles.statusMessage} ${styles.statusSuccess}`} role="status">
                  {t('form.success')}
                </div>
              )}

              {status === 'error' && (
                <div className={`${styles.statusMessage} ${styles.statusError}`} role="alert">
                  {errorMessage || t('form.error')}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
