"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import type { AudioLevels, LivePhase } from '@/hooks/useGeminiLive';

/* ==========================================================================
   Luxury AI Voice Orb
   --------------------------------------------------------------------------
   A 4-tier optical architecture:
     1. core     — pulsating volumetric plasma nucleus with domain-warped FBM
     2. shell    — iridescent crystal glass membrane with chromatic dispersion,
                   Fresnel rainbow highlights, dual-point studio reflections,
                   and multi-band audio-reactive fluid displacement
     3. aura     — soft atmospheric corona blooming beyond the surface
     4. stardust — orbital micro-particles swirling in a dynamic vortex field

   Audio reactivity is driven by 4 frequency bands (RMS level, low, mid, high)
   interpolated directly in the WebGL render loop on gsap.ticker, maintaining
   a locked 60 fps without triggering React re-renders.
   ========================================================================== */

const PALETTE = {
  // Idle / Resting: Cosmic Obsidian Crystal with opalescent sheen
  restCore: new THREE.Color(0.04, 0.045, 0.07),
  restEdge: new THREE.Color(0.16, 0.19, 0.28),
  restLift: new THREE.Color(0.52, 0.60, 0.78),
  restAccent: new THREE.Color(0.30, 0.78, 0.95),

  // Listening: Signal Jade & Emerald
  listeningCore: new THREE.Color(0.01, 0.15, 0.10),
  listeningEdge: new THREE.Color(0.06, 0.78, 0.54),
  listeningLift: new THREE.Color(0.45, 0.95, 0.72),
  listeningAccent: new THREE.Color(0.05, 0.82, 0.95),

  // Thinking: Deep Sapphire & Electric Violet
  thinkingCore: new THREE.Color(0.08, 0.06, 0.24),
  thinkingEdge: new THREE.Color(0.40, 0.38, 0.96),
  thinkingLift: new THREE.Color(0.78, 0.55, 0.99),
  thinkingAccent: new THREE.Color(0.95, 0.25, 0.55),

  // Speaking: Royal Rose-Plum & Radiant Coral-Gold
  speakingCore: new THREE.Color(0.15, 0.02, 0.09),
  speakingEdge: new THREE.Color(0.75, 0.10, 0.38),
  speakingLift: new THREE.Color(0.98, 0.60, 0.28),
  speakingAccent: new THREE.Color(0.99, 0.88, 0.35),

  // Connecting: Champagne Gold & Cyan
  connectingCore: new THREE.Color(0.04, 0.06, 0.10),
  connectingEdge: new THREE.Color(0.85, 0.55, 0.15),
  connectingLift: new THREE.Color(0.99, 0.85, 0.45),
  connectingAccent: new THREE.Color(0.20, 0.85, 0.95),

  // Error: Crimson Rose & Ember Ruby
  errorCore: new THREE.Color(0.18, 0.02, 0.02),
  errorEdge: new THREE.Color(0.88, 0.12, 0.25),
  errorLift: new THREE.Color(0.98, 0.45, 0.25),
  errorAccent: new THREE.Color(0.99, 0.20, 0.20)
};

const GLSL_COMMON_NOISE = `
  vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // 3-octave Fractional Brownian Motion for silky fluid swirls
  float fbm(vec3 p) {
    float total = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for(int i = 0; i < 3; i++) {
      total += snoise(p * freq) * amp;
      freq *= 2.05;
      amp *= 0.5;
    }
    return total;
  }
`;

/* ----------------------------------------------------------- Shell Shaders */

const SHELL_VERTEX = `
  uniform float u_time;
  uniform float u_level;
  uniform float u_low;
  uniform float u_mid;
  uniform float u_high;
  uniform float u_breath;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vFluidEnergy;

  ${GLSL_COMMON_NOISE}

  float fluidField(vec3 p, float t) {
    // Macro swell driven by low band and base breathing
    vec3 q = p * 1.2 + vec3(t * 0.25, -t * 0.18, t * 0.22);
    float macroWave = fbm(q) * (0.045 + u_low * 0.22);

    // Mid harmonic flow with domain warping
    vec3 r = p * 2.4 - vec3(t * 0.45, t * 0.35, -t * 0.3);
    float warp = snoise(r + macroWave * 2.0);
    float midWave = warp * (0.025 + u_mid * 0.12);

    // High crystalline shimmer
    float highRipple = snoise(p * 5.2 + vec3(t * 1.1)) * (0.008 + u_high * 0.06);

    return clamp(macroWave + midWave + highRipple, -0.22, 0.22);
  }

  void main() {
    float t = u_time;
    vec3 basePos = position * u_breath;

    float disp = fluidField(basePos, t);
    vDisplacement = disp;
    vFluidEnergy = abs(disp) * 4.5 + u_level * 0.8;

    vec3 newPos = basePos + normal * disp;

    // High-accuracy analytical normal via finite differences
    float eps = 0.03;
    vec3 tangent = normalize(abs(normal.y) < 0.99 ? cross(normal, vec3(0.0, 1.0, 0.0))
                                                 : cross(normal, vec3(1.0, 0.0, 0.0)));
    vec3 bitangent = normalize(cross(normal, tangent));

    float dT = fluidField(basePos + tangent * eps, t) - disp;
    float dB = fluidField(basePos + bitangent * eps, t) - disp;

    vec3 perturbed = normalize(normal - (tangent * dT + bitangent * dB) / eps);

    vViewNormal = normalize(normalMatrix * perturbed);
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vViewPosition = mvPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(newPos, 1.0)).xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const SHELL_FRAGMENT = `
  uniform vec3 u_coreColor;
  uniform vec3 u_edgeColor;
  uniform vec3 u_liftColor;
  uniform vec3 u_accentColor;
  uniform float u_level;
  uniform float u_opacity;
  uniform float u_time;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPosition;
  varying float vDisplacement;
  varying float vFluidEnergy;

  void main() {
    vec3 viewDir = normalize(-vViewPosition);
    vec3 normal = normalize(vViewNormal);
    float NdotV = max(dot(viewDir, normal), 0.0);

    // Chromatic Fresnel Dispersion (RGB wavelength refraction split)
    float fresnelR = pow(1.0 - NdotV, 3.2);
    float fresnelG = pow(1.0 - NdotV, 2.7);
    float fresnelB = pow(1.0 - NdotV, 2.2);
    vec3 fresnelRgb = vec3(fresnelR, fresnelG, fresnelB);

    // Studio Key Light (warm, top-left)
    vec3 lightDir1 = normalize(vec3(-0.6, 0.8, 0.7));
    float diff1 = max(dot(normal, lightDir1), 0.0);
    vec3 half1 = normalize(lightDir1 + viewDir);
    float spec1 = pow(max(dot(normal, half1), 0.0), 36.0);

    // Studio Rim Light (cool, bottom-right)
    vec3 lightDir2 = normalize(vec3(0.7, -0.6, -0.4));
    float diff2 = max(dot(normal, lightDir2), 0.0);
    vec3 half2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(normal, half2), 0.0), 24.0);

    // Subsurface Scattering (light transmitting through the translucent body)
    float sss = pow(clamp(dot(viewDir, -lightDir1), 0.0, 1.0), 3.5) * 0.75;

    // Body Color Gradient: Core -> Edge -> Fluid Crests -> Accent
    float crest = clamp(vDisplacement * 3.8 + 0.5, 0.0, 1.0);
    vec3 innerBody = mix(u_coreColor, u_edgeColor, crest);
    innerBody = mix(innerBody, u_accentColor, vFluidEnergy * 0.35);

    // Lighting composition
    vec3 diffuseComp = innerBody * (0.4 + 0.6 * diff1 + 0.3 * diff2 + sss * 0.5);
    vec3 specularComp = (u_liftColor * spec1 * 1.2) + (u_accentColor * spec2 * 0.8);

    // Iridescent grazing edge with chromatic dispersion
    vec3 iridescentEdge = mix(u_edgeColor, u_liftColor, fresnelRgb);
    iridescentEdge = mix(iridescentEdge, u_accentColor, fresnelB * 0.7);

    // Final blended composition
    vec3 finalColor = diffuseComp + specularComp;
    finalColor = mix(finalColor, iridescentEdge, length(fresnelRgb) * 0.55);
    finalColor += u_liftColor * (u_level * 0.35);

    float alpha = u_opacity * (0.88 + length(fresnelRgb) * 0.12);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

/* ------------------------------------------------------------ Core Shaders */

const CORE_VERTEX = `
  uniform float u_time;
  uniform float u_level;
  uniform float u_low;
  uniform float u_breath;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vPulse;

  void main() {
    float pulse = 1.0 + sin(u_time * 2.2) * 0.04 + (u_low * 0.35 + u_level * 0.25);
    vPulse = pulse;
    vec3 newPos = position * u_breath * pulse;

    vViewNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vViewPosition = mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CORE_FRAGMENT = `
  uniform vec3 u_liftColor;
  uniform vec3 u_accentColor;
  uniform float u_level;
  uniform float u_opacity;
  uniform float u_time;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  varying float vPulse;

  void main() {
    vec3 viewDir = normalize(-vViewPosition);
    float facing = max(dot(viewDir, normalize(vViewNormal)), 0.0);
    float innerGlow = pow(facing, 1.8);

    // Ethereal core radiance
    vec3 coreColor = mix(u_accentColor, u_liftColor, innerGlow);
    float brightness = 0.75 + u_level * 0.85 + (vPulse - 1.0) * 1.2;

    float alpha = innerGlow * (0.85 + u_level * 0.15) * u_opacity;
    gl_FragColor = vec4(coreColor * brightness, alpha);
  }
`;

/* ------------------------------------------------------------ Aura Shaders */

const AURA_VERTEX = `
  uniform float u_time;
  uniform float u_level;
  uniform float u_breath;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    float wave = sin(position.x * 2.5 + u_time * 0.8) * cos(position.y * 2.5 + u_time * 0.6) * 0.035;
    vec3 newPos = position * u_breath + normal * (wave + u_level * 0.18);

    vViewNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    vViewPosition = mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const AURA_FRAGMENT = `
  uniform vec3 u_edgeColor;
  uniform vec3 u_accentColor;
  uniform float u_level;
  uniform float u_opacity;

  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(-vViewPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, normalize(vViewNormal)), 0.0), 3.2);

    vec3 auraColor = mix(u_edgeColor, u_accentColor, fresnel * 0.5);
    float glow = fresnel * (0.45 + u_level * 0.55) * u_opacity;

    gl_FragColor = vec4(auraColor, glow);
  }
`;

/* -------------------------------------------------------- Particle Shaders */

const PARTICLE_VERTEX = `
  attribute float a_phase;
  attribute float a_speed;
  attribute float a_size;
  attribute vec3 a_orbit;

  uniform float u_time;
  uniform float u_level;
  uniform float u_high;
  uniform float u_breath;

  varying float vAlpha;
  varying float vTwinkle;

  void main() {
    float speedMult = 1.0 + u_level * 2.0;
    float angle = a_phase + u_time * a_speed * speedMult * 0.6;

    // Orbit coordinates in tilted orbital plane
    float r = length(position.xy) * (u_breath + u_level * 0.12);
    vec3 orbitPos = vec3(
      cos(angle) * r,
      sin(angle) * r,
      sin(angle * 2.0 + a_phase) * 0.28
    );

    // Rotate with inclination vector
    vec3 p = orbitPos + a_orbit * sin(u_time * 0.4 + a_phase) * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vTwinkle = 0.5 + 0.5 * sin(u_time * 3.5 + a_phase * 6.28);
    vAlpha = (0.4 + 0.6 * vTwinkle) * (0.5 + u_level * 0.5);

    float pointSize = a_size * (1.0 + u_high * 1.5 + vTwinkle * 0.4);
    gl_PointSize = pointSize * (160.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT = `
  uniform vec3 u_liftColor;
  uniform vec3 u_accentColor;
  uniform float u_opacity;

  varying float vAlpha;
  varying float vTwinkle;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft Gaussian particle falloff
    float shape = smoothstep(0.5, 0.0, dist);
    shape = pow(shape, 1.6);

    vec3 col = mix(u_liftColor, u_accentColor, vTwinkle);
    gl_FragColor = vec4(col, shape * vAlpha * u_opacity * 0.85);
  }
`;

interface VoiceOrbProps {
  phase: LivePhase;
  getLevels: () => AudioLevels;
  className?: string;
}

interface PhaseTarget {
  core: THREE.Color;
  edge: THREE.Color;
  lift: THREE.Color;
  accent: THREE.Color;
  spin: number;
  gain: number;
}

function targetsFor(phase: LivePhase): PhaseTarget {
  switch (phase) {
    case 'listening':
      return {
        core: PALETTE.listeningCore,
        edge: PALETTE.listeningEdge,
        lift: PALETTE.listeningLift,
        accent: PALETTE.listeningAccent,
        spin: 0.35,
        gain: 0.85
      };
    case 'thinking':
      return {
        core: PALETTE.thinkingCore,
        edge: PALETTE.thinkingEdge,
        lift: PALETTE.thinkingLift,
        accent: PALETTE.thinkingAccent,
        spin: 0.85,
        gain: 0.25
      };
    case 'speaking':
      return {
        core: PALETTE.speakingCore,
        edge: PALETTE.speakingEdge,
        lift: PALETTE.speakingLift,
        accent: PALETTE.speakingAccent,
        spin: 0.42,
        gain: 1.0
      };
    case 'connecting':
      return {
        core: PALETTE.connectingCore,
        edge: PALETTE.connectingEdge,
        lift: PALETTE.connectingLift,
        accent: PALETTE.connectingAccent,
        spin: 0.65,
        gain: 0.15
      };
    case 'error':
      return {
        core: PALETTE.errorCore,
        edge: PALETTE.errorEdge,
        lift: PALETTE.errorLift,
        accent: PALETTE.errorAccent,
        spin: 0.08,
        gain: 0.0
      };
    default: // idle / resting
      return {
        core: PALETTE.restCore,
        edge: PALETTE.restEdge,
        lift: PALETTE.restLift,
        accent: PALETTE.restAccent,
        spin: 0.16,
        gain: 0.0
      };
  }
}

export default function VoiceOrb({ phase, getLevels, className }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<LivePhase>(phase);
  const levelsRef = useRef(getLevels);

  useEffect(() => {
    phaseRef.current = phase;
    levelsRef.current = getLevels;
  }, [phase, getLevels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.3;

    const uniforms = {
      u_time: { value: 0 },
      u_level: { value: 0 },
      u_low: { value: 0 },
      u_mid: { value: 0 },
      u_high: { value: 0 },
      u_breath: { value: 1 },
      u_opacity: { value: 0 },
      u_coreColor: { value: PALETTE.restCore.clone() },
      u_edgeColor: { value: PALETTE.restEdge.clone() },
      u_liftColor: { value: PALETTE.restLift.clone() },
      u_accentColor: { value: PALETTE.restAccent.clone() }
    };

    /* ------------------------------------------------- 1. Core Plasma Mesh */
    const coreGeo = new THREE.IcosahedronGeometry(0.42, 8);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: CORE_VERTEX,
      fragmentShader: CORE_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    /* ----------------------------------------- 2. Main Crystal Glass Shell */
    // Detail 14 -> smooth organic sphere, visually identical at rendered size
    const shellGeo = new THREE.IcosahedronGeometry(0.76, 14);
    const shellMat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERTEX,
      fragmentShader: SHELL_FRAGMENT,
      uniforms,
      transparent: true
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shellMesh);

    /* ------------------------------------------------ 3. Atmospheric Aura */
    const auraGeo = new THREE.IcosahedronGeometry(0.96, 10);
    const auraMat = new THREE.ShaderMaterial({
      vertexShader: AURA_VERTEX,
      fragmentShader: AURA_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    scene.add(auraMesh);

    /* --------------------------------- 4. Quantum Stardust Particle Cloud */
    const PARTICLE_COUNT = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    const aPhase = new Float32Array(PARTICLE_COUNT);
    const aSpeed = new Float32Array(PARTICLE_COUNT);
    const aSize = new Float32Array(PARTICLE_COUNT);
    const aOrbit = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const radius = 0.88 + Math.random() * 0.42;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      particlePositions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi);
      particlePositions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      aPhase[i] = Math.random() * Math.PI * 2;
      aSpeed[i] = 0.35 + Math.random() * 0.8;
      aSize[i] = 0.035 + Math.random() * 0.055;

      aOrbit[i * 3] = (Math.random() - 0.5) * 0.4;
      aOrbit[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      aOrbit[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('a_phase', new THREE.BufferAttribute(aPhase, 1));
    particleGeo.setAttribute('a_speed', new THREE.BufferAttribute(aSpeed, 1));
    particleGeo.setAttribute('a_size', new THREE.BufferAttribute(aSize, 1));
    particleGeo.setAttribute('a_orbit', new THREE.BufferAttribute(aOrbit, 3));

    const particleMat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    scene.add(particlePoints);

    /* ------------------------------------------------------------- Sizing */
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w === width && h === height) return;
      width = w;
      height = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    /* -------------------------------------------------------- Render Loop */
    let elapsed = 0;
    let spin = 0.16;
    let visible = !document.hidden;

    const currentCore = PALETTE.restCore.clone();
    const currentEdge = PALETTE.restEdge.clone();
    const currentLift = PALETTE.restLift.clone();
    const currentAccent = PALETTE.restAccent.clone();

    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);

    const tick = (_time: number, deltaMs: number) => {
      if (!visible) return;

      const delta = Math.min(deltaMs, 50) / 1000;
      const target = targetsFor(phaseRef.current);
      const levels = levelsRef.current();

      // Organic celestial breathing
      const breath = 1 + Math.sin(elapsed * 0.85) * 0.018;

      elapsed += delta;
      uniforms.u_time.value = elapsed;

      const gain = target.gain;
      uniforms.u_level.value += (levels.level * gain - uniforms.u_level.value) * 0.22;
      uniforms.u_low.value += (levels.low * gain - uniforms.u_low.value) * 0.22;
      uniforms.u_mid.value += (levels.mid * gain - uniforms.u_mid.value) * 0.24;
      uniforms.u_high.value += (levels.high * gain - uniforms.u_high.value) * 0.26;
      uniforms.u_breath.value = breath;
      uniforms.u_opacity.value += (1 - uniforms.u_opacity.value) * 0.08;

      currentCore.lerp(target.core, 0.06);
      currentEdge.lerp(target.edge, 0.06);
      currentLift.lerp(target.lift, 0.06);
      currentAccent.lerp(target.accent, 0.06);

      uniforms.u_coreColor.value.copy(currentCore);
      uniforms.u_edgeColor.value.copy(currentEdge);
      uniforms.u_liftColor.value.copy(currentLift);
      uniforms.u_accentColor.value.copy(currentAccent);

      spin += (target.spin - spin) * 0.05;

      shellMesh.rotation.y += spin * delta;
      shellMesh.rotation.x = Math.sin(elapsed * 0.22) * 0.16;
      shellMesh.rotation.z = Math.cos(elapsed * 0.18) * 0.12;

      auraMesh.rotation.y -= spin * 0.6 * delta;
      auraMesh.rotation.z = Math.cos(elapsed * 0.24) * 0.14;

      coreMesh.rotation.y += spin * 1.5 * delta;
      coreMesh.rotation.x = Math.cos(elapsed * 0.3) * 0.2;

      particlePoints.rotation.y += spin * 0.8 * delta;
      particlePoints.rotation.x = Math.sin(elapsed * 0.15) * 0.1;

      renderer.render(scene, camera);
    };

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver.disconnect();

      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      auraGeo.dispose();
      auraMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();

      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
