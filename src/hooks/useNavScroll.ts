"use client";

import type gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLenis } from 'lenis/react';
import type { NavItem } from '@/lib/navItems';

/**
 * Shared scroll/overlay behaviour for the sidebar, top and mobile navs.
 *
 * Branching is driven by the locale-independent `item.key`, never by the
 * visible label — the labels are translated, the keys are not.
 */
export function useNavScroll(duration = 1.5) {
  const lenis = useLenis();

  const scrollTo = (position: number) => {
    if (lenis) lenis.scrollTo(position, { duration });
    else window.scrollTo({ top: position, behavior: 'smooth' });
  };

  const scrollToEl = (el: HTMLElement) => {
    if (lenis) lenis.scrollTo(el, { duration });
    else el.scrollIntoView({ behavior: 'smooth' });
  };

  return (item: NavItem) => {
    // Contact is an overlay, not a section.
    if (item.key === 'contact') {
      window.dispatchEvent(new Event('open-contact'));
      return;
    }

    // "About" lives inside the pinned services timeline, so we resolve its
    // scroll offset from the `aboutPanel` label rather than a DOM position.
    if (item.key === 'about') {
      const st = ScrollTrigger.getById('showcase-st');
      if (st?.animation) {
        const timeline = st.animation as gsap.core.Timeline;
        const progress = timeline.labels['aboutPanel'] / timeline.duration();
        scrollTo(st.start + (st.end - st.start) * progress);
        return;
      }
      const aboutEl = document.querySelector('#about') as HTMLElement | null;
      if (aboutEl) scrollToEl(aboutEl);
      return;
    }

    if (item.target === '.gsap-main-hero') {
      scrollTo(0);
      return;
    }

    const targetEl = document.querySelector(item.target) as HTMLElement | null;
    if (targetEl) scrollToEl(targetEl);
  };
}
