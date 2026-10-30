import * as THREE from 'three';
import { createModel, organicMat, M, glow, glass, blob, tubeAlong, sphere, cyl, setCyl, V, fbm, noise3, smooth, clamp, lerp, mulberry, TAU, displace } from '../kit.js';

const GREEN = 0x4fb85f;
function petalGeo(len, wid, curl = 0.18) {
  const g = new THREE.PlaneGeometry(wid, len, 10, 16), p = g.attributes.position, col = [];
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + len / 2, v = y / len, w = Math.sin(Math.PI * Math.pow(v, 0.7)) * 0.5 + 0.5 * Math.pow(Math.sin(Math.PI * v), 0.5);
    p.setXYZ(i, p.getX(i) * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, v * 1.15))) , y, curl * y * y * 0.4 + Math.pow(p.getX(i), 2) * 0.35);
    col.push(1, 1, 1);
  }
  g.computeVertexNormals(); return g;
}
/* ================= FLOWER ================= */
export function flower(mode = 'parts') {
  const m = createModel({ mode, view: [0.7, 0.18, 1], zoom: 1.0, explodeScale: 1.1, autoRotate: mode === 'parts', sliceable: false });
  const stem = tubeAlong([V(0, -3.4, 0), V(0.1, -2, 0.05), V(0, -0.5, 0)], 0.17, organicMat(0x3f9a4c), { taper: (t) => 1 });
  const rec = blob(0.4, organicMat(0x4aa85a), { amp: 0.04, s: [1.4, 0.7, 1.4] }); rec.position.y = -0.3; const pg = new THREE.Group(); pg.add(stem, rec);
  m.part('pedicel', 'Pedicel & receptacle', 'The stalk (pedicel) bears the flower; its swollen tip, the receptacle, holds all the floral whorls.', pg, { explode: V(0, -0.9, 0) });
  const cal = new THREE.Group(), cor = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3, s = new THREE.Mesh(petalGeo(1.7, 0.9, 0.5), organicMat(GREEN, { side: THREE.DoubleSide })); s.position.y = -0.3; s.rotation.set(0, a, 0); const pv = new THREE.Group(); pv.add(s); s.rotation.set(-1.15, 0, 0); pv.rotation.y = a; cal.add(pv);
    const pt = new THREE.Mesh(petalGeo(2.6, 1.9, 0.5), organicMat(0xff7fb0, { side: THREE.DoubleSide, sheen: 1, clearcoat: 0.5, emissive: 0x401022, emissiveIntensity: 0.15 })); const pp = new THREE.Group(); pp.add(pt); pt.rotation.set(-0.95, 0, 0); pp.rotation.y = a + 0.63; pp.position.y = -0.2; cor.add(pp);
  }
  m.part('calyx', 'Sepals (calyx)', 'The outermost whorl, usually green. Protects the flower bud.', cal, { explode: V(0, -0.5, 0.6), });
  m.part('corolla', 'Petals (corolla)', 'Brightly coloured whorl that attracts insects for pollination.', cor, { explode: V(0, 0.4, 1.2) });
  const fil = new THREE.Group(), anth = new THREE.Group(), pollen = [], rnd = mulberry(9);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.5, rx = Math.cos(a), rz = Math.sin(a);
    fil.add(tubeAlong([V(rx * 0.35, -0.2, rz * 0.35), V(rx * 0.75, 0.9, rz * 0.75), V(rx * 0.9, 1.7, rz * 0.9)], 0.04, organicMat(0xe8e0a0), { radial: 8, seg: 16 }));
    const an = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.28, 8, 14), organicMat(0xffc933, { emissive: 0x805000, emissiveIntensity: 0.3 })); an.position.set(rx * 0.9, 1.8, rz * 0.9); an.rotation.z = -rx * 0.4; an.rotation.x = rz * 0.4; anth.add(an);
    for (let k = 0; k < 6; k++) pollen.push({ a: i, o: rnd(), r: V(rx * 0.9 + (rnd() - 0.5) * 0.25, 1.8 + (rnd() - 0.5) * 0.3, rz * 0.9 + (rnd() - 0.5) * 0.25) });
  }
  m.part('filament', 'Filament', 'The thin stalk that holds the anther up. Filament + anther = stamen (male part).', fil, { explode: V(0, 0.2, 1.0) });
  m.part('anther', 'Anther', 'Produces pollen grains, which contain the male gametes. Together with the filament it forms the stamen.', anth, { explode: V(0, 1.0, 0.9) });
  const stig = blob(0.2, organicMat(0xffd0e0, { clearcoat: 1, roughness: 0.2 }), { amp: 0.08, seed: 2 }); stig.position.set(0, 2.2, 0);
  const sty = tubeAlong([V(0, 0.55, 0), V(0, 1.4, 0), V(0, 2.1, 0)], 0.07, organicMat(0x9edc6a), { radial: 10 });
  const ov = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 30), glass(0x7fdc7a, 0.38, { clearcoat: 1 })); ov.scale.set(0.9, 1.15, 0.9); ov.position.y = 0.05;
  const ovules = new THREE.Group(); [[0.12, 0.1, 0], [-0.15, -0.1, 0.1], [0.05, 0.3, -0.15], [-0.1, 0.25, 0.15], [0.15, -0.2, -0.1]].forEach((p) => { ovules.add(sphere(0.1, M(0xfff0b0, { emissive: 0x806a20, emissiveIntensity: 0.4 }), p[0], p[1] + 0.05, p[2], 16)); });
  m.part('stigma', 'Stigma', 'Sticky top of the pistil that receives the pollen grains.', stig, { explode: V(0, 1.2, 0) });
  m.part('style', 'Style', 'The slender tube connecting stigma and ovary. The pollen tube grows down through it.', sty, { explode: V(0, 0.5, 0) });
  m.part('ovary', 'Ovary', 'Swollen base of the pistil (female part) that holds the ovules. After fertilisation it becomes the fruit.', ov, { explode: V(0, -0.2, 0.6), back: true });
  m.part('ovule', 'Ovules', 'Each ovule contains an egg cell. After fertilisation an ovule becomes a seed.', ovules, { explode: V(0, 0.2, 0.2) });
  const pgr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), glow(0xffe04a, 1.8), pollen.length); m.group.add(pgr);
  const tubeCurve = new THREE.CatmullRomCurve3([V(0, 2.25, 0), V(0.03, 1.5, 0), V(0, 0.9, 0), V(0.05, 0.55, 0), V(0.09, 0.15, 0.02)]), tubeGeo = new THREE.TubeGeometry(tubeCurve, 80, 0.028, 8, false);
  const tube = new THREE.Mesh(tubeGeo, glow(0xfff0a0, 1.4)); m.group.add(tube); const tubeTip = sphere(0.05, glow(0xfff6c8, 2.5), 0, 0, 0, 10); m.group.add(tubeTip);
  m.param({ id: 'poll', label: 'Pollination to fertilisation', type: 'range', min: 0, max: 1, step: 0.005, value: mode === 'parts' ? 0 : 0.2 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false });
  m.autoParams = ['poll'];
  const dm = new THREE.Object3D(), total = tubeGeo.index.count;
  m.update = (P, t, dt) => {
    let u = P.poll; if (P.play) { u = (u + dt * 0.06) % 1; P.poll = u; }
    const transfer = smooth(0, 0.3, u), grow = smooth(0.32, 0.92, u);
    pollen.forEach((q, i) => { const k = clamp(transfer * 1.0 + (q.o - 0.5) * 0.3, 0, 1), stay = u < 0.01; dm.position.copy(q.r).lerp(V(0, 2.28, 0), k); dm.position.y += Math.sin(k * Math.PI) * 0.5 * (1 - 0.0); dm.position.x += Math.sin(t * 2 + i) * 0.015; dm.scale.setScalar(k > 0.99 && i % 3 ? 0.001 : 1); dm.updateMatrix(); pgr.setMatrixAt(i, dm.matrix); });
    pgr.instanceMatrix.needsUpdate = true;
    tube.visible = u > 0.32; tubeGeo.setDrawRange(0, Math.floor((grow * total) / 3) * 3); tubeTip.visible = tube.visible; tubeTip.position.copy(tubeCurve.getPointAt(clamp(grow, 0.001, 1)));
    ovules.children.forEach((o, i) => { const f = i === 0 && u > 0.93; o.material.color.setHex(f ? 0xc9f27a : 0xfff0b0); o.material.emissiveIntensity = f ? 1.0 : 0.4; o.scale.setScalar(f ? 1 + 0.25 * smooth(0.93, 1, u) : 1); });
  };
  const ST = [[0.05, 'Mature flower', 'Anthers are full of pollen. Stigma is ready to receive it.'], [0.3, 'Pollination', 'Pollen is carried by wind, insects or water from the anther to the stigma. Self- or cross-pollination.'], [0.34, 'Pollen lands', 'Pollen grains stick to the sticky stigma.'], [0.9, 'Pollen tube growth', 'Each grain germinates and sends a pollen tube down the style toward the ovule, carrying the male gametes.'], [1.01, 'Fertilisation', 'The tube reaches the ovule. A male gamete fuses with the egg: zygote. The ovule becomes a seed, the ovary a fruit.']];
  m.hud = (P) => { const s = ST.find((x) => P.poll < x[0]) || ST[4]; return { title: s[1], lines: [s[2]] }; };
  return m;
}

/* ================= EMBRYO SAC & DOUBLE FERTILISATION ================= */
export function embryosac() {
  const m = createModel({ view: [0.9, 0.2, 0.7], zoom: 0.92, explodeScale: 0.9, sliceable: true, sliceAxis: 'z', autoRotate: false });
  const intg = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 44, 0, TAU, 0.5, Math.PI - 0.5), glass(0x9ee08a, 0.22, { roughness: 0.25 })); intg.scale.set(1.9, 2.5, 1.9);
  const intg2 = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 44, 0, TAU, 0.42, Math.PI - 0.42), glass(0x6cc873, 0.2, { roughness: 0.25 })); intg2.scale.set(1.7, 2.3, 1.7);
  const ig = new THREE.Group(); ig.add(intg, intg2);
  m.part('integ', 'Integuments', 'Two protective layers around the ovule. They leave a small opening, the micropyle. They become the seed coat.', ig, { back: true, explode: V(0, 0, 0) });
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), glass(0xf1e6a0, 0.25)); nuc.scale.set(1.45, 2.0, 1.45); nuc.position.y = -0.05; m.part('nucellus', 'Nucellus', 'Mass of tissue inside the integuments that nourishes the embryo sac.', nuc, { back: true });
  const es = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), glass(0xfff7c4, 0.35, { roughness: 0.15 })); es.scale.set(0.95, 1.45, 0.95); es.position.y = -0.1; m.part('es', 'Embryo sac (female gametophyte)', 'The 7-celled, 8-nucleate female gametophyte formed from the megaspore by three mitotic divisions.', es, { back: true });
  const eggG = new THREE.Group(), egg = blob(0.26, organicMat(0xff9ab8), { amp: 0.04 }); egg.position.set(0, 1.0, 0); const eN = sphere(0.09, M(0x7a2d9e), 0, 1.0, 0.08, 12);
  const syn = [-1, 1].map((s) => { const c = blob(0.18, organicMat(0xffc8d6), { amp: 0.04, s: [1, 1.5, 1] }); c.position.set(s * 0.34, 1.1, 0); const n = sphere(0.06, M(0x7a2d9e), s * 0.34, 1.02, 0.05, 10); return [c, n]; });
  eggG.add(egg, eN, ...syn.flat()); m.part('egg', 'Egg apparatus (egg + 2 synergids)', 'At the micropylar end: one egg cell and two synergids. Synergids guide the pollen tube with their filiform apparatus.', eggG, { explode: V(0, 0.8, 0) });
  const pol = new THREE.Group(), p1 = sphere(0.12, M(0x8fe3ff, { emissive: 0x1a6a8a, emissiveIntensity: 0.6 }), -0.1, 0.0, 0, 14), p2 = sphere(0.12, M(0x8fe3ff, { emissive: 0x1a6a8a, emissiveIntensity: 0.6 }), 0.1, -0.02, 0.05, 14); pol.add(p1, p2);
  m.part('polar', 'Central cell with polar nuclei', 'The large central cell has two polar nuclei. They fuse with a male gamete in triple fusion to form the primary endosperm nucleus (3n).', pol, { explode: V(0.7, 0, 0.3) });
  const ant = new THREE.Group(); [[-0.3, -1.1, 0], [0.3, -1.1, 0], [0, -1.35, 0.1]].forEach((p) => { ant.add(blob(0.17, organicMat(0xd7c8ff), { amp: 0.04, seed: p[0] }).translateX(p[0]).translateY(p[1]).translateZ(p[2])); ant.add(sphere(0.055, M(0x7a2d9e), p[0], p[1], p[2] + 0.1, 8)); });
  m.part('anti', 'Antipodals (3 cells)', 'Three cells at the chalazal end. They degenerate after fertilisation.', ant, { explode: V(0, -0.8, 0) });
  const ptC = new THREE.CatmullRomCurve3([V(0.6, 4.6, 0.2), V(0.2, 3.3, 0.1), V(0.0, 2.45, 0), V(0.0, 1.55, 0), V(0.05, 1.15, 0)]); const ptube = new THREE.Mesh(new THREE.TubeGeometry(ptC, 80, 0.1, 12, false), glass(0xffe08a, 0.55, { clearcoat: 1 })); const ptT = ptube.geometry.index.count; m.part('ptube', 'Pollen tube', 'Grows through the style and enters the ovule through the micropyle, then bursts in a synergid to release two male gametes.', ptube, { explode: V(0.7, 0.3, 0) });
  const mg = new THREE.Group(); const male = [0, 1].map(() => { const g = blob(0.1, organicMat(0x4cc9f0, { emissive: 0x1a6a8a, emissiveIntensity: 0.9 }), { amp: 0.04, s: [1, 2, 1] }); mg.add(g); return g; }); m.part('male', 'Male gametes (2)', 'Two male gametes are delivered. One fuses with the egg, the other with the two polar nuclei. This is called double fertilisation.', mg);
  const zy = sphere(0.3, organicMat(0xc27cff, { emissive: 0x5a208a, emissiveIntensity: 0.5 }), 0, 1.0, 0, 24); zy.visible = false; const pen = sphere(0.24, organicMat(0xffa24a, { emissive: 0x7a3a00, emissiveIntensity: 0.5 }), 0, 0.0, 0, 24); pen.visible = false; const rg = new THREE.Group(); rg.add(zy, pen);
  m.part('result', 'Zygote (2n) and PEN (3n)', 'Syngamy gives the zygote (2n), which becomes the embryo. Triple fusion gives the primary endosperm nucleus (3n), which becomes the endosperm that feeds the embryo.', rg);
  m.param({ id: 'step', label: 'Double fertilisation', type: 'range', min: 0, max: 3, step: 0.005, value: 0.5 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false }); m.autoParams = ['step'];
  const L = (a, b, c) => V(lerp(a.x, b.x, c), lerp(a.y, b.y, c), lerp(a.z, b.z, c));
  m.update = (P, t, dt) => {
    let s = P.step; if (P.play) { s = (s + dt * 0.14) % 3; P.step = s; }
    const g = smooth(0, 1, s); const reach = ptT * clamp(0.55 + 0.45 * g, 0, 1); ptube.geometry.setDrawRange(0, Math.floor(reach / 3) * 3);
    const rel = smooth(1.0, 1.7, s), fuse = smooth(1.8, 2.8, s);
    const out = [V(0.0, 1.55, 0), V(0.0, 1.5, 0)], eggp = V(0, 1.0, 0.0), pp = V(0, -0.0, 0);
    male.forEach((mm, i) => {
      const start = L(V(0, 3.2, 0), V(0.05, 1.45 + i * 0.12, 0), g), mid = V(i ? 0.25 : -0.25, 0.75 + i * 0.1, 0);
      const target = i === 0 ? eggp : pp;
      const p = s < 1.0 ? start : L(L(start, mid, rel), target, fuse); mm.position.copy(p); mm.visible = fuse < 0.98; mm.rotation.z = s * 2 + i;
    });
    const f = fuse > 0.95; zy.visible = f; pen.visible = f; egg.visible = !f; eN.visible = !f; p1.visible = p2.visible = fuse < 0.5; pen.scale.setScalar(smooth(0.95, 1.0, fuse) * 1 + 0.001);
    p1.position.x = lerp(-0.1, 0, fuse); p2.position.x = lerp(0.1, 0, fuse);
    syn.forEach((q) => q.forEach((o) => { o.visible = s < 2.2 || true; if (o.material) { o.material.transparent = true; o.material.opacity = 1 - 0.7 * smooth(1.2, 1.8, s); } }));
    ant.children.forEach((c) => { if (c.material) { c.material.transparent = true; c.material.opacity = 1 - 0.7 * smooth(2.2, 3, s); } });
  };
  const TXT = [[1, 'Pollen tube arrives', 'The pollen tube enters through the micropyle and grows toward a synergid.'], [1.8, 'Release of male gametes', 'The tip bursts inside a synergid and discharges two male gametes.'], [2.9, 'Syngamy and triple fusion', 'One male gamete fuses with the egg (syngamy, 2n zygote). The other fuses with the two polar nuclei (triple fusion, 3n PEN).'], [3.1, 'After fertilisation', 'Zygote becomes the embryo; PEN becomes the endosperm; the ovule becomes a seed.']];
  m.hud = (P) => { const x = TXT.find((q) => P.step < q[0]) || TXT[3]; return { title: x[1], lines: [x[2]] }; };
  return m;
}

/* ================= HUMAN REPRODUCTIVE SYSTEM ================= */
function lathe(pts, mat, seg = 40) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg), mat); }
export function repro() {
  const m = createModel({ mode: 'female', view: [0.1, 0.1, 1], zoom: 0.95, explodeScale: 1.0, sliceable: true, sliceAxis: 'z', autoRotate: false });
  // FEMALE
  const uterus = new THREE.Group();
  const uo = lathe([[0.0, 1.2], [0.5, 1.15], [0.95, 0.9], [1.0, 0.45], [0.7, -0.4], [0.3, -0.9], [0.0, -1.0]], organicMat(0xd9707c, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, clearcoat: 1 })); uo.scale.z = 0.62;
  const ui = lathe([[0.0, 1.0], [0.4, 0.95], [0.78, 0.75], [0.8, 0.4], [0.5, -0.3], [0.15, -0.8], [0.0, -0.85]], organicMat(0xff9aa8, { side: THREE.DoubleSide }), 32); ui.scale.z = 0.4;
  uterus.add(uo, ui); uterus.position.y = 0.4;
  m.part('f_uterus', 'Uterus (womb)', 'Pear-shaped muscular organ. The foetus develops here. Its inner lining, the endometrium, thickens every month. Muscular wall: myometrium.', uterus, { mode: 'female', explode: V(0, 0.5, 0) });
  const cervix = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.7, 24), organicMat(0xc7606e)); cervix.position.y = -0.85; m.part('f_cervix', 'Cervix', 'The narrow lower end of the uterus that opens into the vagina.', cervix, { mode: 'female', explode: V(0, -0.2, 0.3) });
  const vag = tubeAlong([V(0, -1.2, 0), V(0, -2.2, 0), V(0, -3.2, 0.1)], 0.3, organicMat(0xe8878f), { taper: (t) => 1 - 0.2 * t }); m.part('f_vagina', 'Vagina', 'Muscular canal that receives sperm and serves as the birth canal.', vag, { mode: 'female', explode: V(0, -0.7, 0.2) });
  const tubes = new THREE.Group(), fimb = []; [-1, 1].forEach((s) => { tubes.add(tubeAlong([V(s * 0.75, 1.15, 0), V(s * 1.6, 1.55, 0.1), V(s * 2.5, 1.2, 0.1), V(s * 2.95, 0.55, 0.1)], 0.1, organicMat(0xf0a0a8), { taper: (t) => 0.6 + 0.9 * t, radial: 12 })); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, f = tubeAlong([V(s * 2.95, 0.55, 0.1), V(s * (3.05 + Math.cos(a) * 0.1), 0.45 + Math.sin(a) * 0.2, 0.1 + Math.cos(a) * 0.2), V(s * (3.15 + Math.cos(a) * 0.1), 0.25 + Math.sin(a) * 0.3, 0.1 + Math.cos(a) * 0.3)], 0.035, organicMat(0xff9aa8), { radial: 6, seg: 8 }); tubes.add(f); } });
  m.part('f_tube', 'Fallopian tubes (oviducts)', 'Funnel-shaped ends with finger-like fimbriae catch the released egg. Fertilisation normally occurs in the ampulla of the tube.', tubes, { mode: 'female', explode: V(0, 0.7, 0.4) });
  const ov = new THREE.Group(); [-1, 1].forEach((s) => { const o = blob(0.5, organicMat(0xe0b0a0), { amp: 0.05, s: [1, 1.3, 0.8] }); o.position.set(s * 3.25, -0.1, 0.1); ov.add(o); for (let k = 0; k < 5; k++) ov.add(sphere(0.09 + 0.02 * (k % 3), glass(0xfff0c8, 0.9), s * 3.25 + (k - 2) * 0.13 * s, -0.1 + Math.sin(k * 2) * 0.35, 0.5, 12)); ov.add(sphere(0.2, M(0xf5d34a), s * 3.35, -0.35, 0.45, 14)); });
  m.part('f_ovary', 'Ovaries', 'Almond-shaped. Produce ova (eggs) and the hormones oestrogen and progesterone. Follicles hold developing eggs.', ov, { mode: 'female', explode: V(1.0, -0.2, 0.5) });
  const ovum = sphere(0.1, M(0xfff0c8, { emissive: 0x806a20, emissiveIntensity: 0.6 }), 0, 0, 0, 14); ovum.visible = false; m.group.add(ovum);
  const path = new THREE.CatmullRomCurve3([V(3.1, 0.3, 0.2), V(3.0, 0.55, 0.1), V(2.5, 1.2, 0.1), V(1.6, 1.55, 0.1), V(0.75, 1.15, 0), V(0.4, 0.8, 0), V(0.2, 0.4, 0.0)]);
  const NS = 22, sp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), glow(0x8fe3ff, 2), NS); m.group.add(sp); const sdm = new THREE.Object3D();
  // MALE
  const bladder = blob(0.7, organicMat(0xf2c26b, { transparent: true, opacity: 0.6 }), { amp: 0.03 }); bladder.position.set(0, 2.7, 0.2); m.part('m_bladder', 'Urinary bladder', 'Stores urine. The urethra carries both urine and semen out of the body, but never at the same time.', bladder, { mode: 'male', explode: V(0, 0.9, 0) });
  const testes = new THREE.Group(), sac = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), glass(0xf0b8a0, 0.18)); sac.scale.set(1.9, 1.2, 0.9); sac.position.set(0, -1.35, 0.4); testes.add(sac);
  [-1, 1].forEach((s) => { const t = blob(0.55, organicMat(0xe8c9b0, { clearcoat: 0.9 }), { amp: 0.03, s: [0.8, 1.1, 0.85] }); t.position.set(s * 0.55, -1.35, 0.4); testes.add(t); for (let k = 0; k < 3; k++) testes.add(tubeAlong(Array.from({ length: 8 }, (_, i) => V(s * 0.55 + Math.sin(i * 1.3 + k) * 0.18, -1.35 + (i - 4) * 0.1 + k * 0.05, 0.4 + 0.36 + Math.cos(i * 1.7) * 0.05)), 0.018, M(0xb88a5a), { radial: 6, seg: 40 })); });
  m.part('m_testes', 'Testes & scrotum', 'Two testes in the scrotum, where it is 2–3 °C cooler than the body, suitable for sperm formation. Seminiferous tubules make sperm; Leydig cells make testosterone.', testes, { mode: 'male', explode: V(0, -0.5, 0.5) });
  const epi = new THREE.Group(); [-1, 1].forEach((s) => { const pts = []; for (let i = 0; i < 30; i++) pts.push(V(s * (0.55 + 0.38) + Math.sin(i * 1.2) * 0.07, -1.0 + i * 0.012 - i * 0.04, 0.2 + Math.cos(i * 1.1) * 0.05)); epi.add(tubeAlong(pts, 0.05, organicMat(0xd8935a), { radial: 8, seg: 200 })); }); m.part('m_epi', 'Epididymis', 'Coiled tube on each testis where sperm mature and are stored.', epi, { mode: 'male', explode: V(0, -0.2, -0.6) });
  const vd = new THREE.Group(); [-1, 1].forEach((s) => vd.add(tubeAlong([V(s * 0.92, -0.9, 0.2), V(s * 1.2, 0.1, 0.1), V(s * 1.15, 1.4, 0.1), V(s * 0.7, 2.2, 0), V(s * 0.3, 1.5, 0.0), V(s * 0.12, 0.95, 0.0)], 0.06, organicMat(0xd9a85a), { radial: 8, seg: 120 }))); m.part('m_vd', 'Vas deferens', 'Muscular tube that carries sperm from the epididymis up and around the bladder to the urethra.', vd, { mode: 'male', explode: V(0, 0.4, -0.5) });
  const sv = new THREE.Group(); [-1, 1].forEach((s) => { const b = blob(0.32, organicMat(0xe1b36d), { amp: 0.1, seed: s + 3, s: [0.7, 1.4, 0.7] }); b.position.set(s * 0.55, 1.6, -0.2); b.rotation.z = -s * 0.4; sv.add(b); }); m.part('m_sv', 'Seminal vesicles', 'Secrete a fructose-rich fluid that nourishes sperm and forms most of the semen.', sv, { mode: 'male', explode: V(0, 0.5, -0.9) });
  const pr = blob(0.4, organicMat(0xd88a5a), { amp: 0.04 }); pr.position.set(0, 0.95, 0); m.part('m_prostate', 'Prostate gland', 'Adds an alkaline fluid to semen that helps sperm survive in the acidic vagina.', pr, { mode: 'male', explode: V(0, 0.2, 0.8) });
  const ur = tubeAlong([V(0, 2.3, 0.2), V(0, 0.95, 0.0), V(0, 0.2, 0.2), V(0, -0.4, 0.9), V(0, -1.1, 1.4), V(0, -1.8, 1.9)], 0.07, organicMat(0xf5d98a), { radial: 10, seg: 100 }); const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.1, 24), glass(0xf0b8a0, 0.3)); pe.position.set(0, -1.15, 1.35); pe.rotation.x = 0.7; const gl = blob(0.3, organicMat(0xe8908f), { amp: 0.03, s: [1, 1, 1.2] }); gl.position.set(0, -1.98, 2.05); const pg = new THREE.Group(); pg.add(ur, pe, gl);
  m.part('m_penis', 'Urethra & penis (schematic)', 'The urethra runs through the penis and delivers semen to the outside. The penis is the organ of copulation.', pg, { mode: 'male', explode: V(0, -0.5, 1.0) });
  const curve = new THREE.CatmullRomCurve3([V(0.55, -1.35, 0.6), V(0.92, -1.0, 0.3), V(1.2, 0.1, 0.1), V(1.15, 1.4, 0.1), V(0.7, 2.2, 0), V(0.3, 1.5, 0), V(0.12, 0.95, 0.0), V(0, 0.2, 0.2), V(0, -0.4, 0.9), V(0, -1.1, 1.4), V(0, -1.8, 1.9)]);
  m.param({ id: 'mode', label: 'System', type: 'buttons', value: 'female', options: [['female', 'Female'], ['male', 'Male']] });
  m.param({ id: 'gam', label: 'Show gametes moving', type: 'toggle', value: true });
  m.update = (P, t) => {
    ovum.visible = m.mode === 'female' && P.gam; sp.visible = P.gam;
    if (m.mode === 'female' && P.gam) { path.getPointAt((t * 0.05) % 1, ovum.position); ovum.position.z += 0.05;
      for (let i = 0; i < NS; i++) { const u = clamp(((t * 0.2 + i / NS) % 1), 0, 1); const q = path.getPointAt(1 - u * 0.75); sdm.position.set(q.x + Math.sin(t * 6 + i) * 0.04, q.y + Math.cos(t * 5 + i) * 0.04, q.z + (i % 3) * 0.03); sdm.scale.setScalar(1); sdm.updateMatrix(); sp.setMatrixAt(i, sdm.matrix); } sp.instanceMatrix.needsUpdate = true; }
    else if (P.gam) { for (let i = 0; i < NS; i++) { const u = (t * 0.1 + i / NS) % 1; curve.getPointAt(u, sdm.position); sdm.position.x += Math.sin(t * 6 + i) * 0.03; sdm.scale.setScalar(1); sdm.updateMatrix(); sp.setMatrixAt(i, sdm.matrix); } sp.instanceMatrix.needsUpdate = true; }
  };
  m.hud = () => m.mode === 'female' ? { title: 'Female reproductive system', lines: ['Ovaries release one ovum about every 28 days. If sperm fuse with it in the oviduct, the zygote travels to the uterus and implants.'] } : { title: 'Male reproductive system', lines: ['Sperm path: testis → epididymis → vas deferens → urethra → outside. Glands add fluids to make semen.'] };
  return m;
}

/* ================= MENSTRUAL CYCLE ================= */
const g = (d, c, w) => Math.exp(-Math.pow((d - c) / w, 2));
export const cycleCurves = {
  FSH: (d) => 0.16 + 0.34 * g(d, 4, 3.2) + 0.36 * g(d, 13.5, 1.3),
  LH: (d) => 0.1 + 0.95 * g(d, 13.7, 1.0) + 0.1 * g(d, 22, 3),
  Estrogen: (d) => 0.1 + 0.8 * g(d, 12.8, 2.5) + 0.38 * g(d, 21, 3.5),
  Progesterone: (d) => 0.04 + (d > 14 ? 0.86 * g(d, 21.5, 3.6) : 0),
};
export function cycle() {
  const m = createModel({ view: [0.1, 0.1, 1], zoom: 0.92, explodeScale: 0.7, autoRotate: false });
  const ovary = blob(1.35, organicMat(0xe0b0a0, { clearcoat: 0.5 }), { amp: 0.05, s: [1.1, 1.0, 0.9], seg: 56 }); ovary.position.set(-2.6, 0, 0);
  const og = new THREE.Group(); og.add(ovary);
  m.part('ovary', 'Ovary', 'Contains thousands of follicles at different stages. Each month one follicle matures and releases an ovum.', og, { back: true });
  const prim = new THREE.Group(); for (let k = 0; k < 6; k++) prim.add(sphere(0.09, glass(0xffe9c0, 0.9), -3.2 + (k % 3) * 0.55, -0.6 + Math.floor(k / 3) * 0.5, 0.55, 12)); m.part('primary', 'Primary follicles', 'Small resting follicles. FSH stimulates some of them to grow each cycle.', prim, {});
  const fol = new THREE.Group(), follicle = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), glass(0xffe7a8, 0.55, { clearcoat: 1 })), antrum = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 20), glass(0xfff5d0, 0.35)), oocyte = sphere(0.1, M(0xffb7c9, { emissive: 0x80304a, emissiveIntensity: 0.4 }), 0, 0, 0, 14); fol.add(follicle, antrum, oocyte); fol.position.set(-2.4, 0.2, 0.9);
  m.part('follicle', 'Graafian follicle', 'The mature follicle (days 6–13): a fluid-filled sac with the ovum. Secretes oestrogen. Ruptures at ovulation under the LH surge.', fol, { explode: V(0, 0.4, 0.6) });
  const cl = blob(0.5, organicMat(0xf5c542, { emissive: 0x6a5000, emissiveIntensity: 0.3 }), { amp: 0.1, seed: 4 }); cl.position.set(-2.4, 0.2, 0.8); m.part('cl', 'Corpus luteum', 'Remains of the follicle after ovulation. Secretes progesterone (and some oestrogen). Degenerates in 14 days if no pregnancy occurs.', cl, { explode: V(0, 0.4, 0.6) });
  const ovum = sphere(0.14, M(0xfff0c8, { emissive: 0x806a20, emissiveIntensity: 0.7 }), 0, 0, 0, 16); ovum.visible = false; m.part('ovum', 'Ovum (released egg)', 'Released at ovulation (about day 14). Survives 12–24 hours unless fertilised.', ovum, {});
  const ut = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), glass(0xd9707c, 0.4, { clearcoat: 1 })); ut.scale.set(1.9, 2.3, 1.2); ut.position.set(2.5, 0, 0); m.part('myo', 'Myometrium (uterine wall)', 'The thick muscular wall of the uterus. Contracts at childbirth.', ut, { back: true });
  const endo = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), organicMat(0xff7f93, { clearcoat: 0.6, emissive: 0x401018, emissiveIntensity: 0.2 })); endo.position.set(2.5, 0, 0); m.part('endo', 'Endometrium', 'Inner lining of the uterus. Thickens under oestrogen and progesterone to receive an embryo. Shed during menstruation if no implantation occurs.', endo, { });
  const blood = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), glow(0xff3050, 1.3), 40); m.group.add(blood);
  m.param({ id: 'day', label: 'Day of cycle', type: 'range', min: 1, max: 28, step: 0.05, value: 14, unit: '' });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false }); m.autoParams = ['day'];
  const dm = new THREE.Object3D(), rnd = mulberry(6), bs = Array.from({ length: 40 }, () => ({ o: rnd(), x: (rnd() - 0.5) * 1.2, y: (rnd() - 0.5) * 1.8 }));
  m.update = (P, t, dt) => {
    let d = P.day; if (P.play) { d = d + dt * 1.3; if (d > 28.95) d = 1; P.day = d; }
    // follicle
    const grow = d < 14 ? smooth(1, 13.5, d) : 0, r = 0.14 + 0.5 * grow; fol.visible = d < 14.0; fol.scale.setScalar(r); antrum.visible = grow > 0.3; fol.position.set(-2.6 + 0.9 * smooth(5, 13.5, d), 0.0 + 0.55 * smooth(5, 13.5, d), 0.4 + 0.55 * smooth(5, 13.5, d));
    const post = d >= 14, luteal = post ? (d < 24 ? smooth(14, 18, d) : 1 - smooth(24, 28, d)) : 0; cl.visible = post; cl.scale.setScalar(0.25 + 0.75 * luteal); cl.material.color.set(d > 26 ? 0xe9e1cf : 0xf5c542); cl.position.set(-1.7, 0.55, 0.9);
    ovum.visible = d >= 14 && d < 16.5; const k = clamp((d - 14) / 2.5, 0, 1); ovum.position.set(lerp(-1.6, 0.9, k), lerp(0.6, 1.4 + Math.sin(k * Math.PI) * 0.5, k), 0.9);
    // endometrium thickness: shed d1-5, grows 6-14, thick 15-26, falls 27-28
    let th; if (d < 5.5) th = 0.28 + 0.08 * (1 - d / 5.5); else if (d < 14) th = 0.28 + 0.38 * smooth(5, 14, d); else if (d < 26) th = 0.66 + 0.2 * smooth(14, 22, d); else th = 0.86 - 0.5 * smooth(26, 28.9, d);
    const inner = 0.97 - th * 0.55; endo.scale.set(1.9 * (0.38 + th * 0.55), 2.3 * (0.38 + th * 0.55), 1.2 * (0.38 + th * 0.55) * 0.9);
    const men = d < 5.8 || d > 27.2; blood.visible = men; if (men) { for (let i = 0; i < 40; i++) { const b = bs[i], u = (t * 0.5 + b.o) % 1; dm.position.set(2.5 + b.x * 0.8, b.y * 0.9 - u * 2.0 - 0.3, 0.3); dm.scale.setScalar(Math.sin(u * Math.PI)); dm.updateMatrix(); blood.setMatrixAt(i, dm.matrix); } blood.instanceMatrix.needsUpdate = true; }
    m.day = d;
  };
  const phase = (d) => d < 6 ? ['Menstruation (days 1–5)', 'The endometrium breaks down and is shed with blood. FSH begins to rise and new follicles start growing.'] : d < 13.5 ? ['Follicular / proliferative phase (6–13)', 'The follicle grows and secretes oestrogen. The endometrium rebuilds and thickens.'] : d < 15 ? ['Ovulation (day 14)', 'An LH surge makes the Graafian follicle rupture and release the ovum.'] : d < 27 ? ['Luteal / secretory phase (15–28)', 'The corpus luteum secretes progesterone. The endometrium becomes thick, rich in blood vessels and glands, ready for implantation.'] : ['Premenstrual', 'No fertilisation: the corpus luteum degenerates, hormone levels fall and the lining starts to break down.'];
  m.hud = (P) => { const p = phase(P.day); return { title: `Day ${Math.round(P.day)}: ${p[0]}`, lines: [p[1]], chart: true, day: P.day }; };
  return m;
}

/* ================= EMBRYO: FERTILISATION TO IMPLANTATION ================= */
const STAGES = ['Fertilisation', 'Zygote', '2-cell stage', '4-cell stage', '8-cell stage', 'Morula (16 cells)', 'Blastocyst', 'Implantation'];
const STXT = [
  'A sperm penetrates the zona pellucida and fuses with the ovum in the ampulla of the fallopian tube. Only one sperm fertilises the egg.',
  'The male and female pronuclei fuse. The single cell is the zygote (46 chromosomes). A second polar body is released.',
  'Cleavage: rapid mitotic divisions without growth. The embryo moves along the oviduct toward the uterus. About 30 hours.',
  'Four cells (blastomeres) of equal size, still inside the zona pellucida. About 40 hours.',
  'Eight cells. Cells compact and tighten against each other. About 3 days.',
  'A solid ball of 16 cells, the morula, enters the uterus about day 4.',
  'The hollow blastocyst: an outer trophoblast layer and an inner cell mass (which forms the embryo). Day 5–6.',
  'The trophoblast attaches and burrows into the endometrium. Implantation (about day 7) begins pregnancy; the placenta will form.',
];
export function embryo() {
  const m = createModel({ view: [0.3, 0.2, 1], zoom: 0.95, explodeScale: 0.7, sliceable: false, floor: true });
  const zona = new THREE.Mesh(new THREE.SphereGeometry(1.75, 56, 40), glass(0xfff2c8, 0.18, { roughness: 0.2, clearcoat: 1 }));
  m.part('zona', 'Zona pellucida', 'Thick transparent glycoprotein coat around the ovum. Sperm must bind to it. It is shed (hatching) before implantation.', zona, { back: true });
  const corona = new THREE.Group(); const rn = mulberry(2); for (let i = 0; i < 70; i++) { const th = rn() * TAU, ph = Math.acos(2 * rn() - 1), r = 1.9; corona.add(sphere(0.1, organicMat(0xffd6e0, { transparent: true, opacity: 0.85 }), r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th), 10)); }
  m.part('corona', 'Corona radiata', 'Layer of follicle cells that surrounds the ovum after ovulation.', corona, { explode: V(0, 0, 0), spread: 0.6 });
  const cellMat = (c) => organicMat(c, { transparent: true, opacity: 0.92, clearcoat: 0.8, roughness: 0.35 });
  const cg = new THREE.Group(), cells = []; const NC = 44;
  for (let i = 0; i < NC; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), cellMat(0xffb3c6)); cg.add(c); cells.push(c); }
  m.part('cells', 'Blastomeres / cells', 'The cells of the early embryo. At the 8-cell stage they are totipotent (can form any cell).', cg, { });
  const pn = [sphere(0.28, organicMat(0x8e5cff), 0, 0, 0, 18), sphere(0.28, organicMat(0x5cc7ff), 0, 0, 0, 18)]; const pg = new THREE.Group(); pn.forEach((p) => pg.add(p)); m.part('pronuc', 'Pronuclei', 'Haploid (23 chromosomes each) nuclei of the sperm and egg before they fuse.', pg, {});
  const sperm = new THREE.Group(), sh = sphere(0.14, M(0x8fe3ff, { emissive: 0x1a6a8a, emissiveIntensity: 0.6 }), 0, 0, 0, 14); sh.scale.set(1, 0.8, 0.7); sperm.add(sh); const tail = []; for (let i = 0; i < 12; i++) { const s = sphere(0.05 - i * 0.002, M(0x8fe3ff), 0, 0, 0, 8); sperm.add(s); tail.push(s); }
  m.part('sperm', 'Sperm', 'Male gamete: head with nucleus and acrosome (enzymes that digest the zona), middle piece with mitochondria, and a tail for swimming.', sperm, {});
  const endo = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 5, 1, 1, 1), organicMat(0xff7f93)); endo.position.set(0, -4.2, 0); endo.visible = false; m.part('endo', 'Endometrium', 'The thick, blood-rich uterine lining into which the blastocyst embeds.', endo, { });
  const villi = new THREE.Group(); for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; villi.add(tubeAlong([V(Math.cos(a) * 0.9, -1.0, Math.sin(a) * 0.9), V(Math.cos(a) * 1.2, -1.5, Math.sin(a) * 1.2)], 0.04, organicMat(0xf0c0c8), { radial: 6, seg: 8 })); } villi.visible = false; m.group.add(villi);
  // targets
  const fib = (n, r) => Array.from({ length: n }, (_, i) => { const y = 1 - (i + 0.5) * 2 / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996; return V(Math.cos(a) * rr * r, y * r, Math.sin(a) * rr * r); });
  const T = [
    [[V(0, 0, 0)], 1.25], [[V(0, 0, 0)], 1.1],
    [[V(-0.62, 0, 0), V(0.62, 0, 0)], 0.76],
    [[V(0.5, 0.5, 0.0), V(-0.5, 0.5, 0.0), V(0, -0.5, 0.5), V(0, -0.5, -0.5)], 0.62],
    [[...[-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => V(x * 0.52, y * 0.52, z * 0.52))))], 0.5],
    [[...fib(16, 0.92)], 0.4],
    [[...fib(34, 1.35), ...fib(8, 0.7).map((v) => v.multiplyScalar(0.6).add(V(0, 0.75, 0)))], 0.26],
    [[...fib(34, 1.35), ...fib(8, 0.7).map((v) => v.multiplyScalar(0.6).add(V(0, 0.75, 0)))], 0.26],
  ];
  const icm = new Set(); for (let i = 34; i < 42; i++) icm.add(i);
  m.param({ id: 'stage', label: 'Stage of development', type: 'range', min: 0, max: 7, step: 0.005, value: 5.2 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false }); m.autoParams = ['stage'];
  const cur = cells.map(() => ({ p: V(), r: 0 }));
  m.update = (P, t, dt) => {
    let s = P.stage; if (P.play) { s = (s + dt * 0.35) % 7.99; P.stage = s; }
    const a = Math.min(7, Math.floor(s)), b = Math.min(7, a + 1), f = smooth(0.15, 0.85, s - a);
    const A = T[a], B = T[b];
    cells.forEach((c, i) => {
      const pa = A[0][i % A[0].length], ra = i < A[0].length ? A[1] : 0, pb = B[0][i % B[0].length], rb = i < B[0].length ? B[1] : 0;
      const pos = pa.clone().lerp(pb, f), r = lerp(ra, rb, f); const isI = icm.has(i) && s >= 5.5; c.position.copy(pos); c.scale.setScalar(Math.max(r, 0.0001)); c.visible = r > 0.01; c.material.color.setHex(isI ? 0x62b3ff : (s > 5.5 && i < 34 ? 0xffd2a6 : 0xffb3c6));
    });
    const fuseP = smooth(0.0, 1.0, s), pronu = s < 1.6; pg.visible = pronu; pn[0].position.set(lerp(-0.9, -0.12, smooth(0, 1.05, s)), 0, 0); pn[1].position.set(lerp(0.9, 0.12, smooth(0, 1.05, s)), 0, 0);
    cells[0].visible = s >= 0.7 || s > 0; cells[0].scale.setScalar(s < 0.7 ? 1.25 : Math.max(0.0001, cells[0].scale.x)); cells[0].material.opacity = s < 1.0 ? 0.55 : 0.92;
    // sperm
    sperm.visible = s < 0.9; const k = smooth(0, 0.7, s); sperm.position.set(lerp(-3.4, -1.9, k), lerp(1.4, 0.2, k), 0); tail.forEach((q, i) => { q.position.set(-0.2 - i * 0.12, Math.sin(t * 12 - i * 0.7) * 0.07 * (i / 12 + 0.3), 0); });
    sperm.rotation.z = lerp(0.5, 0.15, k);
    zona.visible = s < 6.8; zona.material.opacity = 0.18 * (1 - smooth(6.2, 6.8, s)); zona.scale.setScalar(1 + 0.1 * smooth(5.8, 6.4, s));
    corona.visible = s < 0.9; corona.children.forEach((c) => c.material && (c.material.opacity = 0.85 * (1 - smooth(0.5, 0.9, s))));
    const imp = smooth(6.5, 7, s); endo.visible = s > 6.4; cg.position.y = -imp * 2.5; cg.rotation.y = t * 0.1; cg.position.x = 0; villi.visible = s > 6.7; villi.position.y = -imp * 2.5 + 0.8; endo.position.y = -4.0 + 0.0;
    cg.scale.setScalar(1);
  };
  m.hud = (P) => { const i = Math.min(7, Math.floor(P.stage + 0.001)); return { title: STAGES[i], lines: [STXT[i]], stages: STAGES, idx: i }; };
  return m;
}
export { STAGES };
