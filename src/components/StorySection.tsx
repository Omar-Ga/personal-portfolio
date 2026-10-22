"use client";

import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTranslations } from 'next-intl';
import { attachVideoSources, isSmallVideoVariant } from '@/lib/devicePerf';
import styles from './StorySection.module.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface StorySectionProps {
  isLoaded?: boolean;
}

export default function StorySection({ isLoaded = false }: StorySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const t = useTranslations('story');

  const headlineLines = t.raw('headlineLines') as string[];
  const paragraphs = t.raw('paragraphs') as string[];

  // Idle Preload: Kick off background video fetching 2.5s after site boot
  useEffect(() => {
    if (!isLoaded || shouldLoadVideo) return;

    const timer = setTimeout(() => {
      setShouldLoadVideo(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [isLoaded, shouldLoadVideo]);

  // Resolve which encode to fetch only once loading is wanted; Data Saver / 2G
  // visitors keep the poster frame and never download the clip.
  // (attachVideoSources also calls load(), which covers the Safari/iOS quirk.)
  useEffect(() => {
    const video = videoRef.current;
    if (!shouldLoadVideo || !video) return;
    // Poster is fetched together with the clip (not at first paint, the section
    // is far below the fold), and the 17 KB mobile poster is used on small screens.
    video.poster = isSmallVideoVariant() ? '/story_bg_mobile_poster.webp' : '/story_bg_poster.webp';
    attachVideoSources(video, 'story_bg');
  }, [shouldLoadVideo]);

  useEffect(() => {
    const container = containerRef.current;
    const videoEl = videoRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadVideo(true);
            if (videoEl && videoEl.readyState >= 2) {
              videoEl.play().catch(() => {});
            }
          } else {
            if (videoEl) {
              videoEl.pause();
            }
          }
        });
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useGSAP(() => {
    if (isVideoLoaded && videoRef.current) {
      gsap.fromTo(
        videoRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out", force3D: true }
      );
    }
  }, [isVideoLoaded]);

  useGSAP(() => {
    const words = gsap.utils.toArray<HTMLElement>('.gsap-story-word');
    if (words.length === 0) return;

    // Initially dim all words
    gsap.set(words, { opacity: 0.15 });

    // Scrub opacity to 1 as we scroll through the section
    gsap.to(words, {
      opacity: 1,
      stagger: 0.1,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        pin: true,
        anticipatePin: 1,
        start: "top top",
        end: "+=150%",
        scrub: 1.5,
        invalidateOnRefresh: true,
      }
    });
  }, { scope: containerRef });

  return (
    <section className={styles.storySection} id="about" ref={containerRef}>
      <video 
        ref={videoRef}
        className={styles.storyVideo} 
        loop 
        muted 
        playsInline
        preload="auto"
        style={{ opacity: isVideoLoaded ? 1 : 0 }}
        onCanPlayThrough={() => {
          setIsVideoLoaded(true);
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }}
      >
        {/* <source> children are attached on demand by attachVideoSources() */}
      </video>
      <div className={styles.storyContainer}>
        <h2 className={styles.storyHeadline}>
          {headlineLines.map((line, i) => (
            <React.Fragment key={i}>
              {line.split(' ').map((word, j) => (
                <span key={`h-${i}-${j}`} className="gsap-story-word">
                  {word}{' '}
                </span>
              ))}
              {i < headlineLines.length - 1 ? <br /> : null}
            </React.Fragment>
          ))}
        </h2>
        <div className={styles.storyContent}>
          {paragraphs.map((para, i) => (
            <p key={i}>
              {para.split(' ').map((word, j) => (
                <span key={`${i}-${j}`} className="gsap-story-word">
                  {word}{' '}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
