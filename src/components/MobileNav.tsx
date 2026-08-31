"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { useTranslations } from "next-intl";
import { NAV_ITEMS, type NavItem } from "@/lib/navItems";
import { useNavScroll } from "@/hooks/useNavScroll";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./MobileNav.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const lenis = useLenis();
  const t = useTranslations("nav");
  const navigateTo = useNavScroll(1.2);

  // GSAP Drawer open/close animation
  useGSAP(() => {
    if (!drawerRef.current) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (isOpen) {
        // Slide up and fade in drawer
        gsap.to(drawerRef.current, {
          autoAlpha: 1,
          duration: 0.4,
          ease: "power3.out"
        });

        // Stagger animate links in
        const validItems = navItemsRef.current.filter(Boolean);
        if (validItems.length > 0) {
          gsap.fromTo(
            validItems,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "power2.out",
              delay: 0.1
            }
          );
        }
      } else {
        const validItems = navItemsRef.current.filter(Boolean);
        if (validItems.length > 0) {
          gsap.to(validItems, {
            y: -15,
            opacity: 0,
            duration: 0.25,
            ease: "power2.in"
          });
        }

        gsap.to(drawerRef.current, {
          autoAlpha: 0,
          duration: 0.35,
          delay: 0.1,
          ease: "power3.in"
        });
      }
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      const validItems = navItemsRef.current.filter(Boolean);
      if (isOpen) {
        gsap.set(validItems, { y: 0, opacity: 1 });
        gsap.to(drawerRef.current, {
          autoAlpha: 1,
          duration: 0.15,
          ease: "none"
        });
      } else {
        gsap.to(drawerRef.current, {
          autoAlpha: 0,
          duration: 0.15,
          ease: "none"
        });
      }
    });
  }, [isOpen]);

  const handleNavClick = (item: NavItem) => {
    setIsOpen(false);
    navigateTo(item);
  };

  return (
    <>
      <header className={styles.mobileHeader}>
        <div 
          className={`${styles.logo} i18n-ltr`}
          onClick={() => {
            if (lenis) {
              lenis.scrollTo(0, { duration: 1 });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          {t('logo')}
        </div>
        <button
          className={`${styles.hamburgerBtn} ${isOpen ? styles.open : ""}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={t('mobile.toggleLabel')}
        >
          <span className={`${styles.bar} ${styles.barTop}`} />
          <span className={`${styles.bar} ${styles.barBottom}`} />
        </button>
      </header>

      <div className={styles.drawerOverlay} ref={drawerRef}>
        <nav className={styles.drawerNav}>
          {NAV_ITEMS.map((item, idx) => (
            <div
              key={item.key}
              ref={(el) => {
                navItemsRef.current[idx] = el;
              }}
              className={styles.drawerNavItem}
              onClick={() => handleNavClick(item)}
            >
              <span className={`${styles.navIndex} i18n-ltr`}>0{idx + 1}</span>
              <span>{t(`items.${item.key}`)}</span>
            </div>
          ))}
        </nav>

        <div className={styles.drawerFooter}>
          <span className={styles.footerRole}>{t('mobile.footerRole')}</span>
          <LanguageSwitcher variant="bar" />
          <span className="i18n-ltr">{t('mobile.footerYear')}</span>
        </div>
      </div>
    </>
  );
}
