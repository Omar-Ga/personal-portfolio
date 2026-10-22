"use client";

import { useEffect, useRef } from "react";
import { getPerfTier, prefersReducedMotion } from "@/lib/devicePerf";
import { linkProgramAsync } from "@/lib/glProgram";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 resolution;
uniform float time;
uniform float xScale;
uniform float yScale;
uniform float distortion;

void main() {
  vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  
  float d = length(p) * distortion;
  
  float rx = p.x * (1.0 + d);
  float gx = p.x;
  float bx = p.x * (1.0 - d);

  // Calculate wave intensities
  float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
  float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
  float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
  
  // Invert the color: background becomes white (1.0), and the waves subtract to become dark (0.0)
  gl_FragColor = vec4(1.0 - r, 1.0 - g, 1.0 - b, 1.0);
}
`;

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: false });
    if (!gl) return;

    // Shaders compile in the background (see linkProgramAsync); everything
    // below runs once the program is ready.
    let disposed = false;
    let cleanup = () => {};
    void linkProgramAsync(gl, VERTEX_SHADER, FRAGMENT_SHADER, () => !disposed).then((program) => {
    if (!program || disposed) return;

    // Fullscreen 2D quad (2 triangles)
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]),
      gl.STATIC_DRAW
    );

    const posAttrLoc = gl.getAttribLocation(program, "a_position");
    const uResolution = gl.getUniformLocation(program, "resolution");
    const uTime = gl.getUniformLocation(program, "time");
    const uXScale = gl.getUniformLocation(program, "xScale");
    const uYScale = gl.getUniformLocation(program, "yScale");
    const uDistortion = gl.getUniformLocation(program, "distortion");

    const tier = getPerfTier();
    const frameInterval = tier === 'high' ? 0 : 1000 / 30;
    const reduceMotion = prefersReducedMotion();

    let animationId = 0;
    let time = 0.0;
    let lastFrame = 0;
    let isVisible = true;

    const startLoop = () => {
      if (animationId || document.hidden) return;
      animationId = requestAnimationFrame(render);
    };

    const onVisibility = () => {
      if (!document.hidden && isVisible) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(([entry]) => {
      const wasVisible = isVisible;
      isVisible = entry.isIntersecting;
      if (!wasVisible && isVisible) startLoop();
    }, { threshold: 0.05 });
    io.observe(canvas);

    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent ? parent.clientWidth : window.innerWidth;
      const height = parent ? parent.clientHeight : window.innerHeight;
      // Full-viewport fragment shader: cost scales with pixel count, and the
      // output is a set of soft sine lines, so cap well below native DPR.
      const dpr = Math.min(window.devicePixelRatio || 1, tier === 'high' ? 1.5 : 1);

      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();

    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };
    window.addEventListener("resize", debouncedResize);

    const render = (now: number) => {
      if (!isVisible || document.hidden) {
        animationId = 0;
        return;
      }

      // Lower-tier devices animate at 30fps; the wave drift looks identical
      // and the GPU cost halves.
      if (frameInterval && now - lastFrame < frameInterval - 1) {
        animationId = requestAnimationFrame(render);
        return;
      }
      lastFrame = now;

      if (!reduceMotion) time += frameInterval ? 0.02 : 0.01;

      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(posAttrLoc);
      gl.vertexAttribPointer(posAttrLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform1f(uXScale, 1.0);
      gl.uniform1f(uYScale, 0.5);
      gl.uniform1f(uDistortion, 0.05);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(render);
    };

    startLoop();

    cleanup = () => {
      io.disconnect();
      clearTimeout(resizeTimer);
      cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", debouncedResize);
      if (quadBuffer) gl.deleteBuffer(quadBuffer);
      if (program) gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "block",
        zIndex: 0
      }}
    />
  );
}
