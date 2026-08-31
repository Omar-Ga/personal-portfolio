# Design

## Theme

Light-dominant. Pure white canvas; dark mode reserved for specific pages where the black-screen experience is intentional (e.g., intro / cinematic transitions). No system-preference toggle — the design controls the mood, not the OS.

---

## Color

**Strategy:** Committed. One vivid brand green carries 30–60% of active surface. Pure white bg lets it land with maximum luminance contrast. Accent is a deep rose-plum — complementary by mood (botanical ink vs. preserved pigment), not by default color-wheel logic.

**Palette (OKLCH):**

```css
:root {
  /* Brand */
  --primary:  oklch(0.52 0.20 120);   /* Signal green — vivid, confident, non-cliché */
  --accent:   oklch(0.45 0.15 330);   /* Deep rose-plum — current token, kept */

  /* Surface */
  --bg:       oklch(1.000 0.000 0);   /* Pure white */
  --surface:  oklch(0.975 0.005 120); /* Barely-tinted white, breathes brand hue */

  /* Text */
  --ink:      oklch(0.10 0.000 0);    /* Near-black, zero hue tint */
  --muted:    oklch(0.42 0.000 0);    /* 42% lightness neutral — ≥3.5:1 vs bg */
}
```

**Text on color fills:**
- On `--primary` (mid-luminance saturated): use white text (`--bg`)
- On `--accent` (mid-luminance saturated): use white text
- Dark text only on pale fills (L > 0.85) or achromatic surfaces

---

## Typography

**Typefaces:** Outfit (sans-serif / display) + Readex Pro (Arabic). Loaded via Google Fonts.

**Scale:**

| Role | Family | Weight | Size |
|---|---|---|---|
| Display / H1 | Playfair Display | 500 | `clamp(4rem, 8vw, 6rem)` |
| H2 | Playfair Display | 500 | `clamp(2.5rem, 4vw, 3.5rem)` |
| H3 | Playfair Display | 400 italic | `clamp(1.5rem, 2.5vw, 2rem)` |
| Body | Outfit | 400 | `1.125rem` |
| UI / Nav | Outfit | 600 | `0.875–0.95rem` |
| Caption / Label | Outfit | 400 | `0.8125rem` |

**Rules:**
- Headings: `letter-spacing: -0.04em` (floor, no tighter), `text-wrap: balance`
- Body: `line-height: 1.6`, `max-width: 70ch`, `text-wrap: pretty`
- Nav items: `letter-spacing: 0.15em`, `text-transform: uppercase`
- Display heading ceiling: `6rem` (~96px) — no shouting

---

## Motion

**Energy:** High. Cinematic, dramatic — things move with weight and consequence. Reference: Makemepulse / Locomotive-era agency. Every animation should feel like it was designed frame by frame, not applied with a plugin default.

**Library:** GSAP + `@gsap/react` (`useGSAP`). No other animation library.

**Principles:**
- Default easing: `power3.out` for entrances, `power2.in` for exits, `power2.inOut` for transitions
- Duration baseline: `0.7s` quick UI, `1.2–1.5s` cinematic reveals
- Scrub / scroll-driven sections: `ScrollTrigger` with `scrub: 1.5`
- Reduced motion: every animation has a `@media (prefers-reduced-motion: reduce)` fallback (instant or crossfade)
- Never animate `<img>` on hover; animate card background, border, shadow instead
- Stagger: `0.08–0.12s` per item in list reveals; not applied universally to every section

**Named animation patterns:**
- `intro-sequence`: Black overlay → cinematic text → lights-on reveal (existing)
- `fade-rise`: `from({ y: 40, opacity: 0 })` to natural, `duration: 1.5`, `ease: power3.out`
- `clip-reveal`: `clipPath` from `inset(100% 0 0 0)` to `inset(0% 0 0 0)`, used on images and bold text blocks
- `scrub-parallax`: `yPercent` driven by ScrollTrigger scrub on background layers

---

## Layout

**Structure:** Left sidebar (80px fixed width) + main content area. Sidebar holds identity (logo) + vertical nav. Content area is the stage.

**Grid:** Flexbox for 1D sections; CSS Grid for multi-column feature areas. No nested cards.

**Spacing scale:**

```css
--space-1:  0.25rem;
--space-2:  0.5rem;
--space-3:  1rem;
--space-4:  1.5rem;
--space-5:  2rem;
--space-6:  3rem;
--space-8:  4rem;
--space-12: 6rem;
--space-16: 8rem;
```

**Radii:**

```css
--radius-sm: 0.25rem;
--radius-md: 0.5rem;
--radius-lg: 1rem;
```

**Z-index scale:**

```css
--z-base:    0;
--z-raised:  10;
--z-overlay: 20;
--z-modal:   30;
--z-toast:   40;
--z-tooltip: 50;
```

---

## Components

### Nav Item
- Vertical text (`writing-mode: vertical-rl` + `rotate(180deg)`)
- `font-size: 0.95rem`, `font-weight: 600`, `letter-spacing: 0.15em`
- Hover: `color` transitions to `--primary`; no transform, no image animation

### CTA Button
- `border: 2px solid var(--ink)`, transparent bg, `padding: 1rem 2rem`
- Hover state: bg fills with `--primary`, border color becomes `--primary`, text becomes white
- Transition: `background 0.25s ease-out, border-color 0.25s ease-out, color 0.25s ease-out`

### Code Block (decorative)
- Monospace, `font-size: 1rem`, `line-height: 1.6`
- Color: `--ink` or `--primary` for keywords — no fake syntax highlighter box
- No border, no card container; raw text in layout

### Video Background
- `object-fit: cover`, full `100vw × 100vh`, `z-index: 0`
- Light video on light pages; dark video on dark intro

---

## Iconography

No icon library. Use inline SVG for any icon needed. Keep icons outline-only, 1.5px stroke weight, matching `--ink` or `--primary`.

---

## Voice / UX Copy

- Short. Declarative. First-person, not third.
- Avoid: "I am a passionate developer who loves building things." → Use: "I build things."
- Nav labels: single all-caps nouns (`ABOUT`, `PROJECTS`, `WRITING`, `CONTACT`)
- CTA: imperative, not passive. `VIEW PROJECTS` over `See my projects`.

---

## Anti-Patterns (enforced)

- No `border-left` accent stripes > 1px on cards
- No gradient text (`background-clip: text`)
- No glassmorphism decoratively
- No eyebrow/kicker above every section (one deliberate system, not reflexive)
- No numbered section markers as scaffolding (01 / 02 / 03) unless the sequence carries real information
- No identical card grids
- No cream/sand/warm-tinted body background
