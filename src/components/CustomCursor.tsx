"use client";

import { useEffect, useRef } from "react";
import styles from "./CustomCursor.module.css";

const TEXT_INPUT_TYPES = new Set([
  "text",
  "email",
  "search",
  "tel",
  "url",
  "password",
  "number",
]);

const CANDIDATE_SELECTOR = [
  "a[href]",
  "button",
  "select",
  "summary",
  "label",
  "input",
  "textarea",
  "[contenteditable]:not([contenteditable='false'])",
  "[role]",
  "[data-cursor='hover']",
].join(",");

const CLICKABLE_ROLES = new Set(["button", "link", "menuitem", "option", "tab"]);

type CursorState = "default" | "hover" | "text";

const isDisabled = (el: Element) =>
  el.matches(":disabled") || el.getAttribute("aria-disabled") === "true";

const resolveState = (el: Element | null): CursorState => {
  if (!el || isDisabled(el)) return "default";

  if (el instanceof HTMLTextAreaElement) return "text";

  if (el instanceof HTMLInputElement) {
    const type = (el.getAttribute("type") ?? "text").toLowerCase();
    if (TEXT_INPUT_TYPES.has(type)) return "text";
    return type === "hidden" ? "default" : "hover";
  }

  if (el.getAttribute("data-cursor") === "hover") return "hover";

  const role = el.getAttribute("role");
  if (role && CLICKABLE_ROLES.has(role)) return "hover";

  if (el.matches("a[href], button, select, summary, label")) return "hover";

  // Matches the editable host itself; child spans resolve here via `closest`.
  if (el.matches("[contenteditable]:not([contenteditable='false'])")) {
    return "text";
  }

  return "default";
};

const resolveTarget = (target: EventTarget | null) =>
  resolveState((target as Element | null)?.closest?.(CANDIDATE_SELECTOR) ?? null);

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isHoverDevice = window.matchMedia("(hover: hover)").matches;
    const dot = cursorRef.current;

    if (!isHoverDevice || !dot) return;

    dot.style.visibility = "visible";
    document.body.classList.add("hide-default-cursor");

    let hasPosition = false;
    let state: CursorState = "default";

    const applyState = (next: CursorState) => {
      if (next === state) return;
      state = next;
      dot.dataset.state = state;
    };

    const onMouseMove = (event: MouseEvent) => {
      dot.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;

      if (!hasPosition) {
        hasPosition = true;
        dot.dataset.visible = "true";
        // The pointer may already sit over a control (or editable region) when
        // the effect attaches, so seed the state from the first move target
        // instead of waiting for the next boundary event.
        applyState(resolveTarget(event.target));
      }
    };

    const onPointerOver = (event: PointerEvent) => {
      applyState(resolveTarget(event.target));
    };

    const onMouseLeave = () => {
      hasPosition = false;
      delete dot.dataset.visible;
      applyState("default");
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      document.body.classList.remove("hide-default-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <div ref={cursorRef} className={styles.cursorDot} aria-hidden="true" />
  );
}
