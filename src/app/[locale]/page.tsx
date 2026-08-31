"use client";

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/react';

import CustomCursor from "@/components/CustomCursor";
import BootLoader from "@/components/BootLoader";
import SidebarNav from "@/components/SidebarNav";
import MobileNav from "@/components/MobileNav";
import HeroSection from "@/components/HeroSection";
import GlobalNav from "@/components/GlobalNav";
import ServicesSection from "@/components/ServicesSection";
import StorySection from "@/components/StorySection";
import ProjectsSection from "@/components/ProjectsSection";
import ContactOverlay from "@/components/ContactOverlay";
import AllProjectsOverlay from "@/components/AllProjectsOverlay";
import styles from '../page.module.css';

// Pulls three.js and @google/genai out of the initial bundle; the widget is
// browser-only (WebGL, WebAudio, mic), so there is nothing to prerender.
const VoiceAssistant = dynamic(() => import('@/components/VoiceAssistant'), { ssr: false });

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isHeroVideoLoaded, setIsHeroVideoLoaded] = useState(false);
  const lenis = useLenis();


  // Auto-pause Hero video when user scrolls off-screen
  useEffect(() => {
    const videoEl = heroVideoRef.current;
    const heroSection = containerRef.current;
    if (!videoEl || !heroSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (videoEl.readyState >= 2) {
              videoEl.play().catch(() => {});
            }
          } else {
            videoEl.pause();
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(heroSection);
    return () => observer.disconnect();
  }, []);

  // Smooth fade-in animation for Hero Video upon load
  useGSAP(() => {
    if (isHeroVideoLoaded && heroVideoRef.current) {
      gsap.fromTo(
        heroVideoRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.8, ease: "power2.out", force3D: true }
      );
    }
  }, [isHeroVideoLoaded]);

  // Disable automatic browser scroll restoration on refresh and reset scroll to top
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
      if (typeof (ScrollTrigger as any).clearScrollMemory === "function") {
        (ScrollTrigger as any).clearScrollMemory("soft");
      }
    }
  }, []);

  // Control scrolling with Lenis during the cinematic boot phase and handle ScrollTrigger refresh
  useEffect(() => {
    if (lenis) {
      if (!isLoaded) {
        lenis.stop();
        lenis.scrollTo(0, { immediate: true });
      } else {
        lenis.start();
      }
    } else {
      if (!isLoaded) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }

    if (isLoaded) {
      // Force ScrollTrigger refresh once fonts & assets finish loading
      let resizeTimer: NodeJS.Timeout;
      const handleRefresh = () => {
        ScrollTrigger.refresh();
      };
      const debouncedRefresh = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleRefresh, 200);
      };

      if (typeof document !== 'undefined' && 'fonts' in document) {
        document.fonts.ready.then(handleRefresh);
      }

      window.addEventListener('load', handleRefresh);
      window.addEventListener('resize', debouncedRefresh);

      // Delayed refresh as fallback for dynamic media
      const timer = setTimeout(handleRefresh, 1000);

      return () => {
        window.removeEventListener('load', handleRefresh);
        window.removeEventListener('resize', debouncedRefresh);
        clearTimeout(timer);
        clearTimeout(resizeTimer);
      };
    }
  }, [lenis, isLoaded]);

  // Listen for the global 'open-contact' and 'open-archive' events fired on the page
  useEffect(() => {
    const handleOpenContact = () => setIsContactOpen(true);
    const handleOpenArchive = () => setIsArchiveOpen(true);

    window.addEventListener('open-contact', handleOpenContact);
    window.addEventListener('open-archive', handleOpenArchive);

    return () => {
      window.removeEventListener('open-contact', handleOpenContact);
      window.removeEventListener('open-archive', handleOpenArchive);
    };
  }, []);

  
  // Environmental Lighting Shift when Contact overlay opens
  useGSAP(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isContactOpen) {
      // Dissolve the hero content
      gsap.to(".gsap-main-elem:not(.gsap-sidebar)", { 
        opacity: 0, 
        y: prefersReducedMotion ? 0 : 30, 
        duration: prefersReducedMotion ? 0.2 : 1, 
        ease: "power3.in" 
      });
      
      // Invert sidebar color to white
      gsap.to(".gsap-sidebar", { color: "#fff", borderColor: "rgba(255,255,255,0.2)", duration: prefersReducedMotion ? 0.2 : 1.5 });
      
      if (lenis) lenis.stop();
      document.body.style.overflow = 'hidden';
    } else {
      // Restore hero content
      gsap.to(".gsap-main-elem:not(.gsap-sidebar)", { 
        opacity: 1, 
        y: 0, 
        duration: prefersReducedMotion ? 0.2 : 1.5, 
        ease: "power3.out", 
        delay: prefersReducedMotion ? 0 : 0.5 
      });
      
      // Restore sidebar color
      gsap.to(".gsap-sidebar", { color: "#000", borderColor: "var(--primary)", duration: prefersReducedMotion ? 0.2 : 1.5 });
      
      if (lenis && isLoaded) lenis.start();
      if (isLoaded) document.body.style.overflow = '';
    }
  }, [isContactOpen, lenis, isLoaded]);

  // Video Background Parallax & Global Scroll Progress
  useGSAP((context, contextSafe) => {
    if (!isLoaded) return;

    const mm = gsap.matchMedia();

    // Desktop Video Parallax (only enabled when fine pointer/hover present and reduced motion is off)
    mm.add({
      isHover: "(hover: hover)",
      noReducedMotion: "(prefers-reduced-motion: no-preference)"
    }, (ctx) => {
      const { isHover, noReducedMotion } = ctx.conditions as { isHover: boolean, noReducedMotion: boolean };
      if (!isHover || !noReducedMotion) return;

      const videoBg = document.querySelector(".gsap-video-bg") as HTMLElement | null;
      const videoXTo = videoBg ? gsap.quickTo(videoBg, "x", { duration: 1.2, ease: "power2" }) : null;
      const videoYTo = videoBg ? gsap.quickTo(videoBg, "y", { duration: 1.2, ease: "power2" }) : null;

      const onGlobalMouseMove = (e: MouseEvent) => {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const globalNx = (clientX / innerWidth) * 2 - 1;
        const globalNy = (clientY / innerHeight) * 2 - 1;

        if (videoXTo && videoYTo) {
          videoXTo(-globalNx * 30);
          videoYTo(-globalNy * 30);
        }
      };

      window.addEventListener("mousemove", onGlobalMouseMove, { passive: true });
      return () => window.removeEventListener("mousemove", onGlobalMouseMove);
    });

    // Global scroll progress bar - Desktop (scaleY)
    mm.add("(min-width: 769px)", () => {
      gsap.to(".gsap-scroll-progress", {
        scaleY: 1,
        ease: "none",
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.1,
          invalidateOnRefresh: true
        }
      });
    });

    // Global scroll progress bar - Mobile (scaleX)
    mm.add("(max-width: 768px)", () => {
      gsap.to(".gsap-scroll-progress", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.1,
          invalidateOnRefresh: true
        }
      });
    });

    return () => mm.revert();
  }, { scope: wrapperRef, dependencies: [isLoaded] });

  return (
    <>
      <div className={`${styles.pageWrapper} gsap-page-wrapper`} ref={wrapperRef} suppressHydrationWarning>
        {isLoaded && <GlobalNav />}
        {isLoaded && <MobileNav />}
        <main className={styles.main} ref={containerRef} suppressHydrationWarning>
          
          {/* Light Video Background */}
          <video 
            ref={heroVideoRef}
            className={`${styles.videoBackgroundLight} gsap-video-light gsap-video-bg`}
            loop 
            muted 
            playsInline
            style={{ opacity: isHeroVideoLoaded ? 1 : 0 }}
            onLoadedData={() => {
              setIsHeroVideoLoaded(true);
              if (heroVideoRef.current) {
                heroVideoRef.current.play().catch(() => {});
              }
            }}
          >
            <source src="/light_web_mobile.webm" type="video/webm" media="(max-width: 768px)" />
            <source src="/light_web_mobile.mp4" type="video/mp4" media="(max-width: 768px)" />
            <source src="/light_web.webm" type="video/webm" />
            <source src="/light_web.mp4" type="video/mp4" />
          </video>

          <BootLoader onComplete={() => setIsLoaded(true)} />

          {/* Main Hero Area */}
          <div className={`${styles.mainHeroContainer} gsap-main-hero`} suppressHydrationWarning>
            <div className={styles.contentWrapper}>
              <SidebarNav />
              <HeroSection />
            </div>
          </div>
        </main>

        {/* Invisible Scrub Spacer for Curtain Reveal — 500vh adapts dynamically to screen height */}
        <div className="gsap-scrub-spacer" style={{ height: "500vh", position: "relative", zIndex: 0 }}></div>

        {/* Services Section */}
        {isLoaded && <ServicesSection />}

        {/* Story / About Section */}
        {isLoaded && <StorySection isLoaded={isLoaded} />}

        {/* Projects Section */}
        {isLoaded && <ProjectsSection />}

        {/* Custom Scroll Progress Bar */}
        {isLoaded && (
          <div className={styles.scrollProgressBarContainer}>
            <div className={`${styles.scrollProgressBarFill} gsap-scroll-progress`}></div>
          </div>
        )}
      </div>

      <ContactOverlay isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <AllProjectsOverlay isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} />
      {isLoaded && <VoiceAssistant hidden={isContactOpen || isArchiveOpen} />}
      <CustomCursor />
    </>
  );
}


