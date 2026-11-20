// Point-cloud generators. Each returns `count * 3` floats centred on the origin,
// roughly fitting a sphere of radius ~1.8 so morphs between them stay framed.

type Rand = () => number;

/** Small deterministic PRNG so every load draws the same shapes. */
export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rotateX(out: Float32Array, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  for (let i = 0; i < out.length; i += 3) {
    const y = out[i + 1];
    const z = out[i + 2];
    out[i + 1] = y * c - z * s;
    out[i + 2] = y * s + z * c;
  }
}

/** Globe: Fibonacci sphere plus a few latitude rings, like a network map. */
export function sphere(count: number, rand: Rand): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const surface = Math.floor(count * 0.78);
  for (let i = 0; i < count; i++) {
    let x: number, y: number, z: number;
    if (i < surface) {
      y = 1 - (i / (surface - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      x = Math.cos(t) * r;
      z = Math.sin(t) * r;
    } else {
      // rings
      const ring = Math.floor(rand() * 5);
      const lat = (ring - 2) * 0.42;
      const t = rand() * Math.PI * 2;
      const r = Math.cos(lat);
      x = Math.cos(t) * r;
      y = Math.sin(lat);
      z = Math.sin(t) * r;
    }
    const radius = 1.55 + (rand() - 0.5) * 0.04;
    out[i * 3] = x * radius;
    out[i * 3 + 1] = y * radius;
    out[i * 3 + 2] = z * radius;
  }
  return out;
}

/** Padlock: box body with a keyhole and a torus shackle. */
export function padlock(count: number, rand: Rand): Float32Array {
  const out = new Float32Array(count * 3);
  const W = 1.5, H = 1.15, D = 0.5;
  const bodyY = -0.45;
  const shackleR = 0.52, tube = 0.1, shackleY = 0.12 + bodyY + H / 2;
  const legLen = 0.32;
  const bodyN = Math.floor(count * 0.62);
  const keyN = Math.floor(count * 0.06);
  // face areas for weighted sampling
  const faces = [W * H, W * H, D * H, D * H, W * D, W * D];
  const total = faces.reduce((a, b) => a + b, 0);

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;
    if (i < bodyN) {
      let pick = rand() * total;
      let f = 0;
      while (pick > faces[f]) pick -= faces[f++];
      const u = rand() - 0.5, v = rand() - 0.5;
      switch (f) {
        case 0: x = u * W; y = v * H; z = D / 2; break;
        case 1: x = u * W; y = v * H; z = -D / 2; break;
        case 2: x = W / 2; y = v * H; z = u * D; break;
        case 3: x = -W / 2; y = v * H; z = u * D; break;
        case 4: x = u * W; y = H / 2; z = v * D; break;
        default: x = u * W; y = -H / 2; z = v * D;
      }
      y += bodyY;
    } else if (i < bodyN + keyN) {
      // keyhole: circle + slot on the front face
      if (rand() < 0.6) {
        const t = rand() * Math.PI * 2;
        x = Math.cos(t) * 0.13;
        y = Math.sin(t) * 0.13 + bodyY + 0.1;
      } else {
        x = (rand() - 0.5) * 0.08;
        y = bodyY + 0.05 - rand() * 0.3;
      }
      z = D / 2 + 0.01;
    } else {
      // shackle: half torus on top + two legs into the body
      const tubeA = rand() * Math.PI * 2;
      const tr = tube * Math.cos(tubeA);
      const tz = tube * Math.sin(tubeA);
      if (rand() < 0.72) {
        const a = rand() * Math.PI;
        x = Math.cos(a) * (shackleR + tr);
        y = Math.sin(a) * (shackleR + tr) + shackleY;
        z = tz;
      } else {
        const side = rand() < 0.5 ? -1 : 1;
        x = side * shackleR + tr;
        y = shackleY - rand() * legLen;
        z = tz;
      }
    }
    out[i * 3] = x * 1.25;
    out[i * 3 + 1] = (y + 0.2) * 1.25;
    out[i * 3 + 2] = z * 1.25;
  }
  rotateX(out, -0.18);
  return out;
}

/** Engine gear: an extruded gear with a hub, as if 3D-scanned. */
export function gear(count: number, rand: Rand): Float32Array {
  const out = new Float32Array(count * 3);
  const teeth = 14;
  const outer = 1.5, root = 1.28, hole = 0.42, thick = 0.42;
  const profile = (t: number) => {
    const s = Math.sin(teeth * t);
    return s > 0.15 ? outer : s < -0.15 ? root : root + ((s + 0.15) / 0.3) * (outer - root);
  };
  for (let i = 0; i < count; i++) {
    const t = rand() * Math.PI * 2;
    const pick = rand();
    let r: number, z: number;
    if (pick < 0.55) {
      // front/back faces
      const edge = profile(t);
      r = Math.sqrt(hole * hole + rand() * (edge * edge - hole * hole));
      z = rand() < 0.5 ? thick / 2 : -thick / 2;
    } else if (pick < 0.88) {
      // outer rim
      r = profile(t);
      z = (rand() - 0.5) * thick;
    } else {
      // hole wall
      r = hole;
      z = (rand() - 0.5) * thick;
    }
    out[i * 3] = Math.cos(t) * r;
    out[i * 3 + 1] = Math.sin(t) * r;
    out[i * 3 + 2] = z;
  }
  rotateX(out, -0.9);
  return out;
}

/** Spiral galaxy: three arms on a tilted disc. */
export function galaxy(count: number, rand: Rand): Float32Array {
  const out = new Float32Array(count * 3);
  const arms = 3;
  for (let i = 0; i < count; i++) {
    const r = Math.pow(rand(), 0.7) * 2.6;
    const arm = (i % arms) / arms * Math.PI * 2;
    const spin = r * 2.1;
    const spread = Math.pow(rand(), 3) * (rand() < 0.5 ? 1 : -1) * 0.5 * (r + 0.2);
    const a = arm + spin + spread;
    out[i * 3] = Math.cos(a) * r + (rand() - 0.5) * 0.12;
    out[i * 3 + 1] = (rand() - 0.5) * 0.18 * (1.4 - r / 2.6);
    out[i * 3 + 2] = Math.sin(a) * r + (rand() - 0.5) * 0.12;
  }
  rotateX(out, 0.55);
  return out;
}

/** Scattered start positions for the intro. */
export function scatter(count: number, rand: Rand): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 4 + rand() * 6;
    const t = rand() * Math.PI * 2;
    const p = Math.acos(2 * rand() - 1);
    out[i * 3] = r * Math.sin(p) * Math.cos(t);
    out[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    out[i * 3 + 2] = r * Math.cos(p);
  }
  return out;
}
