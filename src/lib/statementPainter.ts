/**
 * Paints the hero -> services "statement": a light paper layer on a canvas with
 * the sentence's letters punched out, so the hero's holographic video (a normal
 * <video> sitting underneath, composited by the browser) shows through the words.
 *
 * Layout is never computed here. The sentence is real DOM text (so wrapping,
 * RTL order and Arabic shaping are the browser's); this module only reads each
 * word's box once per refresh and re-draws the same glyphs on a canvas. A frame
 * is then a clear, one fill and 2 x N fillText calls, no DOM reads.
 */

const PAPER = '#f5f5f5'; // matches the Services section
const TINT_STOPS = ['#17123a', '#0c3a4d', '#2d1840']; // deep indigo -> teal -> plum ink over the (very pale) video
const TINT_ALPHA = 0.62;
const GHOST = 0.14; // resting opacity of a word that has not been reached yet
const WORD_SPAN = 0.34; // share of the reveal each word spends fading in
const MAX_PIXELS = 6e6;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Opacity (GHOST..1) of word `i` of `n` when the reveal is `r` (0..1) through. */
export function wordOpacity(i: number, n: number, r: number): number {
  const start = n > 1 ? (i / (n - 1)) * (1 - WORD_SPAN) : 0;
  const t = clamp01((r - start) / WORD_SPAN);
  return GHOST + (1 - GHOST) * (t * t * (3 - 2 * t));
}

export interface StatementPainter {
  /** Re-reads word boxes + viewport size and repaints. Call after fonts/resize. */
  measure(): void;
  /** Paints the reveal at progress `r` (0..1). Cheap; skips if nothing changed. */
  draw(r: number): void;
}

interface Options {
  canvas: HTMLCanvasElement;
  text: HTMLElement;
  words: HTMLElement[];
  rtl: boolean;
}

export function createStatementPainter({ canvas, text, words, rtl }: Options): StatementPainter | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastR = 0;
  let lastKey = '';
  // One opaque, ink-gradient bitmap per word, rendered once per measure(). A frame
  // then only composites these with a single alpha each; stroking glyphs directly at
  // alpha < 1 double-blends the overlaps of joined Arabic letters into visible ticks.
  let sprites: { bmp: HTMLCanvasElement; x: number; y: number; w: number; h: number }[] = [];

  const measure = () => {
    const bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    if (!width || !height) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (width * height * dpr * dpr > MAX_PIXELS) {
      dpr = Math.max(1, Math.sqrt(MAX_PIXELS / (width * height)));
    }
    const pw = Math.round(width * dpr);
    const ph = Math.round(height * dpr);
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }

    const cs = getComputedStyle(text);
    const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const spacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    const fontSize = parseFloat(cs.fontSize) || 16;
    const pad = Math.ceil(fontSize * 0.12);

    sprites = words.map((el) => {
      const r = el.getBoundingClientRect();
      const w = r.width + pad * 2;
      const h = r.height + pad * 2;
      const bmp = document.createElement('canvas');
      bmp.width = Math.ceil(w * dpr);
      bmp.height = Math.ceil(h * dpr);
      const c = bmp.getContext('2d');
      if (!c) return { bmp, x: 0, y: 0, w, h };
      const x = r.left - bounds.left - pad;
      const y = r.top - bounds.top - pad;

      c.scale(bmp.width / w, bmp.height / h);
      c.font = font;
      if ('letterSpacing' in c) (c as unknown as { letterSpacing: string }).letterSpacing = spacing;
      c.direction = rtl ? 'rtl' : 'ltr';
      c.textAlign = rtl ? 'right' : 'left';
      c.textBaseline = 'alphabetic';

      // Words are inline-blocks one line-height tall: baseline = half-leading + ascent.
      const m = c.measureText('Hg');
      const ascent = m.fontBoundingBoxAscent ?? fontSize * 0.8;
      const descent = m.fontBoundingBoxDescent ?? fontSize * 0.2;
      const baseline = pad + (r.height - (ascent + descent)) / 2 + ascent;

      // Ink gradient spans the whole viewport width, so words pick up their slice of it.
      const g = c.createLinearGradient(-x, 0, width - x, 0);
      TINT_STOPS.forEach((col, k) => g.addColorStop(k / (TINT_STOPS.length - 1), col));
      c.fillStyle = g;
      c.fillText(el.textContent || '', rtl ? w - pad : pad, baseline);
      return { bmp, x, y, w, h };
    });

    lastKey = '';
    paint(lastR);
  };

  const paint = (r: number) => {
    if (!width || sprites.length !== words.length) return;
    const key = `${r.toFixed(4)}|${width}|${height}`;
    if (key === lastKey) return;
    lastKey = key;
    lastR = r;

    const n = words.length;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, width, height);

    // Pass 1: punch the letters out of the paper, as far as each word has been reached.
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < n; i++) {
      const s = sprites[i];
      ctx.globalAlpha = wordOpacity(i, n, r);
      ctx.drawImage(s.bmp, s.x, s.y, s.w, s.h);
    }

    // Pass 2: ink over the video inside the letters, so the pale footage still reads as type.
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const s = sprites[i];
      ctx.globalAlpha = TINT_ALPHA * wordOpacity(i, n, r);
      ctx.drawImage(s.bmp, s.x, s.y, s.w, s.h);
    }
    ctx.globalAlpha = 1;
  };

  return { measure, draw: paint };
}
