"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { NAV_ITEMS } from "@/lib/navItems";
import { useNavScroll } from "@/hooks/useNavScroll";
import LanguageSwitcher from "./LanguageSwitcher";
import styles from "./GlobalNav.module.css";

gsap.registerPlugin(ScrollTrigger);

export default function GlobalNav() {
  const navRef = useRef<HTMLElement>(null);
  const t = useTranslations("nav");
  const handleNavClick = useNavScroll(1.5);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.set(navRef.current, { yPercent: -100, autoAlpha: 0 });

      gsap.to(navRef.current, {
        yPercent: 0,
        autoAlpha: 1,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#services",
          start: "top top",
          toggleActions: "play none none reverse"
        }
      });
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(navRef.current, { yPercent: 0, autoAlpha: 0 });

      gsap.to(navRef.current, {
        autoAlpha: 1,
        duration: 0.2,
        ease: "none",
        scrollTrigger: {
          trigger: "#services",
          start: "top top",
          toggleActions: "play none none reverse"
        }
      });
    });
  });

  return (
    <nav className={`${styles.topNav} gsap-global-nav`} ref={navRef}>
      {NAV_ITEMS.map((item) => (
        <div
          key={item.key}
          className={styles.topNavItem}
          onClick={() => handleNavClick(item)}
        >
          {t(`items.${item.key}`)}
        </div>
      ))}
      <LanguageSwitcher variant="bar" />
    </nav>
  );
}
