"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useLenis } from 'lenis/react';
import { useTranslations } from 'next-intl';
import ShimmeringBeamsBackground from './ui/ShimmeringBeamsBackground';
import { ARCHIVE_ENTRIES, ARCHIVE_COUNT, ArchiveProjectEntry } from '@/data/archiveProjects';
import styles from './AllProjectsOverlay.module.css';

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

/** Translated copy for an archive entry — see `messages/<locale>/archive.json`. */
interface ProjectCopy {
  title: string;
  category: string;
  description: string;
  keywords: string[];
  features: string[];
}

export interface DetailedProject extends ArchiveProjectEntry, ProjectCopy {
  liveUrl?: string;
  repoUrl?: string;
}

interface AllProjectsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

/** 9 Unique cards per column (18 total projects across 2 tracks). */
const UNIQUE_PER_COL = 9;
/** Duplications per track to ensure seamless infinite looping past 4K displays. */
const TRACK_REPEATS = 3;
/** Idle drift in px per frame at 60fps. */
const BASE_SPEED = 2.4;
/** Ceiling on wheel-injected velocity (px/frame). */
const MAX_VELOCITY = 80;

export default function AllProjectsOverlay({ isOpen, onClose }: AllProjectsOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewportLeftRef = useRef<HTMLDivElement>(null);
  const viewportRightRef = useRef<HTMLDivElement>(null);
  const colLeftRef = useRef<HTMLDivElement>(null);
  const colRightRef = useRef<HTMLDivElement>(null);
  const heroCardRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const t = useTranslations('archive');

  // Merge the static asset/id data with the active locale's copy.
  const allProjects: DetailedProject[] = ARCHIVE_ENTRIES.map((entry) => ({
    ...entry,
    ...(t.raw(`items.${entry.id}`) as ProjectCopy),
    liveUrl: '#',
    repoUrl: '#'
  }));

  const [selectedProject, setSelectedProject] = useState<DetailedProject | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Infinite drift engine state.
  const leftPosRef = useRef(0);
  const rightPosRef = useRef(0);
  const leftVelRef = useRef(0);
  const rightVelRef = useRef(0);
  const periodRef = useRef(0);
  const pausedRef = useRef(false);
  const hoverTargetRef = useRef(1);
  const hoverFactorRef = useRef(1);

  // Split 18 projects into 2 columns of 9, duplicated TRACK_REPEATS times
  const leftColumnProjects = Array.from({ length: TRACK_REPEATS }, () =>
    allProjects.slice(0, UNIQUE_PER_COL)
  ).flat();
  const rightColumnProjects = Array.from({ length: TRACK_REPEATS }, () =>
    allProjects.slice(UNIQUE_PER_COL, UNIQUE_PER_COL * 2)
  ).flat();

  // Lock Lenis scroll when overlay is open
  useEffect(() => {
    if (lenis) {
      if (isOpen) lenis.stop();
      else lenis.start();
    }
  }, [isOpen, lenis]);

  // Main entrance / exit fade
  useGSAP(() => {
    if (!overlayRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (isOpen) {
        if (viewportLeftRef.current && viewportRightRef.current) {
          gsap.set([viewportLeftRef.current, viewportRightRef.current], {
            xPercent: 0,
            opacity: 1
          });
        }

        gsap.to(overlayRef.current, {
          autoAlpha: 1,
          duration: 0.6,
          ease: "power2.out"
        });
      } else {
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            setSelectedProject(null);
            setActiveImageIndex(0);
          }
        });
      }
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      if (isOpen) {
        if (viewportLeftRef.current && viewportRightRef.current) {
          gsap.set([viewportLeftRef.current, viewportRightRef.current], {
            xPercent: 0,
            opacity: 1
          });
        }

        gsap.to(overlayRef.current, {
          autoAlpha: 1,
          duration: 0.15,
          ease: "none"
        });
      } else {
        gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.15,
          ease: "none",
          onComplete: () => {
            setSelectedProject(null);
            setActiveImageIndex(0);
          }
        });
      }
    });
  }, { scope: overlayRef, dependencies: [isOpen] });

  // Ticker-driven seamless infinite drift
  useEffect(() => {
    if (!isOpen) return;

    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      if (colLeftRef.current) colLeftRef.current.style.transform = "none";
      if (colRightRef.current) colRightRef.current.style.transform = "none";
      return;
    }

    const measurePeriod = (): boolean => {
      const track = colLeftRef.current;
      if (!track || track.children.length <= UNIQUE_PER_COL) return false;
      const first = track.children[0] as HTMLElement;
      const wrapAt = track.children[UNIQUE_PER_COL] as HTMLElement;
      if (!first || !wrapAt) return false;
      const measured = wrapAt.offsetTop - first.offsetTop;
      if (measured > 0) {
        periodRef.current = measured;
        return true;
      }
      return false;
    };

    const render = () => {
      const period = periodRef.current || 4700;
      if (colLeftRef.current) {
        colLeftRef.current.style.transform = `translate3d(0, ${-leftPosRef.current}px, 0)`;
      }
      if (colRightRef.current) {
        colRightRef.current.style.transform = `translate3d(0, ${rightPosRef.current - period}px, 0)`;
      }
    };

    // Initialize drift state
    const hasMeasured = measurePeriod();
    if (!hasMeasured) {
      periodRef.current = 4700;
    }

    leftPosRef.current = 0;
    rightPosRef.current = periodRef.current * 0.35;
    leftVelRef.current = 0;
    rightVelRef.current = 0;
    pausedRef.current = false;
    hoverTargetRef.current = 1;
    hoverFactorRef.current = 1;
    render();

    const tick = (_time: number, deltaTime: number) => {
      measurePeriod();

      const period = periodRef.current || 4700;
      const dt = Math.min(deltaTime / 16.667, 3);

      hoverFactorRef.current +=
        (hoverTargetRef.current - hoverFactorRef.current) * Math.min(1, 0.12 * dt);

      if (!pausedRef.current) {
        const damp = hoverFactorRef.current;
        leftPosRef.current += (BASE_SPEED + leftVelRef.current) * dt * damp;
        rightPosRef.current += (BASE_SPEED + rightVelRef.current) * dt * damp;

        leftPosRef.current = ((leftPosRef.current % period) + period) % period;
        rightPosRef.current = ((rightPosRef.current % period) + period) % period;

        render();
      }

      const decay = Math.pow(0.93, dt);
      leftVelRef.current *= decay;
      rightVelRef.current *= decay;
      if (Math.abs(leftVelRef.current) < 0.02) leftVelRef.current = 0;
      if (Math.abs(rightVelRef.current) < 0.02) rightVelRef.current = 0;
    };

    gsap.ticker.add(tick);

    const handleResize = () => {
      measurePeriod();
      render();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Scroll wheel momentum injection
  useEffect(() => {
    if (!isOpen || selectedProject) return;

    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const impulse = e.deltaY * 0.12;
      leftVelRef.current = gsap.utils.clamp(-MAX_VELOCITY, MAX_VELOCITY, leftVelRef.current + impulse);
      rightVelRef.current = gsap.utils.clamp(-MAX_VELOCITY, MAX_VELOCITY, rightVelRef.current + impulse);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isOpen, selectedProject]);

  // Animate Hero Image & Glassmorphic Sidebar in whenever a project is selected
  useGSAP(() => {
    if (selectedProject && heroCardRef.current && sidebarRef.current) {
      gsap.fromTo(heroCardRef.current,
        { scale: 0.88, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.05 }
      );

      gsap.fromTo(sidebarRef.current,
        { x: "100%", opacity: 0 },
        { x: "0%", opacity: 1, duration: 0.7, ease: "power3.out", delay: 0.05 }
      );
    }
  }, { scope: overlayRef, dependencies: [selectedProject] });

  // Handle Card Click (Push-Aside Transition to Detail View)
  const handleCardClick = (project: DetailedProject) => {
    setSelectedProject(project);
    setActiveImageIndex(0);
    pausedRef.current = true;

    if (viewportLeftRef.current && viewportRightRef.current) {
      gsap.to(viewportLeftRef.current, {
        xPercent: -140,
        opacity: 0,
        duration: 0.75,
        ease: "power3.inOut"
      });

      gsap.to(viewportRightRef.current, {
        xPercent: 140,
        opacity: 0,
        duration: 0.75,
        ease: "power3.inOut"
      });
    }
  };

  // Close Detail View (Reverse Push-Aside Transition)
  const handleCloseDetail = () => {
    if (sidebarRef.current && heroCardRef.current) {
      gsap.to(sidebarRef.current, {
        x: "100%",
        opacity: 0,
        duration: 0.5,
        ease: "power2.in"
      });

      gsap.to(heroCardRef.current, {
        scale: 0.88,
        opacity: 0,
        duration: 0.5,
        ease: "power2.in"
      });
    }

    if (viewportLeftRef.current && viewportRightRef.current) {
      gsap.to([viewportLeftRef.current, viewportRightRef.current], {
        xPercent: 0,
        opacity: 1,
        duration: 0.75,
        ease: "power3.out",
        delay: 0.2,
        onComplete: () => {
          setSelectedProject(null);
          setActiveImageIndex(0);
          hoverTargetRef.current = 1;
          pausedRef.current = false;
        }
      });
    }
  };

  // Card Hover Speed Control
  const handleMouseEnter = () => {
    if (!selectedProject) hoverTargetRef.current = 0.15;
  };

  const handleMouseLeave = () => {
    if (!selectedProject) hoverTargetRef.current = 1;
  };

  // Gallery Navigation Handlers
  const handlePrevImage = useCallback(() => {
    if (!selectedProject) return;
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : selectedProject.gallery.length - 1));
  }, [selectedProject]);

  const handleNextImage = useCallback(() => {
    if (!selectedProject) return;
    setActiveImageIndex((prev) => (prev < selectedProject.gallery.length - 1 ? prev + 1 : 0));
  }, [selectedProject]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedProject) handleCloseDetail();
        else onClose();
      } else if (selectedProject) {
        if (e.key === 'ArrowLeft') handlePrevImage();
        else if (e.key === 'ArrowRight') handleNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedProject, handlePrevImage, handleNextImage, onClose]);

  /** Shared card markup for both slanted columns. */
  const renderCard = (p: DetailedProject, key: string) => (
    <div
      key={key}
      className={styles.card}
      onClick={() => handleCardClick(p)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${p.title}`}
    >
      <Image
        src={p.image}
        alt={p.title}
        fill
        sizes="(max-width: 768px) 280px, (max-width: 1024px) 340px, 440px"
        className={styles.cardImage}
        priority={p.id === 'p1' || p.id === 'p10'}
      />
      <div className={styles.cardOverlay}>
        <span className={styles.cardCategory} dir="auto">
          <span className="i18n-ltr">{p.number}</span> — {p.category}
        </span>
        <h3 className={styles.cardTitle}>{p.title}</h3>
        <div className={styles.cardKeywords}>
          {p.keywords.slice(0, 3).map((kw, i) => (
            <span key={i} className={styles.keywordBadge} dir="auto">{kw}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const activeImageSrc = selectedProject
    ? (selectedProject.gallery[activeImageIndex] || selectedProject.image)
    : '';

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.active : ''}`} ref={overlayRef}>
      <ShimmeringBeamsBackground active={isOpen} />
      
      {/* Header Navigation */}
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <span className={styles.brandTag} dir="auto">{t('brandTag')}</span>
          <h2 className={styles.brandTitle}>{t('brandTitle')}</h2>
          <span className={styles.badge} dir="auto">{t('badge', { count: ARCHIVE_COUNT })}</span>
        </div>
        <button 
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={t('closeLabel')}
          dir="auto"
        >
          ✕ {t('close')}
        </button>
      </header>

      {/* Stage Area */}
      <div className={styles.stage}>
        
        {/* Slanted Opposing Columns Container */}
        <div className={styles.slantedContainer}>
          
          {/* Left Track (drifts upwards, infinitely) */}
          <div
            className={styles.trackViewport}
            ref={viewportLeftRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={styles.columnTrack} ref={colLeftRef}>
              {leftColumnProjects.map((p, idx) => renderCard(p, `left-${p.id}-${idx}`))}
            </div>
          </div>

          {/* Right Track (drifts downwards, infinitely) */}
          <div
            className={styles.trackViewport}
            ref={viewportRightRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={styles.columnTrack} ref={colRightRef}>
              {rightColumnProjects.map((p, idx) => renderCard(p, `right-${p.id}-${idx}`))}
            </div>
          </div>

        </div>

        {/* Detail Stage (Push-Aside View) */}
        <div className={`${styles.detailStage} ${selectedProject ? styles.active : ''}`}>
          
          {/* Hero Image Center Card */}
          <div className={styles.detailHeroArea}>
            {selectedProject && (
              <div className={styles.detailHeroCard} ref={heroCardRef}>
                <Image
                  src={activeImageSrc}
                  alt={selectedProject.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 960px"
                  className={styles.detailHeroImg}
                  priority
                />
                
                <span className={styles.detailHeroBadge} dir="auto">
                  <span className="i18n-ltr">{selectedProject.number}</span>
                  {' // '}
                  {selectedProject.category}
                </span>

                <span className={styles.heroCounterBadge} dir="auto">
                  <span className="i18n-ltr">{activeImageIndex + 1} / {selectedProject.gallery.length}</span>
                </span>

                {selectedProject.gallery.length > 1 && (
                  <>
                    <button
                      className={styles.heroNavPrev}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      className={styles.heroNavNext}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Glassmorphic Detail Sidebar */}
          <div className={styles.detailSidebar} ref={sidebarRef}>
            {selectedProject && (
              <>
                <button 
                  className={styles.sidebarCloseBtn}
                  onClick={handleCloseDetail}
                  dir="auto"
                >
                  ✕ {t('closeView')}
                </button>
                <span className={styles.sidebarIndex} dir="auto">
                  <span className="i18n-ltr">{selectedProject.number}</span>
                  {' // '}
                  {t('featuredArchitecture')}
                </span>
                <h2 className={styles.sidebarTitle}>{selectedProject.title}</h2>
                <p className={styles.sidebarDescription}>{selectedProject.description}</p>

                {/* Multi-Screenshot Gallery Selector */}
                {selectedProject.gallery.length > 1 && (
                  <div className={styles.gallerySection}>
                    <h4 className={styles.sectionHeader}>{t('galleryTitle')}</h4>
                    <div className={styles.galleryGrid}>
                      {selectedProject.gallery.map((thumbSrc, idx) => (
                        <button
                          key={idx}
                          className={`${styles.galleryThumb} ${idx === activeImageIndex ? styles.active : ''}`}
                          onClick={() => setActiveImageIndex(idx)}
                          aria-label={`View screenshot ${idx + 1}`}
                        >
                          <Image
                            src={thumbSrc}
                            alt={`${selectedProject.title} view ${idx + 1}`}
                            fill
                            sizes="72px"
                            className={styles.galleryThumbImg}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <h4 className={styles.sectionHeader}>{t('keySpecs')}</h4>
                <ul className={styles.featureList}>
                  {selectedProject.features.map((feat, i) => (
                    <li key={i} className={styles.featureItem}>
                      <span className={styles.featureBullet}>❖</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <h4 className={styles.sectionHeader}>{t('techStack')}</h4>
                <div className={styles.techList}>
                  {selectedProject.keywords.map((kw, i) => (
                    <span key={i} className={styles.techTag} dir="auto">{kw}</span>
                  ))}
                </div>

                <div className={styles.actionRow}>
                  <button 
                    className={styles.primaryActionBtn}
                    onClick={() => {
                      const event = new CustomEvent('open-contact');
                      window.dispatchEvent(event);
                      onClose();
                    }}
                    dir="auto"
                  >
                    {t('discuss')}
                  </button>
                  <button 
                    className={styles.secondaryActionBtn}
                    onClick={handleCloseDetail}
                    dir="auto"
                  >
                    {t('backToGrid')}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
