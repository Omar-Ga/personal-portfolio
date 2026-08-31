"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

/* ================================================================
   CONFIG
   ================================================================ */
const SIM_SIZE  = 256;   // Ripple simulation resolution (CPU)
const DAMPING   = 0.985; // How quickly ripples fade (0–1, higher = longer)
const DROP_R    = 0.035; // Drop radius in UV space
const DROP_STR  = 0.25;  // Drop strength

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
precision highp float;
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
function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    console.error('Shader:', gl.getShaderInfoLog(s));
  return s;
}

function linkProg(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    console.error('Link:', gl.getProgramInfoLog(p));
  return p;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload  = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function texFromImg(gl: WebGLRenderingContext, img: HTMLImageElement) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

/* ================================================================
   INTERNAL STATE
   ================================================================ */
interface GLState {
  gl:        WebGLRenderingContext;
  prog:      WebGLProgram;
  quad:      WebGLBuffer;
  imgTex:    WebGLTexture[];
  imgRes:    [number, number];
  rippleTex: WebGLTexture;
  simA:      Float32Array;
  simB:      Float32Array;
  simFlip:   number;
  bytes:     Uint8Array;
  curImg:    number;
  prevImg:   number;
  blend:     { value: number };
  mouseU:    number;
  mouseV:    number;
  mouseOn:   boolean;
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

function render(s: GLState, c: HTMLCanvasElement) {
  const gl = s.gl;
  gl.viewport(0, 0, c.width, c.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(s.prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, s.quad);
  const loc = gl.getAttribLocation(s.prog, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, s.imgTex[s.curImg] ?? s.imgTex[0]);
  gl.uniform1i(gl.getUniformLocation(s.prog, 'u_image'), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, s.imgTex[s.prevImg] ?? s.imgTex[0]);
  gl.uniform1i(gl.getUniformLocation(s.prog, 'u_imageOld'), 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, s.rippleTex);
  gl.uniform1i(gl.getUniformLocation(s.prog, 'u_ripple'), 2);

  gl.uniform2f(gl.getUniformLocation(s.prog, 'u_texel'), 1 / SIM_SIZE, 1 / SIM_SIZE);
  gl.uniform1f(gl.getUniformLocation(s.prog, 'u_blend'), s.blend.value);
  
  gl.uniform2f(gl.getUniformLocation(s.prog, 'u_resolution'), c.width, c.height);
  gl.uniform2f(gl.getUniformLocation(s.prog, 'u_imageRes'), s.imgRes[0], s.imgRes[1]);

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

  /* ---- mount: set up GL, load textures, start loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let isIntersecting = true;

    const init = async () => {
      const dpr  = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;

      const gl = canvas.getContext('webgl', {
        alpha: false, premultipliedAlpha: false, antialias: false
      });
      if (!gl) return;

      const prog = linkProg(gl, VS, FS);
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

      const els = await Promise.all(imagesRef.current.map(loadImg));
      if (!alive) return;
      const imgTex = els.map(img => texFromImg(gl, img));

      const s: GLState = {
        gl, prog, quad, imgTex, imgRes: [els[0].width, els[0].height], rippleTex,
        simA:    new Float32Array(SIM_SIZE * SIM_SIZE),
        simB:    new Float32Array(SIM_SIZE * SIM_SIZE),
        simFlip: 0,
        bytes:   new Uint8Array(SIM_SIZE * SIM_SIZE),
        curImg:  activeIndex,
        prevImg: activeIndex,
        blend:   { value: 1 },
        mouseU: 0.5, mouseV: 0.5, mouseOn: false,
        raf: 0, alive: true,
      };
      stateRef.current = s;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const tick = () => {
        if (!s.alive) return;
        if (isIntersecting) {
          if (!prefersReducedMotion) {
            if (s.mouseOn) addDrop(s, s.mouseU, s.mouseV, DROP_R, DROP_STR);
            simStep(s);
            uploadRipple(s);
          }
          render(s, canvas);
        }
        if (!prefersReducedMotion) {
          s.raf = requestAnimationFrame(tick);
        }
      };

      if (prefersReducedMotion) {
        render(s, canvas);
      } else {
        s.raf = requestAnimationFrame(tick);
      }
    };

    init();

    const io = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
    }, { threshold: 0.05 });
    io.observe(canvas);

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width  = width  * dpr;
        canvas.height = height * dpr;
      }
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      alive = false;
      io.disconnect();
      const s = stateRef.current;
      if (s) {
        s.alive = false;
        cancelAnimationFrame(s.raf);
        s.imgTex.forEach(t => s.gl.deleteTexture(t));
        s.gl.deleteTexture(s.rippleTex);
        s.gl.deleteProgram(s.prog);
        s.gl.deleteBuffer(s.quad);
      }
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- image transition (GSAP crossfade + splash) ---- */
  useEffect(() => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    if (activeIndex === s.curImg) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    s.prevImg     = s.curImg;
    s.curImg      = activeIndex;
    s.blend.value = 0;

    if (prefersReducedMotion) {
      s.blend.value = 1;
      render(s, canvas);
    } else {
      // Big splash drop at center on image transition
      addDrop(s, 0.5, 0.5, 0.08, 0.5);
      gsap.to(s.blend, { value: 1, duration: 0.8, ease: 'power2.out' });
    }
  }, [activeIndex]);

  /* ---- pointer / touch / mouse handlers ---- */
  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s) return;
    const r = canvasRef.current!.getBoundingClientRect();
    s.mouseU  = (e.clientX - r.left) / r.width;
    s.mouseV  = 1 - (e.clientY - r.top) / r.height;
    s.mouseOn = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s || !e.touches[0]) return;
    const r = canvasRef.current!.getBoundingClientRect();
    s.mouseU  = (e.touches[0].clientX - r.left) / r.width;
    s.mouseV  = 1 - (e.touches[0].clientY - r.top) / r.height;
    s.mouseOn = true;
  }, []);

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
