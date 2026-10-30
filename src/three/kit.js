// Shared 3D toolkit: noise, materials, organic geometry, model/part registry.
import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- deterministic value noise ---------- */
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w);
}
export function fbm(x, y, z, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2; a *= 0.5; }
  return s;
}
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ---------- textures ---------- */
let _bump = null;
export function bumpTex() {
  if (_bump) return _bump;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const v = fbm(x / 22, y / 22, 3.1, 5) * 0.8 + noise3(x / 4, y / 4, 9) * 0.2;
    const i = (y * n + x) * 4; const b = Math.floor(v * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  _bump = new THREE.CanvasTexture(c); _bump.wrapS = _bump.wrapT = THREE.RepeatWrapping; _bump.repeat.set(3, 3);
  return _bump;
}
export function textSprite(text, { size = 0.5, color = '#ffffff', bg = 'rgba(5,7,13,0.0)', font = '700 64px Manrope, system-ui, sans-serif' } = {}) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(size * 2, size, 1); s.renderOrder = 10; return s;
}

/* ---------- materials ---------- */
export function M(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial(Object.assign({
    color, roughness: 0.42, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.35,
    sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.5),
  }, o));
  return m;
}
export const organicMat = (color, o = {}) => M(color, Object.assign({ bumpMap: bumpTex(), bumpScale: 1.2, roughness: 0.5 }, o));
export const glass = (color, op = 0.22, o = {}) => M(color, Object.assign({ transparent: true, opacity: op, roughness: 0.15, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }, o));
export const glow = (color, k = 1.4, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 }, o));

/* ---------- geometry ---------- */
export function displace(geo, fn) {
  const p = geo.attributes.position, nrm = geo.attributes.normal;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); n.fromBufferAttribute(nrm, i);
    const d = fn(v.x, v.y, v.z, n);
    p.setXYZ(i, v.x + n.x * d, v.y + n.y * d, v.z + n.z * d);
  }
  geo.computeVertexNormals(); return geo;
}
/** Organic blob: noisy ellipsoid mesh. */
export function blob(r, material, { s = [1, 1, 1], amp = 0.08, freq = 1.6, seed = 0, seg = 48, oct = 3 } = {}) {
  const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
  displace(g, (x, y, z) => (fbm(x * freq + seed, y * freq + seed * 1.7, z * freq - seed, oct) - 0.5) * 2 * amp * r);
  const m = new THREE.Mesh(g, material); m.scale.set(s[0], s[1], s[2]); return m;
}
export function tubeAlong(points, r, material, { seg, closed = false, radial = 14, taper = null } = {}) {
  const curve = points instanceof THREE.Curve ? points : new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.5);
  const g = new THREE.TubeGeometry(curve, seg || Math.max(24, Math.round(curve.getLength() * 28)), r, radial, closed);
  if (taper) { // taper(t)->radius multiplier using uv.x
    const p = g.attributes.position, uv = g.attributes.uv, c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = uv.getX(i), k = taper(t); c.copy(curve.getPointAt(t));
      p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k);
    }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, material); m.userData.curve = curve; return m;
}
const UP = new THREE.Vector3(0, 1, 0);
export function setCyl(m, a, b) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  m.position.addVectors(a, b).multiplyScalar(0.5); m.scale.set(m.userData.r || 1, Math.max(len, 1e-4), m.userData.r || 1);
  if (len > 1e-6) m.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
}
export function cyl(a, b, r, material, radial = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, radial), material); m.userData.r = r; setCyl(m, a, b); return m;
}
export function sphere(r, material, x = 0, y = 0, z = 0, seg = 28) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), material); m.position.set(x, y, z); return m;
}
export function capsule(r, len, material, seg = 12) {
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, seg), material);
}
export function group(...kids) { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; }

/* ---------- model registry ---------- */
export function createModel(meta = {}) {
  const group = new THREE.Group();
  const model = {
    group, parts: [], params: [], meta, mode: meta.mode, sliceable: !!meta.sliceable,
    update: null, onParam: null, hud: null, dispose() {
      group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    },
    add(obj) { group.add(obj); return obj; },
    part(id, name, info, obj, opt = {}) {
      obj.traverse((o) => { if (o.isMesh) o.userData.part = id; });
      const mats = new Set();
      obj.traverse((o) => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m)); });
      const p = { id, name, info, obj, base: obj.position.clone(), baseScale: obj.scale.clone(), explode: opt.explode || V(), mode: opt.mode, mats: [...mats], tag: opt.tag, back: !!opt.back, spread: opt.spread || 0 };
      if (!obj.parent) group.add(obj);
      model.parts.push(p); return p;
    },
    param(def) { model.params.push(def); return def; },
  };
  return model;
}
