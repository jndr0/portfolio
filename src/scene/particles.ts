import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import { galaxy, gear, mulberry32, padlock, scatter, sphere } from "./shapes";

const vertex = /* glsl */ `
  attribute vec3 aP0;
  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec3 aStart;
  attribute float aRand;

  uniform float uMorph;
  uniform float uIntro;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uScan;

  varying float vHot;
  varying float vAlpha;

  float stage(float m, float k, float r) {
    // staggered 0..1 per particle so morphs ripple instead of snapping
    float t = clamp((m - k) * 1.5 - r * 0.5, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    float t1 = stage(uMorph, 0.0, aRand);
    float t2 = stage(uMorph, 1.0, aRand);
    float t3 = stage(uMorph, 2.0, aRand);

    vec3 p = mix(aP0, aP1, t1);
    p = mix(p, aP2, t2);
    p = mix(p, aP3, t3);

    // swirl outward mid-transition
    float mid = t1 * (1.0 - t1) + t2 * (1.0 - t2) + t3 * (1.0 - t3);
    float ang = mid * 3.0 * (aRand - 0.5);
    p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
    p *= 1.0 + mid * 0.5 * aRand;

    // intro: fly in from scattered positions
    float intro = clamp(uIntro * 1.4 - aRand * 0.4, 0.0, 1.0);
    intro = 1.0 - pow(1.0 - intro, 3.0);
    p = mix(aStart, p, intro);

    // idle shimmer
    p += 0.012 * vec3(
      sin(uTime * 1.3 + aRand * 40.0),
      cos(uTime * 1.1 + aRand * 31.0),
      sin(uTime * 0.9 + aRand * 17.0)
    );

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // laser scan line in world-ish Y (like a 3D scanner sweeping the object)
    float scan = 1.0 - smoothstep(0.0, 0.07, abs(p.y - uScan));
    vHot = max(scan, step(0.93, aRand));
    vAlpha = 0.45 + 0.55 * aRand;

    gl_PointSize = uSize * uPixelRatio * (0.55 + aRand * 0.9 + scan * 1.2) / -mv.z;
  }
`;

const fragment = /* glsl */ `
  varying float vHot;
  varying float vAlpha;
  uniform float uOpacity;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    vec3 cold = vec3(0.91, 0.91, 0.92);
    vec3 hot = vec3(0.86, 0.23, 0.2);
    vec3 col = mix(cold, hot, vHot);
    gl_FragColor = vec4(col, soft * vAlpha * uOpacity * (0.55 + vHot * 0.6));
  }
`;

export interface ParticleScene {
  uniforms: {
    uMorph: { value: number };
    uIntro: { value: number };
    uOpacity: { value: number };
  };
  /** Shift the cloud sideways (in world units) and scale it. */
  layout: { x: number; y: number; scale: number };
  setStill(still: boolean): void;
}

export function createParticles(canvas: HTMLCanvasElement): ParticleScene | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;

  const small = matchMedia("(max-width: 767px)").matches;
  const count = small ? 9000 : 22000;
  const rand = mulberry32(7);

  const geo = new BufferGeometry();
  const p0 = sphere(count, rand);
  geo.setAttribute("position", new BufferAttribute(p0, 3));
  geo.setAttribute("aP0", new BufferAttribute(p0, 3));
  geo.setAttribute("aP1", new BufferAttribute(padlock(count, rand), 3));
  geo.setAttribute("aP2", new BufferAttribute(gear(count, rand), 3));
  geo.setAttribute("aP3", new BufferAttribute(galaxy(count, rand), 3));
  geo.setAttribute("aStart", new BufferAttribute(scatter(count, rand), 3));
  const r = new Float32Array(count);
  for (let i = 0; i < count; i++) r[i] = rand();
  geo.setAttribute("aRand", new BufferAttribute(r, 1));

  const uniforms = {
    uMorph: { value: 0 },
    uIntro: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: small ? 24 : 30 },
    uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    uScan: { value: 0 },
    uOpacity: { value: 1 },
  };

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geo, material);
  points.frustumCulled = false;
  const scene = new Scene();
  scene.add(points);

  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  const layout = { x: 0, y: 0, scale: 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let still = false;

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the cloud a similar size on narrow screens
    camera.position.z = w < h ? 7 + (h / w - 1) * 3.2 : 7;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);
  addEventListener(
    "pointermove",
    (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );

  let last = performance.now();
  let spin = 0;
  let visible = true;
  document.addEventListener("visibilitychange", () => (visible = !document.hidden));

  function frame(now: number) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!still) {
      uniforms.uTime.value += dt;
      spin += dt * 0.12;
    }
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    points.rotation.y = spin + pointer.x * 0.35;
    points.rotation.x = pointer.y * 0.2;
    points.position.set(layout.x, layout.y, 0);
    points.scale.setScalar(layout.scale);

    // scanner sweeps top to bottom every ~4s
    const s = (uniforms.uTime.value * 0.25) % 1;
    uniforms.uScan.value = 2.2 - s * 4.4;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    uniforms,
    layout,
    setStill(v: boolean) {
      still = v;
    },
  };
}
