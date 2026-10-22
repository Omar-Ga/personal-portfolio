/**
 * Runtime device-capability heuristics, shared by the WebGL canvases and the
 * media loaders. Everything is read lazily and only in the browser, so importing
 * this module during SSR is safe (it reports the "high" tier there, which is
 * never acted upon because all consumers run inside effects).
 */

export type PerfTier = 'low' | 'mid' | 'high';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: NetworkInformationLike;
};

let cachedTier: PerfTier | null = null;

/** Visitor asked for less data (Data Saver) or is on a very slow connection. */
export function prefersSavedData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as NavigatorWithHints).connection;
  if (!conn) return false;
  return Boolean(conn.saveData) || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let cachedWebGL: boolean | null = null;

/**
 * Whether a WebGL context can be created at all (GPU blocklisted, hardware
 * acceleration off, sandboxed). Probing with a throwaway canvas avoids
 * three.js's console.error when its renderer constructor fails.
 */
export function isWebGLAvailable(): boolean {
  if (cachedWebGL !== null) return cachedWebGL;
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    cachedWebGL = Boolean(gl);
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}

/**
 * Coarse GPU/CPU budget estimate. `deviceMemory` is Chromium-only and capped at
 * 8, `hardwareConcurrency` is everywhere (Safari reports a real count), so the
 * two together separate budget Android phones from flagships and desktops.
 */
export function getPerfTier(): PerfTier {
  if (cachedTier) return cachedTier;
  if (typeof navigator === 'undefined') return 'high';

  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  let tier: PerfTier;
  if (prefersSavedData() || memory <= 2 || cores <= 2) {
    tier = 'low';
  } else if (memory <= 4 || cores <= 4 || coarse) {
    tier = 'mid';
  } else {
    tier = 'high';
  }

  cachedTier = tier;
  return tier;
}

/** Device-pixel-ratio ceiling for full-viewport WebGL, by tier. */
export function getMaxDpr(tier: PerfTier = getPerfTier()): number {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cap = tier === 'low' ? 1 : tier === 'mid' ? 1.5 : 2;
  return Math.min(dpr, cap);
}

export interface VideoSource {
  src: string;
  type: string;
}

/**
 * Picks the right encode of a background video. The `media` attribute on
 * `<source>` is not honoured by every browser's <video>, so we choose in JS:
 * phones and low-tier devices get the small 480p/432p files, everyone else the
 * desktop encode. WebM first (smaller), MP4 as the universal fallback.
 */
export function isSmallVideoVariant(): boolean {
  return (
    (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) ||
    getPerfTier() === 'low'
  );
}

export function pickVideoSources(base: string): VideoSource[] {
  const small = isSmallVideoVariant();
  const name = small ? `${base}_mobile` : base;
  return [
    { src: `/${name}.webm`, type: 'video/webm' },
    { src: `/${name}.mp4`, type: 'video/mp4' },
  ];
}

/**
 * Imperatively attaches the picked `<source>` children to a <video> and starts
 * loading. Done outside React state so choosing the encode costs no re-render.
 * Returns false (and does nothing) for Data Saver / 2G visitors or if already
 * attached.
 */
export function attachVideoSources(video: HTMLVideoElement, base: string): boolean {
  if (video.dataset.sourcesAttached || prefersSavedData()) return false;
  video.dataset.sourcesAttached = 'true';
  const nodes = pickVideoSources(base).map(({ src, type }) => {
    const el = document.createElement('source');
    el.src = src;
    el.type = type;
    return el;
  });
  video.replaceChildren(...nodes);
  video.load();
  return true;
}
