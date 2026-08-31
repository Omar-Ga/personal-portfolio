"use client";

import React, { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/react';
import { useTranslations } from 'next-intl';
import RippleCanvas from './RippleCanvas';
import styles from './ProjectsSection.module.css';


const WebGLShader = dynamic(() => import('./ui/web-gl-shader').then((m) => m.WebGLShader), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

/** Translated half of a project card — see `messages/<locale>/projects.json`. */
interface ProjectCopy {
  title: string;
  description: string;
  keywords: string[];
}

/**
 * Project identity + assets stay in code; all copy is resolved per locale from
 * `projects.items.<id>`. Order here drives the on-screen order.
 */
const PROJECT_IDS = ['p1', 'p2', 'p3', 'p4'] as const;

const PROJECT_IMAGES = [
  '/images/skycourt/skycourt_1.webp',
  '/images/kafaa/kafaa_1.webp',
  '/images/o2mation/o2mation_1.webp',
  '/images/services/strategy.webp'
];

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const snapPointsRef = useRef<number[]>([]);
  const isClickScrollingRef = useRef<boolean>(false);
  const lenis = useLenis();
  const t = useTranslations('projects');

  const projects = PROJECT_IDS.map((id, idx) => ({
    id,
    image: PROJECT_IMAGES[idx],
    ...(t.raw(`items.${id}`) as ProjectCopy)
  }));

  const [activeImage, setActiveImage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    let timer: NodeJS.Timeout;
    const checkMobile = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768);
      }, 150);
    };
    window.addEventListener('resize', checkMobile);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleThumbnailClick = (idx: number) => {
    isClickScrollingRef.current = true;
    setActiveImage(idx);
    if (!sectionRef.current) {
      isClickScrollingRef.current = false;
      return;
    }
    const st = ScrollTrigger.getById("projects-st");
    if (st) {
      const snapProgress = snapPointsRef.current[idx] !== undefined
        ? snapPointsRef.current[idx]
        : (idx / (PROJECT_IDS.length - 1));
      const targetScroll = st.start + (st.end - st.start) * snapProgress;
      if (lenis) {
        lenis.scrollTo(targetScroll, {
          duration: 0.8,
          onComplete: () => {
            isClickScrollingRef.current = false;
          }
        });
      } else {
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
        setTimeout(() => {
          isClickScrollingRef.current = false;
        }, 800);
      }
    } else {
      isClickScrollingRef.current = false;
    }
  };

  useGSAP(() => {
    if (!sectionRef.current || !listRef.current) return;
    
    const texts = textRefs.current.filter(Boolean) as HTMLDivElement[];
    if (texts.length === 0) return;

    const wrapper = listRef.current.parentElement;
    const wrapperHeight = wrapper ? wrapper.offsetHeight : window.innerHeight;
    const containerCenter = wrapperHeight / 2;
    const maxDist = wrapperHeight / 1.5;

    const itemCenters = texts.map(el => el.offsetTop + el.offsetHeight / 2);
    const listScrollHeight = listRef.current.scrollHeight;
    const maxScrollY = listScrollHeight - wrapperHeight;

    const snapPoints = itemCenters.map((itemCenterY) => {
      const targetY = containerCenter - itemCenterY;
      const progress = -targetY / Math.max(1, maxScrollY);
      return Math.max(0, Math.min(1, progress));
    });
    snapPointsRef.current = snapPoints;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          id: "projects-st",
          trigger: sectionRef.current,
          pin: true,
          anticipatePin: 1,
          start: "top top",
          end: `+=${PROJECT_IDS.length * 200}%`,
          scrub: 0.7,
          refreshPriority: 6,
          invalidateOnRefresh: true,
          snap: {
            snapTo: (value: number) => {
              const points = snapPointsRef.current;
              if (!points || points.length === 0) return value;
              let closest = points[0];
              let minDiff = Math.abs(value - points[0]);
              for (let i = 1; i < points.length; i++) {
                const diff = Math.abs(value - points[i]);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = points[i];
                }
              }
              return closest;
            },
            directional: false,
            delay: 0.1,
            duration: { min: 0.2, max: 0.5 },
            ease: "power2.out"
          },
          onUpdate: function(self) {
            const currentY = -maxScrollY * self.progress;
            let minDistance = Infinity;
            let closestIdx = 0;

            itemCenters.forEach((itemCenterY, i) => {
              const el = texts[i];
              if (!el) return;

              const dist = (itemCenterY + currentY) - containerCenter;
              const absDist = Math.abs(dist);

              if (absDist < minDistance) {
                minDistance = absDist;
                closestIdx = i;
              }

              const normalizedDist = Math.max(0, Math.min(1, absDist / maxDist));
              const curve = Math.pow(normalizedDist, 1.5);
              
              const scale = 1 - (curve * 0.3);
              const opacity = 1 - (curve * 1.0);
              const rotateX = (dist / maxDist) * -90;
              const z = curve * -100;

              gsap.set(el, {
                scale,
                opacity,
                rotateX,
                z,
                transformOrigin: "center center -150px"
              });
            });

            if (!isClickScrollingRef.current) {
              setActiveImage((prev) => (prev !== closestIdx ? closestIdx : prev));
            }
          }
        }
      });

      tl.to(listRef.current, {
        y: -maxScrollY,
        ease: "none"
      });
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      texts.forEach((el) => {
        gsap.set(el, {
          scale: 1,
          opacity: 1,
          rotateX: 0,
          z: 0
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          id: "projects-st",
          trigger: sectionRef.current,
          pin: true,
          anticipatePin: 1,
          start: "top top",
          end: `+=${PROJECT_IDS.length * 150}%`,
          scrub: true,
          refreshPriority: 6,
          invalidateOnRefresh: true,
          onUpdate: function(self) {
            const currentY = -maxScrollY * self.progress;
            let minDistance = Infinity;
            let closestIdx = 0;

            itemCenters.forEach((itemCenterY, i) => {
              const dist = (itemCenterY + currentY) - containerCenter;
              const absDist = Math.abs(dist);
              if (absDist < minDistance) {
                minDistance = absDist;
                closestIdx = i;
              }
            });

            if (!isClickScrollingRef.current) {
              setActiveImage((prev) => (prev !== closestIdx ? closestIdx : prev));
            }
          }
        }
      });

      tl.to(listRef.current, {
        y: -maxScrollY,
        ease: "none"
      });
    });

    ScrollTrigger.refresh();
  }, { scope: sectionRef });

  return (
    <section className={styles.projectsSection} ref={sectionRef} id="projects">
      {!isMobile && <WebGLShader />}
      <div className={styles.projectsContainer} style={{ position: 'relative' }}>
        
        {/* LEFT: Projects 3D Wheel */}
        <div className={styles.servicesListWrapper}>
          <div className={styles.servicesList} ref={listRef}>
            {projects.map((project, idx) => (
              <div 
                key={project.id} 
                className={styles.serviceItem}
                ref={el => {
                  textRefs.current[idx] = el;
                }}
              >
                <h3 className={styles.serviceTitle}>
                  <span className="i18n-ltr">0{idx + 1}</span> — {project.title}
                </h3>
                <p className={styles.serviceDescription}>{project.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: WebGL Canvas / Mobile Static Image */}
        <div className={styles.visualCanvas}>
          {isMobile ? (
            <img 
              src={PROJECT_IMAGES[activeImage].replace(/\.webp$/, '_mobile.webp')} 
              alt={t('previewAlt')}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', transition: 'opacity 0.3s ease' }}
            />
          ) : (
            <RippleCanvas
              images={PROJECT_IMAGES}
              activeIndex={activeImage}
            />
          )}
        </div>

        {/* RIGHT: Keywords & Vertical Preview Thumbnails with Active Dash */}
        <div className={styles.projectMetaWidget}>
          {/* Tech Stack & Feature Keywords */}
          <div className={styles.keywordsBlock}>
            <span className={styles.keywordsHeader} dir="auto">{t('keywordsHeader')}</span>
            <div className={styles.keywordsList}>
              {projects[activeImage]?.keywords.map((kw, i) => (
                <span key={i} className={styles.keywordItem} dir="auto">
                  {kw}
                </span>
              ))}
            </div>

            <button 
              className={styles.exploreArchiveBtn}
              onClick={() => {
                const event = new CustomEvent('open-archive');
                window.dispatchEvent(event);
              }}
              title={t('exploreArchiveTitle')}
              dir="auto"
            >
              {t('exploreArchive')}
            </button>
          </div>

          {/* Thumbnail Strip with Active Dash Indicator */}
          <div className={styles.thumbnailStrip}>
            <div 
              className={styles.activeDash}
              style={{ transform: `translateY(${activeImage * 56 + 10}px)` }}
              aria-hidden="true"
            >
              —
            </div>
            <div className={styles.thumbnailList}>
              {projects.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.thumbnailItem} ${activeImage === idx ? styles.thumbnailActive : ''}`}
                  onClick={() => handleThumbnailClick(idx)}
                  title={t('jumpTo', { title: p.title })}
                >
                  <img src={p.image} alt={p.title} className={styles.thumbnailImg} />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
