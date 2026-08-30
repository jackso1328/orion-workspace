import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";

/* ─── GLSL Shaders ─── */
const coreVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;
uniform float uTime;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  // Extremely subtle breathing
  float displacement = sin(position.y * 5.0 + uTime) * 0.01;
  vec3 newPosition = position + normal * displacement;
  vPosition = (modelViewMatrix * vec4(newPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}`;

const coreFragmentShader = `
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uIntensity;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// 3D Simplex noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main() {
  vec3 viewDir = normalize(-vPosition);
  float fresnel = max(dot(viewDir, vNormal), 0.0);
  
  // 1. STRUCTURED VORTEX SWIRLS
  vec3 p = normalize(vPosition);
  float theta = atan(p.z, p.x);
  float phi = acos(p.y);
  
  // Swirling noise pattern
  float n1 = sin(vUv.x * 10.0 + uTime) * cos(vUv.y * 10.0 - uTime * 0.5);
  float n2 = sin(vUv.y * 15.0 + uTime * 1.5) * cos(vUv.x * 15.0 + uTime * 0.2);
  float swirlMask = smoothstep(0.1, 0.4, n1 * n2);
  
  // Base void color (much darker deep navy blue)
  vec3 voidColor = mix(uColor1 * 0.05, uColor1 * 0.4, fresnel);
  
  // Luminous electric cyan bands
  vec3 bandColor = mix(uColor2, uColor3, swirlMask);
  
  // Mix heavily towards the void to retain deep contrast
  vec3 energy = mix(voidColor, bandColor, swirlMask * 0.75);
  
  // Sharp cyan rim (Glass edge) 
  float sharpRim = pow(1.0 - fresnel, 2.5);
  energy = mix(energy, uColor3, sharpRim * 0.8);
  
  // 2. HARDCODED MASSIVE SPECULAR REFLECTIONS
  // Top-Right Massive Highlight
  vec3 lightDirTR = normalize(vec3(0.5, 0.5, 0.5));
  float specTR = pow(max(dot(reflect(-viewDir, vNormal), lightDirTR), 0.0), 15.0);
  // Bottom Sweeping Crescent
  vec3 lightDirB = normalize(vec3(0.0, -0.8, 0.4));
  float specB = pow(max(dot(reflect(-viewDir, vNormal), lightDirB), 0.0), 8.0);
  
  // Inject luminosity for the reflections
  energy += vec3(0.8, 0.95, 1.0) * specTR * 1.5; // Bright top right oval
  energy += vec3(0.3, 0.7, 1.0) * specB * 0.9;   // Sweeping bottom crescent
  
  energy *= uIntensity;

  // Glass-like opacity: transparent center but opaque at swirls, rim, AND reflections.
  // Boosted base alpha to 0.7 so the orb doesn't wash out too much against the background.
  float alpha = clamp(0.7 + swirlMask * 0.5 + sharpRim + specTR + specB, 0.0, 1.0);
  
  gl_FragColor = vec4(energy, alpha);
}`;

// --- Atmospheric Glow Shader ---
const glowVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const glowFragmentShader = `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float dist = length(vUv - vec2(0.5));
  // Smooth exponential falloff for the massive atmospheric halo
  float alpha = pow(1.0 - clamp(dist * 2.0, 0.0, 1.0), 3.0);
  gl_FragColor = vec4(uColor, alpha * uIntensity * 1.5);
}`;

const particleVertexShader = `
attribute float aSize;
attribute float aOpacity;
attribute float aPhase;
attribute float aOrbitRadius;
attribute float aOrbitSpeed;
attribute float aYOffset;
attribute vec3 aAxis;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform float uParticleSpeedMult;

varying float vOpacity;
varying vec3 vColor;

void main() {
  vOpacity = aOpacity;
  vColor = aColor;
  float timeOffset = uTime * aOrbitSpeed * uParticleSpeedMult + aPhase;
  float x = cos(timeOffset) * aOrbitRadius;
  float z = sin(timeOffset) * aOrbitRadius;
  float y = aYOffset + sin(timeOffset * 0.5) * (aOrbitRadius * 0.2);
  vec3 pos = vec3(x, y, z);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float twinkle = 0.5 + 0.5 * sin(uTime * 3.0 + aPhase * 6.28);
  gl_PointSize = aSize * uPixelRatio * (60.0 / -mvPosition.z) * twinkle;
  gl_Position = projectionMatrix * mvPosition;
}`;

const particleFragmentShader = `
varying float vOpacity;
varying vec3 vColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  // Sharp, tiny star falloff
  float alpha = pow(1.0 - (dist * 2.0), 2.0) * vOpacity;
  gl_FragColor = vec4(vColor, alpha);
}`;

/* ─── Particle field data ─── */
interface ParticleData {
  sizes: Float32Array; opacities: Float32Array; phases: Float32Array;
  orbitRadii: Float32Array; orbitSpeeds: Float32Array; yOffsets: Float32Array;
  axes: Float32Array; colors: Float32Array; count: number;
}
function createParticleField(count: number): ParticleData {
  const sizes = new Float32Array(count); const opacities = new Float32Array(count);
  const phases = new Float32Array(count); const orbitRadii = new Float32Array(count);
  const orbitSpeeds = new Float32Array(count); const yOffsets = new Float32Array(count);
  const axes = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  
  const colorPalette = [
    new THREE.Color("#ccffff"), // Original cyan
    new THREE.Color("#3b82f6"), // Blue
    new THREE.Color("#f1f5f9"), // Cloud / white
    new THREE.Color("#94a3b8"), // Grey
  ];
  for (let i = 0; i < count; i++) {
    phases[i] = Math.random() * Math.PI * 2;
    const r = Math.random();
    let radius = (r < 0.3) ? 1.4 + Math.random() * 0.5 : (r < 0.7) ? 2.0 + Math.random() * 1.5 : 3.5 + Math.random() * 2.5;
    orbitRadii[i] = radius;
    orbitSpeeds[i] = (0.05 + Math.random() * 0.1) * (Math.random() > 0.5 ? 1 : -1);
    yOffsets[i] = (Math.random() - 0.5) * radius * 1.5;
    axes[i*3] = Math.random() - 0.5; axes[i*3+1] = 1.0; axes[i*3+2] = Math.random() - 0.5;
    const sizeRoll = Math.random();
    // Making particles much more opaque overall
    if (sizeRoll < 0.60) { sizes[i] = 0.2 + Math.random() * 0.4; opacities[i] = 0.7 + Math.random() * 0.3; }
    else if (sizeRoll < 0.90) { sizes[i] = 0.8 + Math.random() * 0.6; opacities[i] = 0.85 + Math.random() * 0.15; }
    else { sizes[i] = 1.5 + Math.random() * 0.8; opacities[i] = 1.0; }
    
    // Assign a random color from the palette
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i*3] = color.r; colors[i*3+1] = color.g; colors[i*3+2] = color.b;
  }
  return { sizes, opacities, phases, orbitRadii, orbitSpeeds, yOffsets, axes, colors, count };
}

/* ─── Visual params per status ─── */
interface VisualParams {
  color1: THREE.Color; color2: THREE.Color; color3: THREE.Color;
  particleColor: THREE.Color; filamentColor: THREE.Color; glowColor: THREE.Color;
  intensity: number; particleSpeedMult: number; coreRotationSpeed: number;
}
function getVisualParams(status: string): VisualParams {
  switch (status) {
    case "recording": return {
      color1: new THREE.Color("#022c22"), color2: new THREE.Color("#059669"), color3: new THREE.Color("#34d399"),
      particleColor: new THREE.Color("#6ee7b7"), filamentColor: new THREE.Color("#a7f3d0"), glowColor: new THREE.Color("#059669"),
      intensity: 1.2, particleSpeedMult: 2.0, coreRotationSpeed: 0.3
    };
    case "thinking": return {
      color1: new THREE.Color("#2e1065"), color2: new THREE.Color("#7c3aed"), color3: new THREE.Color("#a78bfa"),
      particleColor: new THREE.Color("#c4b5fd"), filamentColor: new THREE.Color("#ddd6fe"), glowColor: new THREE.Color("#7c3aed"),
      intensity: 0.9, particleSpeedMult: 1.5, coreRotationSpeed: 0.2
    };
    case "speaking": return {
      color1: new THREE.Color("#0f172a"), color2: new THREE.Color("#2563eb"), color3: new THREE.Color("#60a5fa"),
      particleColor: new THREE.Color("#93c5fd"), filamentColor: new THREE.Color("#bfdbfe"), glowColor: new THREE.Color("#3b82f6"),
      intensity: 1.5, particleSpeedMult: 1.2, coreRotationSpeed: 0.25
    };
    case "transcribing": return {
      color1: new THREE.Color("#082f49"), color2: new THREE.Color("#0ea5e9"), color3: new THREE.Color("#38bdf8"),
      particleColor: new THREE.Color("#7dd3fc"), filamentColor: new THREE.Color("#bae6fd"), glowColor: new THREE.Color("#0ea5e9"),
      intensity: 0.9, particleSpeedMult: 1.3, coreRotationSpeed: 0.18
    };
    case "idle":
    default: return {
      // Deep navy #000c1a, vibrant cyan swirls #00ffff, electric rim #ffffff
      color1: new THREE.Color("#000c1a"), color2: new THREE.Color("#00ffff"), color3: new THREE.Color("#ffffff"),
      particleColor: new THREE.Color("#ccffff"), filamentColor: new THREE.Color("#66ffee"), glowColor: new THREE.Color("#00e5ff"),
      intensity: 1.0, particleSpeedMult: 1.0, coreRotationSpeed: 0.15
    };
  }
}

export type OrionStatus = "idle" | "recording" | "transcribing" | "thinking" | "speaking";
interface OrionOrbProps { status: OrionStatus; }

export default function OrionOrb({ status }: OrionOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eyeContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const [hoverState, setHoverState] = useState(false);
  const isHoveredRef = useRef(false);
  const choreoTimersRef = useRef<Set<number>>(new Set());
  const mousePosRef = useRef({ x: 0, y: 0 });
  const orbCenterRef = useRef({ x: 0, y: 0 });

  /* ─── Init WebGL ─── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);

    // Make renderer handle transparent background properly for post-processing
    renderer.setClearColor(0x000000, 0); 
    // It's critical that the scene background is null so alpha passes through to DOM

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.z = 8.5;

    const disposables: any[] = [];
    const targetParams = getVisualParams("idle");
    const currentParams = getVisualParams("idle"); 

    // Atmospheric Glow (Plane behind orb)
    const glowGeo = new THREE.PlaneGeometry(8, 8);
    disposables.push(glowGeo);
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: glowVertexShader, fragmentShader: glowFragmentShader,
      uniforms: { uColor: { value: currentParams.glowColor }, uIntensity: { value: currentParams.intensity } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending 
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.z = -1; 
    scene.add(glowMesh);

    // Core Sphere
    const coreGeo = new THREE.SphereGeometry(1.15, 64, 64);
    disposables.push(coreGeo);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: coreVertexShader, fragmentShader: coreFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: currentParams.color1 }, uColor2: { value: currentParams.color2 },
        uColor3: { value: currentParams.color3 }, uIntensity: { value: currentParams.intensity },
      },
      transparent: true, depthWrite: true, blending: THREE.NormalBlending
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.visible = false; // Hide the solid sphere to keep the pure energy glow look
    scene.add(coreMesh);

    // Particles (GPU Driven)
    const PARTICLE_COUNT = 300;
    const particles = createParticleField(PARTICLE_COUNT);
    const pGeo = new THREE.BufferGeometry();
    disposables.push(pGeo);
    pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)); 
    pGeo.setAttribute("aSize", new THREE.BufferAttribute(particles.sizes, 1));
    pGeo.setAttribute("aOpacity", new THREE.BufferAttribute(particles.opacities, 1));
    pGeo.setAttribute("aPhase", new THREE.BufferAttribute(particles.phases, 1));
    pGeo.setAttribute("aOrbitRadius", new THREE.BufferAttribute(particles.orbitRadii, 1));
    pGeo.setAttribute("aOrbitSpeed", new THREE.BufferAttribute(particles.orbitSpeeds, 1));
    pGeo.setAttribute("aYOffset", new THREE.BufferAttribute(particles.yOffsets, 1));
    pGeo.setAttribute("aAxis", new THREE.BufferAttribute(particles.axes, 3));
    pGeo.setAttribute("aColor", new THREE.BufferAttribute(particles.colors, 3));
    
    const pMat = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader, fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 }, uPixelRatio: { value: dpr },
        uParticleSpeedMult: { value: currentParams.particleSpeedMult },
      },
      transparent: true, depthWrite: false, blending: THREE.NormalBlending, 
    });
    scene.add(new THREE.Points(pGeo, pMat));

    const clock = new THREE.Clock();
    let lastTime = 0;
    const state = {
      renderer, scene, camera, coreMat, pMat, glowMat,
      clock, animId: 0, coreMesh, disposables, targetParams, currentParams, lastTime
    };
    sceneRef.current = state;

    const renderLoop = () => {
      state.animId = requestAnimationFrame(renderLoop);
      const elapsed = state.clock.getElapsedTime();
      const dt = Math.min(elapsed - state.lastTime, 0.1); // Cap delta at 100ms
      state.lastTime = elapsed;

      const t = Math.min(dt * 3.0, 1.0);
      currentParams.color1.lerp(targetParams.color1, t);
      currentParams.color2.lerp(targetParams.color2, t);
      currentParams.color3.lerp(targetParams.color3, t);
      currentParams.particleColor.lerp(targetParams.particleColor, t);
      currentParams.filamentColor.lerp(targetParams.filamentColor, t);
      currentParams.glowColor.lerp(targetParams.glowColor, t);
      currentParams.intensity = THREE.MathUtils.lerp(currentParams.intensity, targetParams.intensity, t);
      currentParams.particleSpeedMult = THREE.MathUtils.lerp(currentParams.particleSpeedMult, targetParams.particleSpeedMult, t);
      currentParams.coreRotationSpeed = THREE.MathUtils.lerp(currentParams.coreRotationSpeed, targetParams.coreRotationSpeed, t);

      coreMat.uniforms.uTime.value = elapsed;
      coreMat.uniforms.uIntensity.value = currentParams.intensity;
      coreMesh.rotation.y = elapsed * currentParams.coreRotationSpeed;
      coreMesh.rotation.x = Math.sin(elapsed * 0.1) * 0.05;

      glowMat.uniforms.uIntensity.value = currentParams.intensity;

      pMat.uniforms.uTime.value = elapsed;
      pMat.uniforms.uParticleSpeedMult.value = currentParams.particleSpeedMult;

      scene.rotation.y = Math.sin(elapsed * 0.05) * 0.05;
      scene.rotation.x = Math.cos(elapsed * 0.03) * 0.05;

      renderer.render(scene, camera);
    };
    renderLoop();

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(state.animId);
      else { state.clock.start(); renderLoop(); }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(state.animId);
      renderer.dispose();
      coreMat.dispose(); pMat.dispose(); glowMat.dispose();
      disposables.forEach(g => g.dispose());
      sceneRef.current = null;
    };
  }, []);

  /* ─── Status Updates ─── */
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.targetParams = getVisualParams(status);
  }, [status]);

  /* ─── Eye tracking ─── */
  const handleMouseMove = useCallback((e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; }, []);
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateCenter = () => { const r = container.getBoundingClientRect(); orbCenterRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    updateCenter();
    window.addEventListener("resize", updateCenter);
    return () => window.removeEventListener("resize", updateCenter);
  }, []);
  useEffect(() => {
    let rafId = 0;
    const loop = () => {
      const el = eyeContainerRef.current;
      if (!el) return;
      if (isHoveredRef.current && status === "idle") {
        const dx = mousePosRef.current.x - orbCenterRef.current.x;
        const dy = mousePosRef.current.y - orbCenterRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxMove = 10;
        let tx = 0, ty = 0;
        if (dist > 0) { tx = (dx / dist) * Math.min(dist * 0.08, maxMove); ty = (dy / dist) * Math.min(dist * 0.08, maxMove); }
        const cx = parseFloat(el.dataset.x || "0"), cy = parseFloat(el.dataset.y || "0");
        const nx = cx + (tx - cx) * 0.1, ny = cy + (ty - cy) * 0.1;
        el.dataset.x = nx.toFixed(2); el.dataset.y = ny.toFixed(2);
        el.style.transform = `translate(${nx}px, ${ny}px)`;
        rafId = requestAnimationFrame(loop);
      } else {
        el.style.transform = "translate(0, 0)"; el.dataset.x = "0"; el.dataset.y = "0";
      }
    };
    if (isHoveredRef.current && status === "idle") rafId = requestAnimationFrame(loop);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [status, hoverState]);

  const handleMouseEnter = () => {
    if (status !== "idle") return;
    isHoveredRef.current = true; setHoverState(true);
    const c = containerRef.current;
    if (c) { const r = c.getBoundingClientRect(); orbCenterRef.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    const el = eyeContainerRef.current;
    if (el) el.className = "orion-eyes-overlay eye-attentive";
  };
  const handleMouseLeave = () => {
    isHoveredRef.current = false; setHoverState(false);
    const el = eyeContainerRef.current;
    if (el) el.className = "orion-eyes-overlay eye-neutral";
  };

  /* ─── Idle choreography ─── */
  useEffect(() => {
    choreoTimersRef.current.forEach(id => clearTimeout(id)); choreoTimersRef.current.clear();
    const eyeEl = eyeContainerRef.current;
    if (!eyeEl || status !== "idle") return;
    if (!isHoveredRef.current) eyeEl.className = "orion-eyes-overlay eye-neutral";
    const eyeBehaviors = ["eye-glance-left", "eye-glance-right", "eye-glance-up", "eye-look-away", "eye-micro-dart", "eye-squint-subtle", "eye-blink-slow"];
    const runNext = () => {
      const delay = 3000 + Math.random() * 6000;
      const id = window.setTimeout(() => {
        choreoTimersRef.current.delete(id);
        if (!isHoveredRef.current && Math.random() > 0.4) {
          const cls = eyeBehaviors[Math.floor(Math.random() * eyeBehaviors.length)];
          eyeEl.className = `orion-eyes-overlay ${cls}`;
          const resetId = window.setTimeout(() => {
            choreoTimersRef.current.delete(resetId);
            if (!isHoveredRef.current) eyeEl.className = "orion-eyes-overlay eye-neutral";
          }, 600 + Math.random() * 800);
          choreoTimersRef.current.add(resetId);
        }
        runNext();
      }, delay);
      choreoTimersRef.current.add(id);
    };
    runNext();
    return () => { choreoTimersRef.current.forEach(id => clearTimeout(id)); choreoTimersRef.current.clear(); };
  }, [status]);

  const eyeStatusClass = status === "recording" ? "eye-attentive" :
    status === "thinking" ? "eye-focused" : status === "speaking" ? "eye-wide" :
    (hoverState ? "eye-attentive" : "eye-neutral");

  return (
    <div className={`orion-orb-wrapper status-${status}`} ref={containerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <canvas ref={canvasRef} className="orion-webgl-canvas" />
      <div className={`orion-eyes-overlay ${eyeStatusClass}`} ref={eyeContainerRef}>
        <div className="orion-eye left" />
        <div className="orion-eye right" />
      </div>
    </div>
  );
}
