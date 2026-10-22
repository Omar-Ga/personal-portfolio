/**
 * Compiles and links a WebGL program without stalling the main thread.
 *
 * Asking for COMPILE_STATUS / LINK_STATUS right after `linkProgram` forces the
 * driver to finish compiling synchronously (100ms+ on some GPUs, which shows up
 * as a hitch mid-scroll). With KHR_parallel_shader_compile we instead poll
 * COMPLETION_STATUS once per frame and only read the status when it is ready.
 */
export async function linkProgramAsync(
  gl: WebGLRenderingContext,
  vsSrc: string,
  fsSrc: string,
  isAlive: () => boolean = () => true
): Promise<WebGLProgram | null> {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;

  gl.shaderSource(vs, vsSrc);
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(vs);
  gl.compileShader(fs);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  const ext = gl.getExtension('KHR_parallel_shader_compile') as { COMPLETION_STATUS_KHR: number } | null;
  if (ext) {
    while (!gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) {
      await new Promise((r) => requestAnimationFrame(r));
      if (!isAlive() || gl.isContextLost()) {
        gl.deleteProgram(prog);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return null;
      }
    }
  }

  const ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
  if (!ok) {
    console.error('WebGL link failed:', gl.getProgramInfoLog(prog), gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs));
  }
  gl.detachShader(prog, vs);
  gl.detachShader(prog, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!ok) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}
