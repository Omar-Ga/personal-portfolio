"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { getMaxDpr, getPerfTier, prefersReducedMotion } from '@/lib/devicePerf';
import { linkProgramAsync } from '@/lib/glProgram';

/* ================================================================
   CONFIG
   ================================================================ */
const SIM_SIZE  = 256;   // Ripple simulation resolution (CPU)
const DAMPING   = 0.985; // How quickly ripples fade (0–1, higher = longer)
const DROP_R    = 0.035; // Drop radius in UV space
const DROP_STR  = 0.25;  // Drop strength
const IDLE_THRESHOLD = 120; // Stop the sim after ~2s of stillness

/* ================================================================
   SHADERS
   ================================================================ */
const VS = `
attribute vec2 a_position;
varying   vec2 v_uv;
void main() {
  v_uv        = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v_uv;

uniform sampler2D u_image;
uniform sampler2D u_imageOld;
uniform sampler2D u_ripple;
uniform vec2      u_texel;
uniform float     u_blend;
uniform vec2      u_resolution;
uniform vec2      u_imageRes;

void main() {
  /* ---- object-fit: cover logic ---- */
  vec2 s = u_resolution; // canvas size
  vec2 i = u_imageRes;   // image size
  
  float rs = s.x / s.y;
  float ri = i.x / i.y;
  
  vec2 newSize = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
  vec2 offset = (rs < ri ? vec2((newSize.x - s.x) / 2.0, 0.0) : vec2(0.0, (newSize.y - s.y) / 2.0)) / newSize;
  vec2 uvCover = v_uv * s / newSize + offset;

  /* ---- ripple gradient (finite-difference normal) ---- */
  float hR = texture2D(u_ripple, v_uv + vec2(u_texel.x, 0.0)).r * 2.0 - 1.0;
  float hL = texture2D(u_ripple, v_uv - vec2(u_texel.x, 0.0)).r * 2.0 - 1.0;
  float hT = texture2D(u_ripple, v_uv + vec2(0.0, u_texel.y)).r * 2.0 - 1.0;
  float hB = texture2D(u_ripple, v_uv - vec2(0.0, u_texel.y)).r * 2.0 - 1.0;

  float dx = hR - hL;
  float dy = hT - hB;
  vec2 disp = vec2(dx, dy) * 0.12;

  /* ---- chromatic-aberration displacement ---- */
  vec3 newC;
  newC.r = texture2D(u_image, uvCover + disp * 1.06).r;
  newC.g = texture2D(u_image, uvCover + disp       ).g;
  newC.b = texture2D(u_image, uvCover + disp * 0.94).b;

  /* The outgoing frame only matters while the crossfade is running. */
  if (u_blend >= 1.0) {
    gl_FragColor = vec4(newC, 1.0);
    return;
  }

  vec3 oldC;
  oldC.r = texture2D(u_imageOld, uvCover + disp * 1.06).r;
  oldC.g = texture2D(u_imageOld, uvCover + disp       ).g;
  oldC.b = texture2D(u_imageOld, uvCover + disp * 0.94).b;

  gl_FragColor = vec4(mix(oldC, newC, u_blend), 1.0);
}
`;

/* ================================================================
   WebGL HELPERS
   ================================================================ */
/** Decodes off the main thread so a multi-megapixel upload doesn't stall a frame. */
async function loadImg(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.crossOrigin = 'anonymous';
  img.src = src;
  try {
    await img.decode();
  } catch {
    // decode() rejects for some formats/aborted loads; fall back to onload.
    if (!img.complete) {
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
      });
    }
  }
  return img;
}

interface TexSource {
  source: TexImageSource;
  width: number;
  height: number;
}

/**
 * Source art is 2.7K+ wide; as an RGBA texture that is ~17 MB of GPU memory per
 * frame. Cap the longest side so phones/tablets and iGPUs don't pay for pixels
 * the (cover-fitted, <=2 DPR) canvas can't show.
 */
async function loadTexSource(src: string, maxDim: number): Promise<TexSource> {
  const img = await loadImg(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  if (scale >= 1) return { source: img, width: w, height: h };

  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d');
  if (!ctx) return { source: img, width: w, height: h };
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { source: c, width: c.width, height: c.height };
}

function texFromSource(gl: WebGLRenderingContext, src: TexImageSource) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

/* ================================================================
   INTERNAL STATE
   ================================================================ */
interface Locations {
  position:   number;
  image:      WebGLUniformLocation | null;
  imageOld:   WebGLUniformLocation | null;
  ripple:     WebGLUniformLocation | null;
  texel:      WebGLUniformLocation | null;
  blend:      WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  imageRes:   WebGLUniformLocation | null;
}

interface GLState {
  gl:        WebGLRenderingContext;
  prog:      WebGLProgram;
  quad:      WebGLBuffer;
  loc:       Locations;
  imgTex:    (WebGLTexture | null)[];
  imgRes:    [number, number];
  rippleTex: WebGLTexture;
  simA:      Float32Array;
  simB:      Float32Array;
  simFlip:   number;
  bytes:     Uint8Array;
  curImg:    number;
  prevImg:   number;
  blend:     { value: number };
  tween:     gsap.core.Tween | null;
  mouseU:    number;
  mouseV:    number;
  mouseOn:   boolean;
  idleFrames: number;
  dirty:     boolean;
  raf:       number;
  alive:     boolean;
}

/* ================================================================
   CPU WATER-WAVE SIMULATION
   ================================================================ */
function addDrop(s: GLState, u: number, v: number, radius: number, strength: number) {
  const buf = s.simFlip === 0 ? s.simA : s.simB;
  const cx  = (u * SIM_SIZE) | 0;
  const cy  = (v * SIM_SIZE) | 0;
  const r   = (radius * SIM_SIZE) | 0;

  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const px = cx + dx, py = cy + dy;
      if (px < 1 || px >= SIM_SIZE - 1 || py < 1 || py >= SIM_SIZE - 1) continue;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) continue;
      buf[py * SIM_SIZE + px] += strength * (1 - d / r);
    }
  }
  s.idleFrames = 0;
}

function simStep(s: GLState) {
  const cur  = s.simFlip === 0 ? s.simA : s.simB;
  const prev = s.simFlip === 0 ? s.simB : s.simA;

  for (let y = 1; y < SIM_SIZE - 1; y++) {
    for (let x = 1; x < SIM_SIZE - 1; x++) {
      const i   = y * SIM_SIZE + x;
      const avg = (cur[i - 1] + cur[i + 1] + cur[i - SIM_SIZE] + cur[i + SIM_SIZE]) / 2;
      prev[i]   = (avg - prev[i]) * DAMPING;
    }
  }
  s.simFlip = 1 - s.simFlip;
}

function uploadRipple(s: GLState) {
  const h  = s.simFlip === 0 ? s.simA : s.simB;
  const b  = s.bytes;
  for (let i = 0; i < h.length; i++)
    b[i] = Math.max(0, Math.min(255, (h[i] * 0.5 + 0.5) * 255)) | 0;

  const gl = s.gl;
  gl.bindTexture(gl.TEXTURE_2D, s.rippleTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, SIM_SIZE, SIM_SIZE,
                   gl.LUMINANCE, gl.UNSIGNED_BYTE, b);
}

function firstTexture(s: GLState) {
  return s.imgTex.find((t) => t) ?? null;
}

function render(s: GLState, c: HTMLCanvasElement) {
  const gl = s.gl;
  const l  = s.loc;
  const cur  = s.imgTex[s.curImg]  ?? firstTexture(s);
  const prev = s.imgTex[s.prevImg] ?? cur;
  if (!cur) return;

  gl.viewport(0, 0, c.width, c.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(s.prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, s.quad);
  gl.enableVertexAttribArray(l.position);
  gl.vertexAttribPointer(l.position, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cur);
  gl.uniform1i(l.image, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, prev);
  gl.uniform1i(l.imageOld, 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, s.rippleTex);
  gl.uniform1i(l.ripple, 2);

  gl.uniform2f(l.texel, 1 / SIM_SIZE, 1 / SIM_SIZE);
  gl.uniform1f(l.blend, s.blend.value);
  gl.uniform2f(l.resolution, c.width, c.height);
  gl.uniform2f(l.imageRes, s.imgRes[0], s.imgRes[1]);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

/* ================================================================
   REACT COMPONENT
   ================================================================ */
interface Props {
  images:      string[];
  activeIndex: number;
  className?:  string;
}

export default function RippleCanvas({ images, activeIndex, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<GLState | null>(null);
  const imagesRef = useRef(images);
  const activeRef = useRef(activeIndex);
  const wakeRef   = useRef<() => void>(() => {});
  const motionOk  = useRef(true);

  /* ---- mount: observe visibility, then (lazily) set up GL and start the loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let visible = false;
    let started = false;
    let building = false;

    const tier = getPerfTier();
    const maxTex = tier === 'high' ? 2560 : 1600;
    motionOk.current = !prefersReducedMotion();

    const sizeCanvas = (w: number, h: number) => {
      const dpr = getMaxDpr(tier);
      const cw = Math.max(1, Math.round(w * dpr));
      const ch = Math.max(1, Math.round(h * dpr));
      if (canvas.width === cw && canvas.height === ch) return;
      canvas.width  = cw;
      canvas.height = ch;
      if (stateRef.current) stateRef.current.dirty = true;
    };

    const parentRect = () => canvas.parentElement!.getBoundingClientRect();

    /* One frame. Keeps itself scheduled only while there is something to draw,
       so a settled canvas costs nothing (no rAF, no sim, no GPU work). */
    const frame = () => {
      const s = stateRef.current;
      if (!s) return;
      s.raf = 0;
      if (!alive || !s.alive || !visible || document.hidden) return;

      if (s.mouseOn && motionOk.current) addDrop(s, s.mouseU, s.mouseV, DROP_R, DROP_STR);

      const simActive = s.idleFrames < IDLE_THRESHOLD;
      if (simActive) {
        simStep(s);
        uploadRipple(s);
        s.idleFrames++;
      }

      if (simActive || s.dirty) {
        render(s, canvas);
        s.dirty = false;
      }

      if (simActive || s.mouseOn || s.tween) s.raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      const s = stateRef.current;
      if (!s || !s.alive || s.raf || !visible || document.hidden) return;
      s.raf = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    const ensureTexture = async (s: GLState, i: number) => {
      if (s.imgTex[i] || !s.alive) return;
      const src = imagesRef.current[i];
      if (!src) return;
      const tex = await loadTexSource(src, maxTex).catch(() => null);
      if (!tex || !s.alive || s.imgTex[i]) return;
      s.imgTex[i] = texFromSource(s.gl, tex.source);
      if (i === 0 || !s.imgRes[0]) s.imgRes = [tex.width, tex.height];
      s.dirty = true;
      wake();
    };

    const build = async () => {
      if (building) return;
      building = true;
      try {
        sizeCanvas(parentRect().width, parentRect().height);

        const gl = canvas.getContext('webgl', {
          alpha: false, premultipliedAlpha: false, antialias: false
        });
        if (!gl || !alive) return;

        const prog = await linkProgramAsync(gl, VS, FS, () => alive);
        if (!prog || !alive) return;
        const quad = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.bufferData(gl.ARRAY_BUFFER,
          new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]),
          gl.STATIC_DRAW);

        const rippleTex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, rippleTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE,
                      SIM_SIZE, SIM_SIZE, 0,
                      gl.LUMINANCE, gl.UNSIGNED_BYTE,
                      new Uint8Array(SIM_SIZE * SIM_SIZE).fill(128));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const s: GLState = {
          gl, prog, quad, rippleTex,
          loc: {
            position:   gl.getAttribLocation(prog, 'a_position'),
            image:      gl.getUniformLocation(prog, 'u_image'),
            imageOld:   gl.getUniformLocation(prog, 'u_imageOld'),
            ripple:     gl.getUniformLocation(prog, 'u_ripple'),
            texel:      gl.getUniformLocation(prog, 'u_texel'),
            blend:      gl.getUniformLocation(prog, 'u_blend'),
            resolution: gl.getUniformLocation(prog, 'u_resolution'),
            imageRes:   gl.getUniformLocation(prog, 'u_imageRes'),
          },
          imgTex: imagesRef.current.map(() => null),
          imgRes: [0, 0],
          simA:    new Float32Array(SIM_SIZE * SIM_SIZE),
          simB:    new Float32Array(SIM_SIZE * SIM_SIZE),
          simFlip: 0,
          bytes:   new Uint8Array(SIM_SIZE * SIM_SIZE),
          curImg:  activeRef.current,
          prevImg: activeRef.current,
          blend:   { value: 1 },
          tween:   null,
          mouseU: 0.5, mouseV: 0.5, mouseOn: false,
          idleFrames: IDLE_THRESHOLD, dirty: true,
          raf: 0, alive: true,
        };
        stateRef.current = s;

        // The visible image first; the rest trickle in afterwards, one at a time.
        await ensureTexture(s, activeRef.current);
        for (let i = 0; i < imagesRef.current.length && s.alive; i++) {
          if (i !== activeRef.current) await ensureTexture(s, i);
        }
      } finally {
        building = false;
      }
    };

    const teardownGL = () => {
      const s = stateRef.current;
      if (!s) return;
      s.alive = false;
      s.tween?.kill();
      cancelAnimationFrame(s.raf);
      s.imgTex.forEach((t) => t && s.gl.deleteTexture(t));
      s.gl.deleteTexture(s.rippleTex);
      s.gl.deleteProgram(s.prog);
      s.gl.deleteBuffer(s.quad);
      // Hand the context back immediately instead of waiting for GC (matters
      // with dev StrictMode remounts and Safari's small context budget).
      s.gl.getExtension('WEBGL_lose_context')?.loseContext();
      stateRef.current = null;
    };

    /* Defer all GL/texture work until the canvas is actually near the viewport. */
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) return;
      if (!started) {
        started = true;
        void build();
      } else {
        const s = stateRef.current;
        if (s) s.dirty = true;
        wake();
      }
    }, { threshold: 0.05, rootMargin: '200px 0px' });
    io.observe(canvas);

    // Warm up GL/textures during idle time after load, so the work never lands
    // mid-scroll when the canvas first approaches the viewport.
    const idle = (cb: () => void) =>
      typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 4000 }) : window.setTimeout(cb, 1500);
    const warmTimer = window.setTimeout(() => idle(() => {
      if (!started && alive) {
        started = true;
        void build();
      }
    }), 2500);

    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let resizeRaf = 0;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[entries.length - 1].contentRect;
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        sizeCanvas(width, height);
        wake();
      });
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const onLost = (e: Event) => {
      e.preventDefault();
      const s = stateRef.current;
      if (s) {
        s.alive = false;
        cancelAnimationFrame(s.raf);
      }
    };
    const onRestored = () => {
      stateRef.current = null;
      started = visible;
      if (visible) void build();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      alive = false;
      clearTimeout(warmTimer);
      io.disconnect();
      ro.disconnect();
      cancelAnimationFrame(resizeRaf);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      wakeRef.current = () => {};
      teardownGL();
    };
  }, []);

  /* ---- image transition (GSAP crossfade + splash) ---- */
  useEffect(() => {
    activeRef.current = activeIndex;
    const s = stateRef.current;
    if (!s || !s.alive) return;
    if (activeIndex === s.curImg) return;

    s.prevImg = s.curImg;
    s.curImg  = activeIndex;
    s.blend.value = 0;
    s.dirty = true;

    // Big splash drop at center on image transition
    if (motionOk.current) addDrop(s, 0.5, 0.5, 0.08, 0.5);

    // Requested art may still be trickling in; fetch it now rather than wait.
    if (!s.imgTex[activeIndex]) {
      const src = imagesRef.current[activeIndex];
      if (src) {
        loadTexSource(src, getPerfTier() === 'high' ? 2560 : 1600).then((tex) => {
          if (!s.alive || s.imgTex[activeIndex]) return;
          s.imgTex[activeIndex] = texFromSource(s.gl, tex.source);
          s.dirty = true;
          wakeRef.current();
        }).catch(() => {});
      }
    }

    s.tween?.kill();
    s.tween = gsap.to(s.blend, {
      value: 1,
      duration: motionOk.current ? 0.8 : 0.2,
      ease: 'power2.out',
      onUpdate: () => { s.dirty = true; },
      onComplete: () => { s.tween = null; s.dirty = true; }
    });
    wakeRef.current();
  }, [activeIndex]);

  /* ---- pointer / touch / mouse handlers ---- */
  const track = useCallback((clientX: number, clientY: number) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    const r = canvas.getBoundingClientRect();
    s.mouseU  = (clientX - r.left) / r.width;
    s.mouseV  = 1 - (clientY - r.top) / r.height;
    s.mouseOn = true;
    wakeRef.current();
  }, []);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    track(e.clientX, e.clientY);
  }, [track]);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches[0]) return;
    track(e.touches[0].clientX, e.touches[0].clientY);
  }, [track]);

  const onLeave = useCallback(() => {
    if (stateRef.current) stateRef.current.mouseOn = false;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onTouchStart={onTouchMove}
      onTouchMove={onTouchMove}
      onTouchEnd={onLeave}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
