import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createModel, organicMat, M, glow, glass, blob, tubeAlong, sphere, cyl, setCyl, V, fbm, noise3, smooth, clamp, lerp, mulberry, TAU } from '../kit.js';

/* ---------- shared organelle builders ---------- */
function mito(len = 0.9, rad = 0.26, seed = 1) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 10, 20), glass(0xff9a52, 0.38, { roughness: 0.25 }));
  const innerM = organicMat(0xd9582a, { roughness: 0.4 });
  const pts = []; const n = 9;
  for (let i = 0; i <= n; i++) { const x = -len * 0.5 + (len * i) / n; pts.push(V(x, ((i % 2) ? 1 : -1) * rad * 0.55, 0)); }
  const cr = tubeAlong(pts, rad * 0.16, innerM, { radial: 8, seg: 40 }); const cr2 = cr.clone(); cr2.rotation.x = Math.PI / 2;
  outer.rotation.z = Math.PI / 2; const inner = new THREE.Group(); inner.add(cr, cr2); g.add(outer, inner); return g;
}
function golgi(r = 0.7) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * (1 - i * 0.07), 32, 12, 0, TAU, 0, 0.55), organicMat(i % 2 ? 0xf7c85a : 0xf0a93c, { side: THREE.DoubleSide }));
    cap.scale.y = 0.45; cap.position.y = i * 0.11; g.add(cap);
  }
  const rnd = mulberry(5);
  for (let i = 0; i < 7; i++) g.add(sphere(0.06, M(0xffdf8a), (rnd() - 0.5) * r * 2, 0.15 + rnd() * 0.5, (rnd() - 0.5) * r * 1.4, 10));
  return g;
}
function ribosomes(count, rmin, rmax, seed, color = 0xf4f1ea, size = 0.045, avoid = null) {
  const rnd = mulberry(seed), im = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), M(color, { roughness: 0.6 }), count), o = new THREE.Object3D();
  let k = 0, tries = 0;
  while (k < count && tries++ < count * 20) {
    const r = rmin + Math.cbrt(rnd()) * (rmax - rmin), th = rnd() * TAU, ph = Math.acos(2 * rnd() - 1);
    const p = V(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
    if (avoid && avoid(p)) continue; o.position.copy(p); o.updateMatrix(); im.setMatrixAt(k++, o.matrix);
  }
  im.count = k; im.instanceMatrix.needsUpdate = true; return im;
}
function nucleus(r = 0.95, seed = 3) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 48, 34), glass(0xb58cff, 0.3, { roughness: 0.2 })));
  const pores = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), M(0x2a1650), 60), o = new THREE.Object3D(), rnd = mulberry(seed);
  for (let i = 0; i < 60; i++) { const th = rnd() * TAU, ph = Math.acos(2 * rnd() - 1); o.position.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(r * 1.0); o.updateMatrix(); pores.setMatrixAt(i, o.matrix); }
  g.add(pores);
  const chroma = organicMat(0x6b3fc4, { roughness: 0.5 });
  for (let i = 0; i < 9; i++) { const pts = []; for (let k = 0; k < 8; k++) { const a = rnd() * TAU, b = Math.acos(2 * rnd() - 1), rr = r * 0.7 * Math.cbrt(rnd()); pts.push(V(rr * Math.sin(b) * Math.cos(a), rr * Math.cos(b), rr * Math.sin(b) * Math.sin(a))); } g.add(tubeAlong(pts, 0.03, chroma, { radial: 6, seg: 40 })); }
  g.add(sphere(r * 0.3, organicMat(0x3b1d82), r * 0.15, r * 0.1, r * 0.2, 20));
  return g;
}
function rerShells(r, count = 4, color = 0x5fb7e8) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(r + 0.13 + i * 0.13, 40, 20, 0.3 + i * 0.2, 2.6 - i * 0.2, 0.5 + i * 0.05, 2.0), organicMat(color, { side: THREE.DoubleSide, roughness: 0.5 }));
    g.add(sh);
  }
  return g;
}
function centriolePair() {
  const g = new THREE.Group(), mat = M(0x62d4a8);
  const one = () => { const c = new THREE.Group(); for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), mat); m.position.set(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1); c.add(m); } return c; };
  const a = one(), b = one(); b.rotation.z = Math.PI / 2; b.position.set(0.0, 0.0, 0.3); g.add(a, b); return g;
}
function lysosomes(n, area, seed) {
  const g = new THREE.Group(), rnd = mulberry(seed);
  for (let i = 0; i < n; i++) { const s = sphere(0.15, organicMat(0xc9e86a), (rnd() - 0.5) * area[0], (rnd() - 0.5) * area[1], (rnd() - 0.5) * area[2], 18); for (let k = 0; k < 4; k++) s.add(sphere(0.04, M(0x60781f), (rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.14, (rnd() - 0.5) * 0.14, 8)); g.add(s); }
  return g;
}
function ser(color, seed, R) {
  const g = new THREE.Group(), rnd = mulberry(seed);
  for (let i = 0; i < 5; i++) { const pts = []; const a0 = rnd() * TAU, b0 = rnd() * Math.PI; for (let k = 0; k < 7; k++) { pts.push(V(Math.sin(b0 + k * 0.15) * Math.cos(a0 + k * 0.35) * R, Math.cos(b0 + k * 0.15) * R * 0.9, Math.sin(b0 + k * 0.15) * Math.sin(a0 + k * 0.35) * R)); } g.add(tubeAlong(pts, 0.065, organicMat(color), { radial: 8, seg: 36 })); }
  return g;
}
function drift(list, t, amp = 0.06) { list.forEach((o, i) => { o.position.x = o.userData.p0.x + Math.sin(t * 0.6 + i * 1.7) * amp; o.position.y = o.userData.p0.y + Math.cos(t * 0.5 + i * 2.3) * amp; o.rotation.z += 0.002 * (i % 2 ? 1 : -1); }); }
const keep = (o) => { o.userData.p0 = o.position.clone(); return o; };

/* ================= ANIMAL CELL ================= */
export function animalCell() {
  const m = createModel({ view: [0.3, 0.25, 1], zoom: 0.9, explodeScale: 1.0, sliceable: true, sliceAxis: 'x', autoRotate: true });
  const R = 3;
  const mem = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), glass(0x8fe0ff, 0.15, { roughness: 0.12 }));
  m.part('membrane', 'Plasma membrane', 'A thin, flexible, selectively permeable layer of lipids and proteins. Controls what enters and leaves the cell.', mem, { back: true });
  const cyto = new THREE.Mesh(new THREE.SphereGeometry(R - 0.05, 40, 30), glass(0x58b9a8, 0.05, { side: THREE.BackSide }));
  m.part('cyto', 'Cytoplasm', 'The jelly-like fluid inside the cell where organelles float and many chemical reactions occur.', cyto, { back: true });
  const nuc = nucleus(0.95); nuc.position.set(0.15, 0.1, 0); m.part('nucleus', 'Nucleus', 'Control centre. Contains DNA as chromatin and a nucleolus that makes ribosomes. Surrounded by a double nuclear membrane with pores.', nuc, { explode: V(0.3, 0.6, 0.4) });
  const mg = new THREE.Group(); [[1.5, 0.8, 0.9, 0.6], [-1.6, -0.5, 1.2, -0.4], [0.7, -1.7, -0.9, 0.9], [-1.1, 1.2, -1.3, 0.2], [1.7, -0.6, -1.2, 1.2]].forEach((a, i) => { const x = mito(0.9, 0.26); x.position.set(a[0], a[1], a[2]); x.rotation.set(a[3], i, a[3] * 0.5); mg.add(keep(x)); });
  m.part('mito', 'Mitochondria', 'The powerhouse of the cell. Release energy from glucose as ATP by cellular respiration. Have their own DNA and folded inner membrane (cristae).', mg, { spread: 1.1 });
  const rer = rerShells(0.95); rer.position.copy(nuc.position); m.part('rer', 'Rough ER', 'Membrane sheets studded with ribosomes. Make and fold proteins. Connected to the nuclear membrane.', rer, { explode: V(-0.4, 0.3, 0.6) });
  const se = ser(0x5fe0c0, 4, 2.0); se.position.set(-0.3, -0.4, -0.2); m.part('ser', 'Smooth ER', 'Network of tubes without ribosomes. Makes lipids and steroids and detoxifies poisons.', se, { explode: V(-0.8, -0.4, -0.6) });
  const gg = golgi(0.75); gg.position.set(-1.7, -1.0, 0.6); gg.rotation.z = 0.7; m.part('golgi', 'Golgi apparatus', 'Stacked flattened sacs that modify, sort and package proteins and lipids into vesicles for secretion.', gg, { explode: V(-1.0, -0.8, 0.5) });
  const ly = lysosomes(5, [4.2, 3.4, 4.2], 9); ly.children.forEach(keep); m.part('lyso', 'Lysosomes', 'Sacs of digestive enzymes. Break down worn-out organelles, food and germs. Called suicide bags.', ly, { spread: 1.0 });
  const ce = centriolePair(); ce.position.set(1.0, 1.55, -0.8); m.part('centro', 'Centrioles', 'Pair of cylinders (9 microtubule triplets). Help form the spindle during animal cell division.', ce, { explode: V(0.6, 1.0, -0.5) });
  const ri = ribosomes(190, 1.2, 2.7, 11, 0xf6e9d4, 0.05, (p) => p.distanceTo(V(0.15, 0.1, 0)) < 1.3); m.part('ribo', 'Ribosomes', 'Tiny granules of RNA and protein, found free in the cytoplasm or on rough ER. Make proteins.', ri, { spread: 0.5 });
  const va = new THREE.Group(); [[1.2, 1.8, 0.8], [-2.0, 0.6, -1.0]].forEach((p) => va.add(keep(sphere(0.28, glass(0xbfe6ff, 0.5), p[0], p[1], p[2], 24)))); m.part('vac', 'Vacuoles', 'Small, temporary storage sacs in animal cells (large and permanent in plant cells).', va, { spread: 0.8 });
  const dm = [mg, ly];
  m.update = (P, t) => { dm.forEach((g, gi) => { g.children.forEach((c, i) => { if (!c.userData.p0) return; }); }); mg.children.forEach((c, i) => { c.rotation.y += 0.002; }); };
  m.hud = () => ({ title: 'Animal cell', lines: ['Cut the model open with the slice slider to see inside.'] });
  return m;
}

/* ================= PLANT CELL ================= */
export function plantCell() {
  const m = createModel({ view: [0.4, 0.4, 1], zoom: 0.95, explodeScale: 1.0, sliceable: true, sliceAxis: 'z', autoRotate: true });
  const W = [6.2, 4.0, 4.0];
  const wall = new THREE.Mesh(new RoundedBoxGeometry(W[0], W[1], W[2], 8, 0.5), glass(0x9be07a, 0.2, { roughness: 0.3 }));
  m.part('wall', 'Cell wall', 'Rigid outer layer made of cellulose. Gives shape, support and protection. Present only in plant cells (not animal cells).', wall, { back: true });
  const mem = new THREE.Mesh(new RoundedBoxGeometry(W[0] - 0.22, W[1] - 0.22, W[2] - 0.22, 8, 0.42), glass(0x8fe0ff, 0.12, { roughness: 0.15 }));
  m.part('membrane', 'Plasma membrane', 'Lies just inside the cell wall. Controls the movement of substances in and out.', mem, { back: true });
  const vac = new THREE.Mesh(new RoundedBoxGeometry(2.7, 2.2, 2.4, 6, 0.9), glass(0x6fb4ff, 0.42, { roughness: 0.2, clearcoat: 1 }));
  vac.position.set(0.9, -0.1, 0); m.part('vacuole', 'Large central vacuole', 'Fluid-filled sac that can take up 90% of the cell. Stores water and nutrients, and keeps the cell firm (turgor pressure).', vac, { explode: V(0.7, -0.3, 0) });
  const nuc = nucleus(0.7, 5); nuc.position.set(-2.1, 0.55, 0.3); m.part('nucleus', 'Nucleus', 'Contains DNA and controls all cell activities. Pushed to one side by the large vacuole.', nuc, { explode: V(-0.9, 0.5, 0.4) });
  const cg = new THREE.Group(); const rnd = mulberry(21);
  const spots = [[-0.8, 1.45, 1.1], [0.4, 1.5, -1.0], [2.0, 1.2, 0.9], [-0.9, -1.4, 0.9], [0.6, -1.5, -1.0], [2.2, -1.2, 0.6], [-2.5, -0.9, -0.8], [-2.6, -0.4, 1.2]];
  spots.forEach((p, i) => { const c = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 20), organicMat(0x3fa34d, { clearcoat: 0.6 })); body.scale.set(1.35, 0.7, 0.8); c.add(body);
    for (let k = 0; k < 3; k++) { const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), organicMat(0x1f7a35)); gr.position.set(-0.2 + k * 0.2, 0, 0); gr.rotation.x = Math.PI / 2; c.add(gr); }
    c.position.set(p[0], p[1], p[2]); c.rotation.set(rnd(), rnd(), rnd()); cg.add(keep(c)); });
  m.part('chloro', 'Chloroplasts', 'Disc-shaped organelles with the green pigment chlorophyll. Carry out photosynthesis. Have their own DNA. Only in plant cells.', cg, { spread: 0.9 });
  const mg = new THREE.Group(); [[-1.2, 0.2, -1.4], [1.9, 0.3, 1.2], [-2.6, -1.4, 0.3]].forEach((a, i) => { const x = mito(0.6, 0.18); x.position.set(...a); x.rotation.set(i, i * 2, 0); mg.add(keep(x)); });
  m.part('mito', 'Mitochondria', 'Release energy as ATP through respiration, in plant cells as well as animal cells.', mg, { spread: 0.9 });
  const gg = golgi(0.5); gg.position.set(-0.4, 0.2, 1.3); gg.rotation.z = 0.3; m.part('golgi', 'Golgi apparatus', 'Packages proteins and builds cell wall materials for transport in vesicles.', gg, { explode: V(-0.2, 0.4, 0.9) });
  const rer = rerShells(0.7, 3); rer.position.copy(nuc.position); m.part('er', 'Endoplasmic reticulum', 'Network of membranes that makes and transports proteins and lipids.', rer, { explode: V(-0.5, 0.2, 0.7) });
  const ri = ribosomes(150, 0.2, 3.0, 17, 0xf6e9d4, 0.05, (p) => Math.abs(p.x) > 2.9 || Math.abs(p.y) > 1.85 || Math.abs(p.z) > 1.85 || (Math.abs(p.x - 0.9) < 1.5 && Math.abs(p.y) < 1.2 && Math.abs(p.z) < 1.3)); m.part('ribo', 'Ribosomes', 'Make proteins. Found free or on the rough ER.', ri, { spread: 0.4 });
  const pl = new THREE.Group(); [[3.0, 0.5, 0.5], [3.0, -0.6, -0.7]].forEach((p) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 12), M(0xf3ffd0)); t.rotation.z = Math.PI / 2; t.position.set(...p); pl.add(keep(t)); });
  m.part('plasmo', 'Plasmodesmata', 'Tiny channels through the cell wall that connect neighbouring plant cells.', pl, { explode: V(1.0, 0, 0) });
  m.hud = () => ({ title: 'Plant cell', lines: ['Compare: only plant cells have a cell wall, chloroplasts and a large central vacuole.'] });
  return m;
}

/* ================= CHLOROPLAST ================= */
export function chloroplast() {
  const m = createModel({ view: [0.25, 0.45, 1], zoom: 0.95, explodeScale: 1.0, sliceable: true, sliceAxis: 'z', autoRotate: true });
  const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), glass(0x5ee08a, 0.22, { roughness: 0.18 })); outer.scale.set(3.6, 2.0, 2.0);
  m.part('outer', 'Outer membrane', 'Smooth outer boundary of the chloroplast. Permeable to small molecules.', outer, { back: true });
  const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 36), glass(0x2fbf6a, 0.2, { roughness: 0.18 })); inner.scale.set(3.45, 1.88, 1.88);
  m.part('inner', 'Inner membrane', 'Controls what enters and leaves the stroma.', inner, { back: true });
  const stroma = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), glass(0x7fe3a0, 0.08, { side: THREE.BackSide })); stroma.scale.set(3.4, 1.82, 1.82);
  m.part('stroma', 'Stroma', 'Fluid-filled space around the grana. The dark reaction (Calvin cycle) happens here, making sugar.', stroma, { back: true });
  const gr = new THREE.Group(), th = M(0x1e8f43, { clearcoat: 0.5, roughness: 0.4 }); const rnd = mulberry(4); const spots = [];
  for (let i = 0; i < 12; i++) { const x = -2.4 + (i % 6) * 0.95, z = i < 6 ? -0.65 : 0.65, y = (rnd() - 0.5) * 0.7; spots.push(V(x, y, z + (rnd() - 0.5) * 0.3)); }
  spots.forEach((p) => { const g = new THREE.Group(); for (let k = 0; k < 7; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 24), organicMat(k % 2 ? 0x1e8f43 : 0x27a653)); d.position.y = (k - 3) * 0.1; g.add(d); } g.position.copy(p); g.rotation.z = (rnd() - 0.5) * 0.4; gr.add(keep(g)); });
  m.part('grana', 'Grana (thylakoid stacks)', 'Stacks of flat sacs (thylakoids) containing chlorophyll. The light reaction occurs here: light splits water, releasing O₂ and making ATP and NADPH.', gr, { spread: 0.5 });
  const la = new THREE.Group();
  for (let i = 0; i < spots.length - 1; i++) if (i !== 5) la.add(tubeAlong([spots[i], spots[i].clone().lerp(spots[i + 1], 0.5).add(V(0, 0.18, 0)), spots[i + 1]], 0.035, M(0x39c06a), { radial: 6, seg: 12 }));
  m.part('lamellae', 'Stroma lamellae', 'Thylakoid membranes that connect one granum to another.', la, { explode: V(0, 0.4, 0) });
  const st = new THREE.Group(); [[1.4, -0.9, 0.2], [-1.0, 0.85, -0.2], [2.2, 0.7, -0.5]].forEach((p) => st.add(keep(sphere(0.22, M(0xf5f1e6, { roughness: 0.7 }), p[0], p[1], p[2], 18)))); m.part('starch', 'Starch granule', 'Stored sugar made by photosynthesis.', st, { spread: 0.7 });
  const dna = new THREE.Group(); [[-2.9, 0.1, 0.2], [2.8, -0.2, 0.1]].forEach((p) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 24), M(0xffd479, { emissive: 0x6a4a00, emissiveIntensity: 0.4 })); t.position.set(...p); t.rotation.x = 1; dna.add(keep(t)); });
  dna.add(ribosomes(40, 0.2, 2.4, 6, 0xe9f7ee, 0.04, (p) => Math.abs(p.x) > 3 || Math.abs(p.y) > 1.5 || Math.abs(p.z) > 1.5));
  m.part('dna', 'Chloroplast DNA & ribosomes', 'Chloroplasts have their own circular DNA and ribosomes, so they can make some of their own proteins.', dna, { spread: 0.4 });
  // particles: photons, O2, ATP, CO2
  const mk = (col, n, s) => { const im = new THREE.InstancedMesh(new THREE.SphereGeometry(s, 10, 8), glow(col, 2.4), n); m.group.add(im); return im; };
  const NP = 40, photons = mk(0xfff29a, NP, 0.07), o2 = mk(0x9fe9ff, 30, 0.08), atp = mk(0xffa24a, 30, 0.06), co2 = mk(0xb9b9c9, 24, 0.07);
  const d = new THREE.Object3D(), r2 = mulberry(8);
  const rp = Array.from({ length: NP }, () => ({ s: spots[Math.floor(r2() * spots.length)], o: r2(), x: (r2() - 0.5) * 2 }));
  m.param({ id: 'light', label: 'Light intensity', type: 'range', min: 0, max: 100, step: 5, value: 70, unit: '%' });
  m.param({ id: 'co2', label: 'CO₂ available', type: 'range', min: 0, max: 100, step: 5, value: 60, unit: '%' });
  const place = (im, n, f) => { for (let i = 0; i < im.count; i++) { f(i, d); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } im.instanceMatrix.needsUpdate = true; };
  m.update = (P, t) => {
    const L = P.light / 100, C = P.co2 / 100, rate = L * Math.min(1, C * 1.4);
    photons.count = Math.round(NP * L); place(photons, NP, (i, o) => { const q = rp[i], u = (t * 0.5 + q.o) % 1; o.position.set(q.s.x - 1.6 * (1 - u) + q.x * 0.1, q.s.y + 3.6 * (1 - u), q.s.z + 0.3 * (1 - u)); o.scale.setScalar(1); });
    o2.count = Math.round(30 * rate); place(o2, 30, (i, o) => { const q = rp[i % NP], u = (t * 0.25 + q.o) % 1; o.position.set(q.s.x + Math.sin(u * 6 + i) * 0.15, q.s.y + u * 3.0, q.s.z + u * 1.0); o.scale.setScalar(0.5 + u); });
    atp.count = Math.round(30 * rate); place(atp, 30, (i, o) => { const q = rp[i % NP], u = (t * 0.3 + q.o) % 1; o.position.set(q.s.x + (i % 3 - 1) * u * 0.9, q.s.y - u * 1.1, q.s.z + (i % 2 ? 1 : -1) * u * 0.5); o.scale.setScalar(1 - u * 0.4); });
    co2.count = Math.round(24 * C); place(co2, 24, (i, o) => { const u = (t * 0.2 + i / 24) % 1, a = (i / 24) * TAU; o.position.set(Math.cos(a) * (4.4 - u * 3.0), -2.6 + u * 1.5 + Math.sin(a * 3) * 0.2, Math.sin(a) * (2.4 - u * 1.5)); o.scale.setScalar(1); });
    gr.children.forEach((g) => g.children.forEach((dd) => { dd.material.emissiveIntensity = 0.05 + L * 0.35; }));
  };
  m.hud = (P) => ({ title: 'Photosynthesis', lines: ['6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂', `Rate ≈ ${Math.round((P.light / 100) * Math.min(1, (P.co2 / 100) * 1.4) * 100)}% of maximum`] });
  return m;
}

/* ================= MITOSIS ================= */
const PHASES = [
  ['Interphase', 'DNA is copied (S phase). Chromatin is loose and spread inside the nucleus. The cell grows.'],
  ['Prophase', 'Chromatin condenses into visible chromosomes, each made of two sister chromatids. Centrosomes move to opposite poles.'],
  ['Metaphase', 'Nuclear envelope has broken down. Chromosomes line up on the metaphase plate, attached to spindle fibres.'],
  ['Anaphase', 'Centromeres split. Sister chromatids are pulled to opposite poles by the shortening spindle fibres.'],
  ['Telophase', 'Chromosomes reach the poles and uncoil. Nuclear envelopes re-form around each set.'],
  ['Cytokinesis', 'The cytoplasm divides, giving two genetically identical daughter cells.'],
];
export function mitosis() {
  const m = createModel({ view: [0.9, 0.25, 0.8], zoom: 0.9, explodeScale: 0.8, sliceable: false });
  const memG = new THREE.Group(), parent = new THREE.Mesh(new THREE.SphereGeometry(2.6, 56, 40), glass(0x8fe0ff, 0.14, { roughness: 0.12 }));
  const dau = [0, 1].map((i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(1.35, 40, 28), glass(0x8fe0ff, 0.14, { roughness: 0.12 })); s.position.z = i ? -1.4 : 1.4; return s; });
  memG.add(parent, ...dau);
  m.part('cell', 'Cell membrane / daughter cells', 'The cell divides by cytokinesis into two identical daughter cells (animal cells pinch in; plant cells build a cell plate).', memG, { back: true });
  const envG = new THREE.Group(), env0 = new THREE.Mesh(new THREE.SphereGeometry(1.25, 40, 28), glass(0xb58cff, 0.26)), envs = [0, 1].map((i) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 22), glass(0xb58cff, 0.0)); s.position.z = i ? -1.45 : 1.45; return s; });
  envG.add(env0, ...envs); m.part('env', 'Nuclear envelope', 'Double membrane around the DNA. Breaks down in prophase and re-forms around each set of chromosomes in telophase.', envG);
  const cols = [0x4c9be8, 0xe85a6e, 0x58d68d, 0xf5b041], lens = [1.15, 1.15, 0.75, 0.75];
  const chromG = new THREE.Group(), chrom = []; const rnd = mulberry(12);
  const plate = [V(-0.55, 0.35, 0), V(0.5, 0.45, 0), V(-0.45, -0.4, 0), V(0.5, -0.35, 0)].map((v) => v.multiplyScalar(1.1));
  for (let i = 0; i < 4; i++) {
    const pair = [0, 1].map(() => { const mm = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 8, 14), organicMat(cols[i], { emissive: cols[i], emissiveIntensity: 0.12 })); chromG.add(mm); return mm; });
    const cen = sphere(0.1, M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.3 }), 0, 0, 0, 12); chromG.add(cen);
    const tang = V((rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.2);
    chrom.push({ pair, cen, tang, rot: rnd() * 3 });
  }
  m.part('chrom', 'Chromosomes', 'Condensed DNA. Each duplicated chromosome has two identical sister chromatids joined at the centromere. Human cells have 46.', chromG);
  const spG = new THREE.Group(), fib = [], fm = M(0xdce8ff, { emissive: 0x6ea0ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 8; i++) { const c = cyl(V(), V(0, 0, 1), 0.012, fm, 6); spG.add(c); fib.push(c); }
  m.part('spindle', 'Spindle fibres', 'Microtubules that attach to the centromeres and pull chromosomes apart.', spG);
  const csG = new THREE.Group(), cs = [0, 1].map(() => { const c = centriolePair(); c.scale.setScalar(0.9); csG.add(c); return c; });
  m.part('centro', 'Centrosomes', 'Organise the spindle. Each moves to one pole of the cell in prophase.', csG);
  const fur = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 10, 48), M(0xff8aa8, { emissive: 0x802040, emissiveIntensity: 0.4 })); fur.rotation.x = 0; m.part('furrow', 'Cleavage furrow', 'The ring of contracting fibres that pinches the animal cell into two.', fur);
  m.param({ id: 'stage', label: 'Phase of division', type: 'range', min: 0, max: 5, step: 0.01, value: 1.2, unit: '' });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false });
  m.autoParams = ['stage'];
  const P0 = m;
  m.update = (P, t, dt) => {
    let s = P.stage; if (P.play) { s = (s + dt * 0.18) % 5.0; P.stage = s; }
    const cond = smooth(0, 1.1, s) - smooth(3.8, 4.9, s), cong = smooth(1.1, 2.0, s), sep = smooth(2.3, 3.3, s), tel = smooth(3.4, 4.6, s);
    const pole = lerp(0.35, 2.0, smooth(0.6, 1.7, s)) + 0.4 * sep, bend = smooth(2.6, 3.6, s);
    cs.forEach((c, i) => c.position.set(0, 0.1, (i ? -1 : 1) * pole * (s > 4.5 ? 0.6 : 1)));
    env0.material.opacity = 0.26 * (1 - smooth(1.2, 1.9, s)); env0.visible = s < 2; env0.scale.setScalar(1 - 0.0 * s);
    envs.forEach((e) => { e.material.opacity = 0.28 * smooth(3.5, 4.4, s); e.visible = s > 3.4; });
    parent.visible = s < 4.65; parent.scale.set(1 - 0.12 * tel, 1 - 0.12 * tel, 1 + 0.4 * tel); parent.material.opacity = 0.14 * (1 - smooth(4.2, 4.65, s));
    dau.forEach((d) => { d.visible = s > 4.2; d.material.opacity = 0.16 * smooth(4.2, 4.8, s); });
    fur.visible = s > 3.7 && s < 4.7; const fr = lerp(2.4, 0.1, smooth(3.8, 4.7, s)); fur.scale.setScalar(Math.max(fr, 0.05)); fur.position.z = 0;
    chrom.forEach((c, i) => {
      const ra = lerp(0.03, 0.1, cond), len = lens[i] * lerp(2.2, 0.8, cond);
      const nuc = c.tang.clone().multiplyScalar(0.85); const pl = plate[i];
      const home = nuc.clone().lerp(pl, cong);
      [0, 1].forEach((k) => {
        const mm = c.pair[k], sgn = k ? -1 : 1;
        const plateP = home.clone().add(V(0, 0, 0)), pole2 = V(pl.x * 0.45 + c.tang.x * 0.25, pl.y * 0.45 + c.tang.y * 0.25, sgn * (1.3 + 0.1 * c.tang.z * 2) * (1 + 0.15 * (1 - tel)));
        const pos = plateP.clone().lerp(pole2, sep);
        pos.x += (k ? -1 : 1) * 0.045 * (1 - sep) * cond; mm.position.copy(pos);
        mm.scale.set(ra, len * 0.5, ra);
        const base = new THREE.Euler(0, 0, c.rot + (k ? 0.14 : -0.14) * cond);
        mm.rotation.copy(base); mm.rotation.x = bend * Math.PI * 0.35 * sgn * 0 + bend * 0.9; mm.rotation.y = bend * (k ? 0.6 : -0.6);
        if (s > 3.4 && s < 4.8) mm.rotation.z = c.rot + tel * 1.2;
        if (k === 0) c.cen.position.copy(pos); else if (sep > 0.5) { /* second centromere */ }
      });
      c.cen.visible = sep < 0.05; c.cen.scale.setScalar(cond);
    });
    // spindle fibres
    const vis = smooth(1.3, 1.9, s) * (1 - smooth(3.7, 4.2, s));
    fib.forEach((f, i) => { const ci = i >> 1, k = i & 1, ch = chrom[ci].pair[k], poleZ = (k ? -1 : 1) * pole; setCyl(f, V(0, 0.1, poleZ), ch.position); f.visible = vis > 0.05; f.scale.x = f.scale.z = 0.012 * (0.6 + vis); });
    const ph = Math.min(5, Math.floor(s + 0.0001)); P0.phase = ph;
  };
  m.hud = (P) => { const i = Math.min(5, Math.floor(P.stage + 0.0001)); return { title: PHASES[i][0], lines: [PHASES[i][1]], phase: i }; };
  return m;
}
export { PHASES };
