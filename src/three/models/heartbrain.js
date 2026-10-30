import * as THREE from 'three';
import { createModel, organicMat, M, glow, glass, blob, tubeAlong, sphere, cyl, setCyl, V, fbm, noise3, smooth, clamp, lerp, mulberry, TAU } from '../kit.js';

const RED = 0xd23d55, BLUE = 0x4e66d6;
const pulse = (p, a, b) => (p < a || p > b ? 0 : Math.sin((Math.PI * (p - a)) / (b - a)));

/* ================= HUMAN HEART ================= */
export function heart() {
  const m = createModel({ view: [0.25, 0.12, 1], zoom: 0.92, explodeScale: 1.15 });
  const ch = {};
  function chamber(key, id, name, info, col, r, pos, s, seed, ex, rotZ = 0) {
    const mesh = blob(r, organicMat(col, { clearcoat: 0.6 }), { s, amp: 0.06, freq: 1.5, seed, seg: 56 });
    mesh.position.set(...pos); mesh.rotation.z = rotZ; ch[key] = { mesh, s: new THREE.Vector3(...s) };
    m.part(id, name, info, mesh, { explode: V(...ex) });
  }
  chamber('ra', 'ra', 'Right atrium', 'Receives deoxygenated blood from the body through the superior and inferior vena cava.', BLUE, 0.78, [-1.0, 0.75, 0.15], [1, 1.15, 0.95], 1, [-1.2, 0.5, 0.4]);
  chamber('rv', 'rv', 'Right ventricle', 'Pumps deoxygenated blood to the lungs through the pulmonary artery. Its wall is thinner than the left ventricle.', 0x5b6fe0, 1.0, [-0.45, -0.5, 0.45], [1, 1.35, 0.9], 2, [-0.8, -0.5, 1.0]);
  chamber('la', 'la', 'Left atrium', 'Receives oxygenated blood from the lungs through the pulmonary veins.', 0xe0566b, 0.7, [0.8, 0.95, -0.55], [1, 1, 0.9], 3, [1.0, 0.6, -0.9]);
  chamber('lv', 'lv', 'Left ventricle', 'Has the thickest muscular wall. Pumps oxygenated blood into the aorta at high pressure to the whole body.', RED, 1.12, [0.55, -0.55, 0], [1, 1.5, 1], 4, [1.2, -0.7, 0], 0.2);
  const aorta = tubeAlong([V(0.3, 0.6, 0), V(0.2, 1.5, -0.1), V(0.35, 2.3, -0.1), V(1.0, 2.55, -0.25), V(1.55, 1.9, -0.4), V(1.6, 0.8, -0.5), V(1.55, -0.3, -0.6)], 0.3, organicMat(RED), { taper: (t) => 1 - 0.25 * t });
  m.part('aorta', 'Aorta', 'The largest artery. Carries oxygenated blood from the left ventricle to all parts of the body.', aorta, { explode: V(0.8, 1.0, -0.3) });
  const pa = new THREE.Group();
  pa.add(tubeAlong([V(-0.35, 0.55, 0.6), V(-0.3, 1.2, 0.6), V(-0.2, 1.75, 0.5)], 0.27, organicMat(BLUE)));
  pa.add(tubeAlong([V(-0.2, 1.75, 0.5), V(-0.7, 2.1, 0.2), V(-1.4, 2.25, -0.15)], 0.19, organicMat(BLUE)));
  pa.add(tubeAlong([V(-0.2, 1.75, 0.5), V(0.5, 2.05, 0.1), V(1.3, 2.0, -0.4), V(1.9, 1.7, -0.6)], 0.19, organicMat(BLUE)));
  m.part('pa', 'Pulmonary artery', 'The only artery that carries deoxygenated blood. Takes it from the right ventricle to the lungs.', pa, { explode: V(-0.3, 1.1, 0.8) });
  const pv = new THREE.Group();
  pv.add(tubeAlong([V(1.2, 1.0, -0.65), V(1.8, 1.0, -0.8), V(2.5, 1.2, -0.8)], 0.16, organicMat(0xe0566b)));
  pv.add(tubeAlong([V(1.1, 0.7, -0.7), V(1.8, 0.45, -0.85), V(2.4, 0.55, -0.85)], 0.16, organicMat(0xe0566b)));
  pv.add(tubeAlong([V(0.3, 1.0, -0.8), V(-0.5, 1.35, -0.9), V(-1.3, 1.55, -0.95)], 0.16, organicMat(0xe0566b)));
  pv.add(tubeAlong([V(0.3, 0.7, -0.8), V(-0.5, 0.75, -0.95), V(-1.3, 0.9, -1.0)], 0.16, organicMat(0xe0566b)));
  m.part('pv', 'Pulmonary veins', 'The only veins that carry oxygenated blood. They bring blood from the lungs to the left atrium.', pv, { explode: V(0, 0.3, -1.2) });
  m.part('svc', 'Superior vena cava', 'Brings deoxygenated blood from the head, neck and arms to the right atrium.', tubeAlong([V(-1.15, 1.3, 0.1), V(-1.2, 2.0, 0.05), V(-1.15, 2.9, 0)], 0.27, organicMat(BLUE)), { explode: V(-0.7, 1.2, 0) });
  m.part('ivc', 'Inferior vena cava', 'Brings deoxygenated blood from the trunk and legs to the right atrium.', tubeAlong([V(-1.1, 0.2, 0.05), V(-1.15, -0.7, 0), V(-1.1, -1.8, -0.05)], 0.27, organicMat(BLUE)), { explode: V(-0.8, -1.2, 0) });
  const cor = new THREE.Group();
  cor.add(tubeAlong([V(0.2, 0.75, 0.55), V(0.05, 0.1, 0.85), V(0.15, -0.9, 0.85), V(0.35, -1.9, 0.45)], 0.05, M(0xff6a7a, { roughness: 0.3 })));
  cor.add(tubeAlong([V(-0.05, 0.85, 0.55), V(-0.75, 0.35, 0.8), V(-1.1, -0.5, 0.8), V(-0.95, -1.1, 0.7)], 0.05, M(0xff6a7a, { roughness: 0.3 })));
  m.part('cor', 'Coronary arteries', 'Supply oxygen-rich blood to the muscle of the heart itself. Blockage here causes a heart attack.', cor, { explode: V(0, 0, 1.6) });
  const ring = (id, name, info, x, y, z, rx, ry, rz, ex) => {
    const g = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.055, 12, 28), M(0xffd479, { metalness: 0.2, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.4 }));
    g.position.set(x, y, z); g.rotation.set(rx, ry, rz); m.part(id, name, info, g, { explode: V(ex[0], ex[1], ex[2]) });
  };
  ring('tv', 'Tricuspid valve', 'Three flaps between the right atrium and right ventricle. Prevents backflow into the atrium.', -0.8, 0.12, 0.3, 1.2, 0.2, 0.2, [-1.4, 0, 1]);
  ring('mv', 'Bicuspid (mitral) valve', 'Two flaps between the left atrium and left ventricle.', 0.7, 0.28, -0.2, 1.3, -0.2, 0, [1.4, 0.3, -0.4]);
  ring('pvv', 'Pulmonary valve', 'Semilunar valve at the exit of the right ventricle. Stops blood returning from the pulmonary artery.', -0.35, 0.65, 0.58, 1.5, 0, 0, [-0.6, 1.4, 1.4]);
  ring('av', 'Aortic valve', 'Semilunar valve at the exit of the left ventricle. Its closing makes the second heart sound, the dub.', 0.32, 0.62, -0.05, 1.5, 0, 0, [0.9, 1.4, -0.2]);
  // blood flow
  const blue = new THREE.CatmullRomCurve3([V(-1.15, 2.4, 0.1), V(-1.15, 1.2, 0.12), V(-0.95, 0.6, 0.25), V(-0.7, 0.05, 0.4), V(-0.5, -0.5, 0.5), V(-0.4, 0.2, 0.58), V(-0.3, 0.8, 0.58), V(-0.25, 1.5, 0.55), V(-0.8, 2.0, 0.1), V(-1.4, 2.25, -0.15)]);
  const red = new THREE.CatmullRomCurve3([V(2.3, 1.2, -0.8), V(1.2, 1.1, -0.7), V(0.85, 0.7, -0.45), V(0.65, 0.1, -0.15), V(0.5, -0.5, 0), V(0.35, 0.4, 0), V(0.25, 1.4, -0.05), V(0.45, 2.3, -0.15), V(1.05, 2.5, -0.25), V(1.55, 1.9, -0.4)]);
  const N = 46, flow = [];
  [[blue, 0x7d95ff], [red, 0xff6b80]].forEach(([curve, col]) => {
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), glow(col, 1.6), N); m.group.add(im); flow.push({ im, curve });
  });
  const dm = new THREE.Object3D();
  m.param({ id: 'bpm', label: 'Heart rate', type: 'range', min: 40, max: 180, step: 5, value: 72, unit: ' bpm' });
  m.param({ id: 'flow', label: 'Blood flow', type: 'toggle', value: true });
  let ph = 0, lub = 0;
  m.update = (P, t, dt, st) => {
    ph = (ph + dt * P.bpm / 60) % 1; const at = pulse(ph, 0, 0.16), ve = pulse(ph, 0.16, 0.45);
    ['ra', 'la'].forEach((k) => ch[k].mesh.scale.copy(ch[k].s).multiplyScalar(1 - 0.08 * at));
    ['rv', 'lv'].forEach((k) => ch[k].mesh.scale.copy(ch[k].s).multiplyScalar(1 - 0.1 * ve));
    lub = ve; const ex = st && st._ex > 0.04;
    flow.forEach((f, fi) => { f.im.visible = P.flow && !ex; if (!f.im.visible) return;
      const bpm = P.bpm || 72; for (let i = 0; i < N; i++) { const u = (((i / N + t * 0.045 * (bpm / 72)) % 1) + 1) % 1; f.curve.getPointAt(u, dm.position); dm.scale.setScalar(0.8 + 0.4 * ((i * 7) % 3) / 2); dm.updateMatrix(); f.im.setMatrixAt(i, dm.matrix); }
      f.im.instanceMatrix.needsUpdate = true; });
  };
  m.hud = (P) => ({ title: `${P.bpm} bpm`, lines: [`Cardiac output ≈ ${(P.bpm * 70 / 1000).toFixed(1)} L/min`, `One beat lasts ${(60 / P.bpm).toFixed(2)} s`] });
  return m;
}

/* ================= HUMAN BRAIN ================= */
const LOBES = {
  frontal: { name: 'Frontal lobe', col: 0x6c9bd6, info: 'Thinking, planning, speech and voluntary movement (motor cortex). The largest lobe.' },
  parietal: { name: 'Parietal lobe', col: 0xe8b35a, info: 'Receives and interprets touch, pain, temperature and body position.' },
  temporal: { name: 'Temporal lobe', col: 0x6fc28f, info: 'Hearing, language comprehension and memory.' },
  occipital: { name: 'Occipital lobe', col: 0xb284d8, info: 'Vision. Processes the signals from the eyes.' },
};
function lobeOf(x, y, z) {
  if (z < -0.95) return 'occipital';
  if (y < -0.1 && z < 0.8 && z > -1.0) return 'temporal';
  if (z > 0.12) return 'frontal';
  return 'parietal';
}
export function brain() {
  const m = createModel({ view: [0.9, 0.35, 0.6], zoom: 0.95, explodeScale: 1.1, autoRotate: true });
  const base = new THREE.SphereGeometry(1, 140, 100);
  const A = new THREE.Vector3(1.4, 1.0, 1.8);
  const ridge = (x, y, z, f) => { const n = noise3(x * f, y * f, z * f); return 1 - Math.abs(2 * n - 1); };
  const p = base.attributes.position, nr = base.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); n.fromBufferAttribute(nr, i);
    const px = v.x * A.x, py = v.y * A.y, pz = v.z * A.z;
    let d = (Math.pow(ridge(px, py, pz, 2.9), 1.6) - 0.5) * 0.17 + (fbm(px * 1.2, py * 1.2, pz * 1.2, 2) - 0.5) * 0.12;
    d -= 0.3 * Math.exp(-Math.pow(v.x / 0.045, 2)) * smooth(-0.6, 0.2, v.y); // longitudinal fissure
    d -= 0.14 * Math.exp(-Math.pow((v.y + 0.28 + 0.15 * (v.z)) / 0.05, 2)) * smooth(0.9, 0.2, v.z) * smooth(-0.6, -0.1, v.z) * (Math.abs(v.x) > 0.3 ? 1 : 0); // lateral fissure
    let yy = py; if (yy < -0.35) yy = -0.35 + (yy + 0.35) * 0.55; // flatten the underside
    p.setXYZ(i, px + n.x * d, yy + n.y * d, pz + n.z * d);
  }
  base.computeVertexNormals();
  const ng = base.toNonIndexed(), pos = ng.attributes.position, nor = ng.attributes.normal;
  const buckets = { frontal: [], parietal: [], temporal: [], occipital: [] }, cen = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    cen.set(0, 0, 0); for (let k = 0; k < 3; k++) cen.add(new THREE.Vector3().fromBufferAttribute(pos, i + k)); cen.multiplyScalar(1 / 3);
    const b = buckets[lobeOf(cen.x, cen.y, cen.z)];
    for (let k = 0; k < 3; k++) b.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k), nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
  }
  const dirs = { frontal: V(0, 0.2, 1.3), parietal: V(0, 1.2, -0.4), temporal: V(1.3, -0.8, 0.2), occipital: V(0, 0.2, -1.4) };
  const lobeMeshes = {};
  Object.keys(LOBES).forEach((k) => {
    const arr = new Float32Array(buckets[k].length), nrm = new Float32Array(buckets[k].length / 2), pp = [], nn = [];
    for (let i = 0; i < buckets[k].length; i += 6) { pp.push(buckets[k][i], buckets[k][i + 1], buckets[k][i + 2]); nn.push(buckets[k][i + 3], buckets[k][i + 4], buckets[k][i + 5]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
    const mat = organicMat(new THREE.Color(LOBES[k].col).lerp(new THREE.Color(0xe7a9a0), 0.45), { roughness: 0.55, bumpScale: 0.8, clearcoat: 0.5, emissive: LOBES[k].col, emissiveIntensity: 0 });
    mat.userData.pulse = true;
    const mesh = new THREE.Mesh(g, mat); lobeMeshes[k] = mesh;
    // mirrored copy of the lobe for the explode direction to move both hemispheres together
    const d = dirs[k].clone(); if (k === 'temporal') { /* both sides move out */ }
    m.part(k, LOBES[k].name, LOBES[k].info, mesh, { explode: d });
  });
  const cmat = organicMat(0xc98f8a, { roughness: 0.6, bumpScale: 1.4 });
  const cb = new THREE.SphereGeometry(1, 80, 56);
  displace2(cb, (x, y, z) => Math.sin(y * 34) * 0.035 + (fbm(x * 3, y * 3, z * 3, 2) - 0.5) * 0.05);
  const cere = new THREE.Mesh(cb, cmat); cere.scale.set(0.95, 0.5, 0.62); cere.position.set(0, -0.78, -1.3);
  m.part('cerebellum', 'Cerebellum', 'Hindbrain. Coordinates balance, posture and smooth, precise movements.', cere, { explode: V(0, -0.9, -1.0) });
  const ste = new THREE.Group(), sm = organicMat(0xd9a8a0, { roughness: 0.55 });
  const mid = sphere(0.3, sm, 0, -0.42, -0.15); mid.scale.set(1, 1.2, 1);
  const pons = sphere(0.36, sm, 0, -0.82, -0.3); pons.scale.set(1.15, 0.9, 1);
  const med = tubeAlong([V(0, -1.0, -0.4), V(0, -1.6, -0.7), V(0, -2.2, -0.95)], 0.2, sm, { taper: (t) => 1 - 0.3 * t });
  m.part('midbrain', 'Midbrain', 'Controls reflex movements of the eyes and head in response to light and sound.', mid, { explode: V(0, -0.2, 0.2) });
  m.part('pons', 'Pons', 'Relays signals between the cerebrum and cerebellum. Helps regulate breathing.', pons, { explode: V(0, -0.3, 0.4) });
  m.part('medulla', 'Medulla oblongata', 'Controls involuntary actions: heartbeat, breathing, blood pressure, swallowing, vomiting. Continues as the spinal cord.', med, { explode: V(0, -1.0, 0.1) });
  const inner = (id, name, info, geo, col, pos, s, ex) => { const o = new THREE.Mesh(geo, organicMat(col)); o.position.set(...pos); o.scale.set(...s); m.part(id, name, info, o, { explode: V(...ex) }); };
  inner('thalamus', 'Thalamus', 'Relay station that passes sensory signals to the right part of the cerebrum.', new THREE.SphereGeometry(0.34, 28, 20), 0xf0c37a, [0, 0.02, -0.05], [1.8, 0.8, 1], [0, 0.6, 0.2]);
  inner('hypo', 'Hypothalamus', 'Controls body temperature, hunger, thirst, sleep and emotions. Links the nervous system to the endocrine system.', new THREE.SphereGeometry(0.2, 24, 16), 0xe58a7f, [0, -0.36, 0.3], [1, 0.9, 1], [0, -0.5, 0.5]);
  inner('pit', 'Pituitary gland', 'The master gland. Releases hormones that control other endocrine glands.', new THREE.SphereGeometry(0.1, 20, 14), 0x7fd1c8, [0, -0.62, 0.42], [1, 1, 1], [0, -0.8, 0.7]);
  const cc = tubeAlong([V(0, 0.18, -0.75), V(0, 0.42, -0.2), V(0, 0.42, 0.4), V(0, 0.15, 0.8)], 0.07, organicMat(0xf4efe6), { taper: (t) => 0.7 + 0.8 * Math.sin(Math.PI * t) });
  cc.scale.x = 7; m.part('cc', 'Corpus callosum', 'A thick band of nerve fibres that connects the left and right cerebral hemispheres.', cc, { explode: V(0, 0.9, 0) });
  m.param({ id: 'fn', label: 'Brain activity', type: 'buttons', value: 'off', options: [['off', 'Off'], ['vision', 'See'], ['hear', 'Hear'], ['touch', 'Touch'], ['think', 'Think'], ['move', 'Move']] });
  const FN = { vision: ['occipital'], hear: ['temporal'], touch: ['parietal'], think: ['frontal'], move: ['frontal', 'parietal'] };
  const FNTXT = { off: 'Choose an activity to see which lobe lights up.', vision: 'Light from the eyes is processed in the occipital lobe.', hear: 'Sound is interpreted in the temporal lobe.', touch: 'Touch and pain are felt in the parietal lobe.', think: 'Planning and decisions use the frontal lobe.', move: 'The motor cortex (rear frontal lobe) sends commands, the parietal lobe tracks position.' };
  m.update = (P, t) => {
    const act = FN[P.fn] || [];
    Object.keys(LOBES).forEach((k) => {
      const mt = lobeMeshes[k].material, on = act.includes(k);
      const v = on ? 0.55 + 0.45 * Math.sin(t * 5) : 0; mt.userData.i0 = v; mt.userData.e0 = mt.userData.e0 || new THREE.Color(LOBES[k].col);
      if (!mt.userData.e0) mt.userData.e0 = new THREE.Color(LOBES[k].col); mt.emissive.set(LOBES[k].col); mt.emissiveIntensity = v;
    });
  };
  m.hud = (P) => ({ title: 'Brain activity', lines: [FNTXT[P.fn] || ''] });
  return m;
}
function displace2(geo, fn) {
  const p = geo.attributes.position, nr = geo.attributes.normal, v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); n.fromBufferAttribute(nr, i); const d = fn(v.x, v.y, v.z); p.setXYZ(i, v.x + n.x * d, v.y + n.y * d, v.z + n.z * d); }
  geo.computeVertexNormals();
}

/* ================= NEURON ================= */
export function neuron() {
  const m = createModel({ view: [0.1, 0.35, 1], zoom: 1.0, explodeScale: 1.0 });
  const rnd = mulberry(7);
  const somaMat = organicMat(0xd36aa6, { clearcoat: 0.7, transparent: true, opacity: 0.92 });
  const soma = blob(0.95, somaMat, { amp: 0.05, seed: 3 });
  m.part('soma', 'Cell body (soma)', 'Contains the nucleus and most organelles. Integrates signals received by the dendrites.', soma, { explode: V(0, 0.8, 0) });
  const nuc = sphere(0.38, organicMat(0x5a2f8e), 0.1, 0.05, 0); const nl = sphere(0.14, M(0xe8d2ff), 0.2, 0.12, 0.2); nuc.add(nl);
  m.part('nucleus', 'Nucleus', 'Holds the DNA and controls the activities of the neuron.', nuc, { explode: V(0, 1.4, 0.6) });
  // dendrites
  const dg = new THREE.Group(), dmat = organicMat(0xe78fc0);
  const branch = (start, dir, len, r, depth) => {
    const end = start.clone().addScaledVector(dir, len); const mid = start.clone().lerp(end, 0.5).add(V((rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25));
    dg.add(tubeAlong([start, mid, end], r, dmat, { radial: 8, seg: 12, taper: (t) => 1 - 0.35 * t }));
    if (depth > 0) for (let i = 0; i < 2; i++) { const nd = dir.clone().add(V((rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.3)).normalize(); branch(end, nd, len * 0.7, r * 0.7, depth - 1); }
  };
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const dir = V(-1, Math.cos(a) * 0.9, Math.sin(a) * 0.9).normalize(); branch(dir.clone().multiplyScalar(0.8), dir, 1.1, 0.13, 2); }
  m.part('dendrites', 'Dendrites', 'Short, branched fibres that receive information (impulses) from other neurons and carry it toward the cell body.', dg, { explode: V(-1.3, 0, 0) });
  // axon + myelin
  const pts = []; for (let i = 0; i <= 12; i++) { const x = 0.8 + i * 0.55; pts.push(V(x, 0.22 * Math.sin(i * 0.7), 0.15 * Math.cos(i * 0.5))); }
  const curve = new THREE.CatmullRomCurve3(pts); const L = curve.getLength();
  const axon = tubeAlong(curve, 0.075, glow(0xbfeaff, 0.35, { roughness: 0.3 }), { seg: 200, radial: 10 });
  m.part('axon', 'Axon', 'A single long fibre that carries the nerve impulse away from the cell body to other neurons, muscles or glands.', axon, { explode: V(0, -0.6, 0.5) });
  const myelin = new THREE.Group(), segs = [], NS = 8, gap = 0.012, u0 = 0.06, u1 = 0.84, span = (u1 - u0) / NS;
  for (let k = 0; k < NS; k++) {
    const a = u0 + k * span + gap, b = u0 + (k + 1) * span - gap, sub = [];
    for (let j = 0; j <= 6; j++) sub.push(curve.getPointAt(a + ((b - a) * j) / 6));
    const mm = M(0xf3e7b7, { roughness: 0.45, clearcoat: 0.8, emissive: 0xffd36a, emissiveIntensity: 0 });
    myelin.add(tubeAlong(sub, 0.21, mm, { radial: 18, seg: 24, taper: (t) => 0.82 + 0.18 * Math.pow(Math.sin(Math.PI * t), 0.4) }));
    segs.push({ mid: (a + b) / 2, mat: mm });
  }
  m.part('myelin', 'Myelin sheath', 'Fatty insulating layer formed by Schwann cells. It makes impulses travel much faster.', myelin, { explode: V(0, 1.1, 0.4) });
  const nodes = new THREE.Group(), nodeMat = glow(0x7fe3ff, 0.5);
  for (let k = 1; k < NS; k++) { const c = curve.getPointAt(u0 + k * span); nodes.add(sphere(0.115, nodeMat, c.x, c.y, c.z, 14)); }
  m.part('node', 'Node of Ranvier', 'Gaps between myelin segments. The impulse jumps from node to node, called saltatory conduction.', nodes, { explode: V(0, -1.0, 0.4) });
  // terminals
  const term = new THREE.Group(), end = curve.getPointAt(0.97), tmat = organicMat(0xff8fb8), vesMat = glow(0x9ee7ff, 0.9);
  const bulbs = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4, tip = end.clone().add(V(0.9, Math.cos(a) * 0.65, Math.sin(a) * 0.65));
    term.add(tubeAlong([end, end.clone().lerp(tip, 0.55).add(V(0, 0.05, 0)), tip], 0.07, tmat, { radial: 8, seg: 10 }));
    const bulb = blob(0.2, tmat, { amp: 0.05, seed: i }); bulb.position.copy(tip); term.add(bulb); bulbs.push(tip);
    for (let k = 0; k < 4; k++) term.add(sphere(0.04, vesMat, tip.x - 0.05 + rnd() * 0.08, tip.y + (rnd() - 0.5) * 0.18, tip.z + (rnd() - 0.5) * 0.18, 8));
  }
  m.part('terminal', 'Axon terminals', 'Branched ends with synaptic knobs holding vesicles of neurotransmitter. They release it into the synapse.', term, { explode: V(0.9, 0.4, 0) });
  // post-synaptic cell
  const post = new THREE.Mesh(new THREE.SphereGeometry(1.2, 40, 30, 0, TAU, 0, 1.0), organicMat(0x8d7bd6, { side: THREE.DoubleSide }));
  post.rotation.z = Math.PI / 2; post.position.set(end.x + 1.55, 0, 0); post.scale.set(1, 1, 1.2);
  m.part('post', 'Next neuron (dendrite)', 'The receiving cell. Its membrane has receptors that bind the neurotransmitter and start a new impulse.', post, { explode: V(1.2, 0, 0) });
  // impulse + neurotransmitter
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), glow(0xfff0a0, 3)); const light = new THREE.PointLight(0xffe08a, 6, 4); spark.add(light); m.group.add(spark);
  const NT = 48, nt = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), glow(0x8affc7, 2.2), NT); m.group.add(nt);
  const ntS = Array.from({ length: NT }, () => ({ b: Math.floor(rnd() * 4), v: V(0.6 + rnd() * 0.6, (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7), o: rnd() * 0.3 }));
  m.param({ id: 'myelinated', label: 'Myelinated axon', type: 'toggle', value: true });
  m.param({ id: 'speed', label: 'Impulse speed', type: 'range', min: 0.3, max: 2, step: 0.1, value: 1, unit: '×' });
  m.param({ id: 'fire', label: 'Stimulate', type: 'action', value: 0 });
  let u = 0, run = false, fireClock = 0, arrive = -1, dm = new THREE.Object3D(), idle = 0;
  m.onParam = (id) => { if (id === 'fire') { u = 0; run = true; arrive = -1; } };
  m.update = (P, t, dt) => {
    idle += dt; if (!run && idle > 4) { run = true; u = 0; arrive = -1; idle = 0; }
    if (run) {
      const sp = (P.myelinated ? 0.34 : 0.1) * P.speed;
      u += dt * sp; const uu = P.myelinated ? u0 + (Math.floor(Math.max(0, (u - u0)) / span) + smooth(0, 1, ((u - u0) / span) % 1) * 1) * span : u;
      const pu = clamp(P.myelinated ? Math.max(u0, Math.min(u1, uu)) : u, 0, 0.97);
      const pp = curve.getPointAt(pu); spark.position.copy(pp); spark.visible = true;
      segs.forEach((s) => { const d = Math.abs(pu - s.mid); s.mat.emissiveIntensity = P.myelinated ? 0 : clamp(1 - d * 8, 0, 1) * 0.6; });
      if (u >= 0.97) { run = false; arrive = 0; spark.visible = false; }
    } else { spark.visible = false; segs.forEach((s) => { s.mat.emissiveIntensity *= 0.9; }); }
    nodeMat.emissiveIntensity = 0.4 + (run ? 0.9 * Math.abs(Math.sin(t * 9)) : 0);
    if (arrive >= 0) arrive += dt;
    nt.visible = arrive >= 0 && arrive < 1.6;
    if (nt.visible) { for (let i = 0; i < NT; i++) { const s = ntS[i], k = clamp((arrive - s.o) / 0.9, 0, 1); const b = bulbs[s.b]; dm.position.set(b.x + s.v.x * k * 0.6 + 0.05, b.y + s.v.y * k * 0.4, b.z + s.v.z * k * 0.4); dm.scale.setScalar(k > 0 && k < 1 ? 1 : 0.001); dm.updateMatrix(); nt.setMatrixAt(i, dm.matrix); } nt.instanceMatrix.needsUpdate = true; }
  };
  m.hud = (P) => ({ title: P.myelinated ? 'Saltatory conduction' : 'Continuous conduction', lines: [P.myelinated ? 'Impulse jumps between nodes: up to 120 m/s.' : 'Impulse moves along the whole axon: about 0.5-2 m/s.'] });
  return m;
}
