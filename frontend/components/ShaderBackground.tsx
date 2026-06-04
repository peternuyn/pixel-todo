"use client";

import { useEffect, useRef } from "react";

// ─── WebGL helper ────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  u_res;      // canvas size in px
uniform vec2  u_mouse;    // mouse in normalised [0,1] (bottom-left origin)
uniform float u_time;

// ── palette (mint farm + futuristic glow) ─────────────────────────────────────
vec3 SKY_TOP  = vec3(0.902, 0.973, 0.925); // #E6F8EC
vec3 SKY_BOT  = vec3(0.561, 0.839, 0.651); // #8FD6A6
vec3 GLOW_A   = vec3(0.247, 0.557, 0.369); // #3F8E5E leaf green
vec3 GLOW_B   = vec3(0.373, 0.851, 0.769); // #5FD9C4 futuristic aqua
vec3 SUN_COL  = vec3(1.0,   0.839, 0.420); // #FFD66B butter sun

// ── smooth value noise ───────────────────────────────────────────────────────
float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
// fractal brownian motion — soft flowing clouds
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

void main() {
  // aspect-corrected coordinates, y=0 at top
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 st = vec2(uv.x, 1.0 - uv.y);
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(st.x * aspect, st.y);

  vec2 mp = vec2(u_mouse.x * aspect, 1.0 - u_mouse.y);

  // ── 1. base vertical sky gradient ────────────────────────────────────────
  vec3 col = mix(SKY_TOP, SKY_BOT, smoothstep(0.0, 1.0, st.y));

  // ── 2. flowing aurora mesh (the futuristic part) ─────────────────────────
  // two drifting fbm layers, warped by mouse for interactivity
  vec2 flow = p * 1.6;
  flow += 0.25 * (mp - p);                    // gentle pull toward cursor
  float n1 = fbm(flow + vec2(u_time * 0.05, u_time * 0.03));
  float n2 = fbm(flow * 1.7 - vec2(u_time * 0.04, u_time * 0.06));
  float aurora = smoothstep(0.35, 0.85, n1 * 0.7 + n2 * 0.5);
  // ribbon banding gives it that aurora curtain look, kept soft
  float ribbon = 0.5 + 0.5 * sin(n1 * 6.2831 + u_time * 0.4);
  vec3 auroraCol = mix(GLOW_A, GLOW_B, ribbon);
  col = mix(col, auroraCol, aurora * 0.32);

  // ── 3. soft drifting light orbs ──────────────────────────────────────────
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 orb = vec2(
      0.5 * aspect + cos(u_time * 0.18 + fi * 2.1) * (0.28 + fi * 0.08) * aspect,
      0.45 + sin(u_time * 0.13 + fi * 1.7) * 0.22
    );
    float d = length(p - orb);
    col += GLOW_B * smoothstep(0.32, 0.0, d) * 0.10;
  }

  // ── 4. interactive cursor glow ───────────────────────────────────────────
  float md = length(p - mp);
  // soft warm halo
  // one soft, restrained halo — just enough to feel responsive
  col += mix(SUN_COL, GLOW_B, 0.5) * smoothstep(0.28, 0.0, md) * 0.07;

  // ── 5. faint sparkle dust drifting upward ────────────────────────────────
  vec2 sp = p * 8.0 + vec2(0.0, -u_time * 0.4);
  float spark = step(0.93, noise(floor(sp)));
  float twinkle = 0.5 + 0.5 * sin(u_time * 3.0 + hash(floor(sp)) * 6.2831);
  col += SUN_COL * spark * twinkle * 0.12;

  // ── 7. subtle vignette to ground the corners ─────────────────────────────
  float vig = smoothstep(1.3, 0.4, length(st - 0.5));
  col *= 0.92 + 0.08 * vig;

  // ── 8. tiny dither to avoid gradient banding ─────────────────────────────
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.012;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) ?? "shader error");
  return s;
}

function buildProgram(gl: WebGLRenderingContext) {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog) ?? "link error");
  return prog;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return; // fallback: canvas stays hidden, CSS gradient shows

    let prog: WebGLProgram;
    try {
      prog = buildProgram(gl);
    } catch (e) {
      console.warn("ShaderBackground: WebGL compile failed", e);
      return;
    }

    gl.useProgram(prog);

    // full-screen quad
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // uniform locations
    const uRes    = gl.getUniformLocation(prog, "u_res");
    const uMouse  = gl.getUniformLocation(prog, "u_mouse");
    const uTime   = gl.getUniformLocation(prog, "u_time");

    // state
    let mouse = { x: 0.5, y: 0.5 };
    const startTime = performance.now();
    let raf = 0;

    // resize
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width  = window.innerWidth  * dpr;
      canvas!.height = window.innerHeight * dpr;
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    window.addEventListener("resize", resize);

    // mouse move
    function onMove(e: MouseEvent) {
      mouse = {
        x: e.clientX / window.innerWidth,
        y: 1 - e.clientY / window.innerHeight,
      };
    }
    // touch move
    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      mouse = {
        x: t.clientX / window.innerWidth,
        y: 1 - t.clientY / window.innerHeight,
      };
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });

    // render loop
    function render() {
      const t = (performance.now() - startTime) / 1000;

      gl!.uniform2f(uRes,   canvas!.width, canvas!.height);
      gl!.uniform2f(uMouse, mouse.x, mouse.y);
      gl!.uniform1f(uTime,  t);

      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize",    resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 block"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
