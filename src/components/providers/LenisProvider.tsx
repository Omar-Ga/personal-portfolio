"use client";

import { ReactLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<any>(null);
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  useEffect(() => {
    const checkDisabled = () => {
      const isSmall = window.innerWidth <= 768;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsDisabled(isSmall || reducedMotion);
    };
    checkDisabled();

    const mqlMobile = window.matchMedia("(max-width: 768px)");
    const mqlMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = () => checkDisabled();
    mqlMobile.addEventListener("change", handleChange);
    mqlMotion.addEventListener("change", handleChange);

    return () => {
      mqlMobile.removeEventListener("change", handleChange);
      mqlMotion.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (isDisabled) {
      ScrollTrigger.refresh();
      return;
    }

    gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
    }

    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    ScrollTrigger.refresh();

    return () => {
      if (lenis) {
        lenis.off("scroll", ScrollTrigger.update);
      }
      gsap.ticker.remove(update);
    };
  }, [isDisabled]);

  if (isDisabled) {
    return <>{children}</>;
  }

  return (
    <ReactLenis ref={lenisRef} autoRaf={false} root>
      {children}
    </ReactLenis>
  );
}
