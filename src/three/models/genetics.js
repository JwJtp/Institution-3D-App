import * as THREE from 'three';
import { createModel, organicMat, M, glow, glass, blob, tubeAlong, sphere, cyl, setCyl, textSprite, V, fbm, noise3, smooth, clamp, lerp, mulberry, TAU } from '../kit.js';

const BASE_COL = { A: 0x4ade80, T: 0xf87171, G: 0xfacc15, C: 0x60a5fa, U: 0xf49ad2 };
const COMP = { A: 'T', T: 'A', G: 'C', C: 'G' };

/* ================= DNA: structure & replication ================= */
export function dna(mode = 'structure') {
  const m = createModel({ mode, view: [1, 0.15, 0.55], zoom: mode === 'structure' ? 1.1 : 1.05, explodeScale: 0.8, autoRotate: true, floor: true });
  const N = 28, rise = 0.33, turn = 0.6, rnd = mulberry(mode === 'structure' ? 33 : 91);
  const seq = Array.from({ length: N }, () => 'ATGC'[Math.floor(rnd() * 4)]);
  const phosMat = M(0xffc857, { metalness: 0.2, roughness: 0.3, emissive: 0x6a4a00, emissiveIntensity: 0.25 });
  const sugarMat = M(0xf4ecd8, { roughness: 0.5 });
  const linkMat = M(0xd4a53a, { roughness: 0.4 });
  const bb = new THREE.Group(), atG = new THREE.Group(), gcG = new THREE.Group(), hb = new THREE.Group(), lead = new THREE.Group(), lag = new THREE.Group();
  const S = [];  // per pair state
  const baseGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 12);
  for (let i = 0; i < N; i++) {
    const row = { i, ph: [], su: [], base: [], nb: [], np: [], hb: [], link: [], nlink: [] };
    for (let j = 0; j < 2; j++) {
      const t = j ? COMP[seq[i]] : seq[i];
      row.ph.push(sphere(0.14, phosMat, 0, 0, 0, 14)); row.su.push(sphere(0.085, sugarMat, 0, 0, 0, 10));
      const b = new THREE.Mesh(baseGeo, M(BASE_COL[t], { roughness: 0.35 })); b.userData.t = t; row.base.push(b);
      row.link.push(cyl(V(), V(0, 1, 0), 0.05, linkMat, 8));
      bb.add(row.ph[j], row.su[j], row.link[j]);
      (t === 'A' || t === 'T' ? atG : gcG).add(b);
      const nb = new THREE.Mesh(baseGeo, M(BASE_COL[COMP[t]], { roughness: 0.3, emissive: BASE_COL[COMP[t]], emissiveIntensity: 0.25 })); nb.visible = false; row.nb.push(nb);
      const np = sphere(0.13, M(j ? 0xff7ab6 : 0x7ae0ff, { emissive: j ? 0xff2d85 : 0x20a8d8, emissiveIntensity: 0.5 }), 0, 0, 0, 12); row.np.push(np);
      const nl = cyl(V(), V(0, 1, 0), 0.05, M(j ? 0xff7ab6 : 0x7ae0ff), 8); row.nlink.push(nl);
      (j ? lag : lead).add(nb, np, nl);
    }
    const n = seq[i] === 'A' || seq[i] === 'T' ? 2 : 3;
    for (let k = 0; k < n; k++) { const d = sphere(0.035, M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), 0, 0, 0, 6); row.hb.push(d); hb.add(d); }
    S.push(row);
  }
  m.part('backbone', 'Sugar-phosphate backbone', 'Alternating deoxyribose sugar and phosphate groups joined by phosphodiester bonds. Forms the two outer rails. The strands run antiparallel (5′→3′ and 3′→5′).', bb, { explode: V(0, 0, 0) });
  m.part('at', 'A–T base pairs', 'Adenine pairs with thymine through 2 hydrogen bonds.', atG);
  m.part('gc', 'G–C base pairs', 'Guanine pairs with cytosine through 3 hydrogen bonds. More G–C makes DNA more stable.', gcG);
  m.part('hbond', 'Hydrogen bonds', 'Weak bonds holding the two strands together. They can be broken easily by the enzyme helicase.', hb);
  // replication-only parts
  const hel = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.2, 14, 36), organicMat(0xff9d4a)); ring.rotation.x = Math.PI / 2; const cone = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.9, 24), organicMat(0xff9d4a)); cone.position.y = 0.55; hel.add(ring, cone);
  m.part('helicase', 'Helicase', 'Enzyme that unwinds the double helix by breaking hydrogen bonds, forming the replication fork.', hel, { mode: 'replication' });
  const pol = new THREE.Group(); [0, 1].forEach(() => pol.add(blob(0.55, organicMat(0x9d7bff, { clearcoat: 0.8 }), { amp: 0.08, seed: 4, s: [1, 0.8, 1.1] })));
  m.part('polymerase', 'DNA polymerase', 'Adds complementary nucleotides to the 3′ end of the new strand. It reads the template 3′→5′ and builds 5′→3′.', pol, { mode: 'replication' });
  m.part('lead', 'New leading strand', 'Built continuously in the same direction as the fork opens.', lead, { mode: 'replication' });
  m.part('lag', 'New lagging strand', 'Built in short pieces (Okazaki fragments) away from the fork. DNA ligase joins them.', lag, { mode: 'replication' });
  if (mode === 'structure') { [['5′', 1, 1], ['3′', 1, -1]].forEach(([t, j, s]) => { const sp = textSprite(t, { size: 0.5, color: '#ffd479' }); sp.position.set(1.4, s * N * rise * 0.5 + s * 0.3, 0); m.add(sp); }); }
  m.param({ id: 'unzip', label: mode === 'structure' ? 'Unzip the helix' : 'Replication fork', type: 'range', min: 0, max: 1, step: 0.01, value: mode === 'structure' ? 0 : 0.35 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false });
  m.autoParams = ['unzip'];
  const tmp = V();
  m.update = (P, t, dt) => {
    let u = P.unzip; if (P.play) { u = (u + dt * 0.07) % 1.0; P.unzip = u; }
    const k = u * (N + 4) - 2; // fork pair index
    const H = (N - 1) * rise * 0.5;
    S.forEach((row, i) => {
      const o = smooth(0, 2.6, k - i), a = i * turn, y = i * rise - H;
      const R = 1 + o * 1.0;
      const rep = mode === 'replication';
      for (let j = 0; j < 2; j++) {
        const ang = a + j * Math.PI, c = Math.cos(ang), s = Math.sin(ang);
        row.ph[j].position.set(c * R * 1.0, y, s * R); row.su[j].position.set(c * R * 0.82, y, s * R * 0.82);
        const bs = V(c * R * 0.82, y, s * R * 0.82), be = V(c * (R * 0.82 - 0.82), y, s * (R * 0.82 - 0.82));
        const b = row.base[j]; b.position.copy(bs).add(be).multiplyScalar(0.5); b.scale.set(1, 0.82, 1); b.quaternion.setFromUnitVectors(V(0, 1, 0), tmp.copy(be).sub(bs).normalize());
        if (i > 0) { const pr = S[i - 1].ph[j].position; setCyl(row.link[j], pr, row.ph[j].position); row.link[j].visible = true; } else row.link[j].visible = false;
        // new strand
        const vis = rep && o > 0.5, grow = smooth(0.5, 0.95, o);
        const ns = V(c * (R * 0.82 - 0.82), y, s * (R * 0.82 - 0.82)), ne = V(c * (R * 0.82 - 1.3), y, s * (R * 0.82 - 1.3));
        const nb = row.nb[j]; nb.visible = vis; nb.position.copy(ns).add(ne).multiplyScalar(0.5); nb.scale.set(1, 0.48 * grow + 0.001, 1); nb.quaternion.setFromUnitVectors(V(0, 1, 0), tmp.copy(ne).sub(ns).normalize());
        const np = row.np[j]; np.visible = vis; np.position.set(c * (R * 0.82 - 1.45), y, s * (R * 0.82 - 1.45)); np.scale.setScalar(grow + 0.001);
        const nl = row.nlink[j]; const prev = i > 0 ? S[i - 1].np[j] : null; const gap = j === 1 && i % 7 === 0;
        nl.visible = vis && !!prev && prev.visible && !gap; if (nl.visible) setCyl(nl, prev.position, np.position);
      }
      // hydrogen bonds
      row.hb.forEach((d, k2) => { d.visible = o < 0.35; d.position.set(0, y + (k2 - (row.hb.length - 1) / 2) * 0.09, 0); });
    });
    // helicase and polymerase at the fork
    const fi = clamp(k - 0.4, 0, N - 1), fy = fi * rise - H, fa = fi * turn;
    hel.position.set(0, fy + 0.2, 0); hel.rotation.y = -t * 0.8;
    const pi = clamp(k - 4, 0, N - 1); pol.children.forEach((c, j) => { const ang = pi * turn + j * Math.PI, Rr = 1 + smooth(0, 2.6, k - pi); c.position.set(Math.cos(ang) * (Rr * 0.82 - 1.0), pi * rise - H, Math.sin(ang) * (Rr * 0.82 - 1.0)); });
  };
  m.hud = (P) => ({ title: mode === 'structure' ? 'Double helix' : 'Semi-conservative replication', lines: mode === 'structure' ? ['10 base pairs per turn · 3.4 nm per 10 bp.', 'A–T: 2 bonds · G–C: 3 bonds'] : ['Each new DNA has one old strand and one new strand.', 'Leading strand: continuous. Lagging strand: Okazaki fragments.'] });
  return m;
}

/* ================= TRANSLATION ================= */
const CODONS = [['AUG', 'Met', 0xff8a65], ['GCU', 'Ala', 0x66d9a0], ['UUC', 'Phe', 0x7aa8ff], ['GGA', 'Gly', 0xf2c94c], ['AAG', 'Lys', 0xc58cf0], ['CUG', 'Leu', 0xff7aa8], ['GAC', 'Asp', 0x5ed3d9], ['CCA', 'Pro', 0xb8e068], ['AGU', 'Ser', 0xf59a56], ['UGG', 'Trp', 0xe879d0], ['GUC', 'Val', 0x7ee0b0], ['UAA', 'STOP', 0x888888]];
const ANTI = (c) => c.split('').map((x) => ({ A: 'U', U: 'A', G: 'C', C: 'G' }[x])).join('');
export function translation() {
  const m = createModel({ view: [0.15, 0.55, 1], zoom: 0.95, explodeScale: 0.6, autoRotate: false });
  const SP = 0.95, X0 = -5.2, n = CODONS.length, cx = (i) => X0 + i * SP + SP * 0.5;
  const mr = new THREE.Group(); const back = tubeAlong(Array.from({ length: n * 3 + 1 }, (_, i) => V(X0 + i * SP / 3, -0.02, 0)), 0.04, M(0xf9d6e8), { radial: 6, seg: 160 }); mr.add(back);
  const codonObj = [];
  CODONS.forEach((c, i) => { const g = new THREE.Group(); c[0].split('').forEach((b, k) => { const s = sphere(0.14, M(BASE_COL[b], { roughness: 0.3 }), X0 + (i * 3 + k + 0.5) * SP / 3, 0, 0, 14); g.add(s); }); mr.add(g); codonObj.push(g); });
  m.part('mrna', 'mRNA', 'Messenger RNA carries the code copied from DNA. Every three bases form a codon that specifies one amino acid.', mr, { explode: V(0, -1.2, 0) });
  m.part('start', 'Start codon (AUG)', 'AUG signals where translation begins and codes for methionine.', (() => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 28), glow(0x9affc0, 1.2)); t.position.set(cx(0), 0, 0); t.rotation.y = Math.PI / 2; return t; })());
  m.part('stop', 'Stop codon (UAA)', 'UAA, UAG and UGA do not code for an amino acid. They tell the ribosome to release the finished chain.', (() => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 28), glow(0xff6b6b, 1.2)); t.position.set(cx(n - 1), 0, 0); t.rotation.y = Math.PI / 2; return t; })());
  const ribo = new THREE.Group();
  const large = blob(1.0, organicMat(0x6b8cff, { clearcoat: 0.8 }), { s: [2.0, 1.1, 1.5], amp: 0.06, seed: 5 }); large.position.y = 0.95;
  const small = blob(0.8, organicMat(0xffb36b, { clearcoat: 0.8 }), { s: [2.1, 0.6, 1.3], amp: 0.06, seed: 6 }); small.position.y = -0.62;
  const rl = new THREE.Group(), rs = new THREE.Group(); rl.add(large); rs.add(small); ribo.add(rl, rs); m.add(ribo);
  m.part('large', 'Large subunit', 'Holds the P and A sites where tRNAs sit and catalyses peptide bond formation.', rl, { explode: V(0, 1.4, 0) });
  m.part('small', 'Small subunit', 'Binds the mRNA and checks codon–anticodon pairing.', rs, { explode: V(0, -1.4, 0) });
  const trna = () => { const g = new THREE.Group(); const mt = organicMat(0x5fe3a1); g.add(tubeAlong([V(0, 0.25, 0), V(0, 0.85, 0)], 0.045, mt, { radial: 6, seg: 8 }), tubeAlong([V(-0.35, 0.55, 0), V(0.35, 0.55, 0)], 0.04, mt, { radial: 6, seg: 8 }), tubeAlong([V(0, 0.25, 0), V(0, -0.05, 0)], 0.045, mt, { radial: 6, seg: 8 })); [0, 1, 2].forEach((k) => g.add(sphere(0.09, M(0x2dbd7e), (k - 1) * 0.28 * 0.32, -0.12 - 0.0, 0, 10))); const aa = sphere(0.14, M(0xffffff), 0, 0.95, 0, 14); aa.name = 'aa'; g.add(aa); return g; };
  const tP = trna(), tA = trna(), tE = trna(); const tg = new THREE.Group(); tg.add(tP, tA, tE); m.part('trna', 'tRNA', 'Transfer RNA: clover-leaf molecule. One end carries a specific amino acid, the other has the anticodon that pairs with the mRNA codon.', tg);
  const chain = new THREE.Group(); const beads = Array.from({ length: n }, (_, i) => { const b = sphere(0.15, M(CODONS[i][2], { clearcoat: 0.8 }), 0, 0, 0, 14); chain.add(b); return b; });
  const link = Array.from({ length: n }, () => { const c = cyl(V(), V(0, 1, 0), 0.05, M(0xffffff), 8); chain.add(c); return c; });
  m.part('chain', 'Polypeptide chain', 'Amino acids joined by peptide bonds. The chain folds into a protein once released.', chain, { explode: V(0, 1.5, 0) });
  m.param({ id: 'step', label: 'Codons translated', type: 'range', min: 0, max: 11, step: 0.01, value: 3.4, unit: '' });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false });
  m.autoParams = ['step'];
  m.update = (P, t, dt) => {
    let s = P.step; if (P.play) { s = (s + dt * 0.45) % 11; P.step = s; }
    const nI = Math.floor(s), f = s - nI;
    const mv = smooth(0.6, 1.0, f), rx = cx(nI) + 0.5 * SP * 0 + mv * SP + 0.0; // P site codon = nI, after translocation = nI+1
    ribo.position.set(cx(nI + 0) + mv * SP + SP * 0.0 - 0.0, 0, 0);
    // sites: P at ribo.x - SP*0.5 ; A at ribo.x + SP*0.5 ; E at ribo.x - SP*1.5
    const rbx = ribo.position.x; ribo.position.x = rbx + SP * 0.5;
    const px = ribo.position.x - SP, ax = ribo.position.x;
    const place = (g, x, codon) => { g.position.set(x, 0, 0); const aa = g.getObjectByName('aa'); if (aa) aa.material.color.setHex(CODONS[codon][2]); };
    place(tP, px + 0, Math.min(nI, n - 1)); place(tA, ax, Math.min(nI + 1, n - 1)); tE.position.set(px - SP, 0, 0); place(tE, px - SP, Math.max(nI - 1, 0));
    tE.visible = nI > 0 && f > 0.55 || nI > 0; tE.children.forEach((c) => { if (c.material) c.material.opacity = 1; });
    const inc = 1 - smooth(0, 0.45, f); tA.position.y = inc * 1.8; tA.position.x = ax + inc * 1.6; tA.visible = nI + 1 < n;
    // chain: nI amino acids, hanging from P tRNA, snaking up-left
    const cnt = clamp(nI + (f > 0.5 ? 1 : 0) , 0, 11);
    beads.forEach((b, i) => { b.visible = i < cnt; const u = i / 11; b.position.set(px - 0.1 - (cnt - 1 - i) * 0.34, 1.0 + 0.9 + Math.sin((cnt - 1 - i) * 0.6) * 0.18 + (cnt - 1 - i) * 0.05, 0.0); if (i === cnt - 1) b.position.set(px, 0.95 + 0.95 * 0 + 0.0, 0).setY(0.95); });
    link.forEach((c, i) => { c.visible = i > 0 && i < cnt; if (c.visible) setCyl(c, beads[i - 1].position, beads[i].position); });
    large.parent.position.y = 0; small.parent.position.y = 0;
  };
  m.hud = (P) => { const i = Math.min(11, Math.floor(P.step + 0.0001)), c = CODONS[Math.min(11, i + 1)]; const cur = CODONS[Math.min(11, i)]; return { title: `Codon ${cur[0]} → ${cur[1]}`, lines: [`Anticodon on tRNA: ${ANTI(cur[0])}`, `Amino acids added: ${Math.min(11, i + (P.step % 1 > 0.5 ? 1 : 0))} of 11`] }; };
  return m;
}

/* ================= MENDEL ================= */
function pea(tall, seed = 0, flower = 0xc9a0ff) {
  const g = new THREE.Group(); const h = tall ? 1.7 : 0.75, mt = organicMat(0x3fae56);
  g.add(tubeAlong([V(0, 0, 0), V(0.04 * (seed % 3 - 1), h * 0.5, 0.03), V(0, h, 0)], 0.05, mt, { radial: 8, seg: 16 }));
  for (let i = 0; i < 4; i++) { const y = h * (0.3 + i * 0.17), a = i * 2.1 + seed; const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), organicMat(0x56c76f)); l.scale.set(1.6, 0.14, 0.9); l.position.set(Math.cos(a) * 0.28, y, Math.sin(a) * 0.28); l.rotation.y = -a; l.rotation.z = 0.25; g.add(l); }
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), organicMat(flower)); fl.position.set(0, h + 0.05, 0); fl.scale.set(1, 0.8, 1); g.add(fl);
  return g;
}
export function mendel() {
  const m = createModel({ view: [0, 1.4, 0.9], zoom: 0.78, explodeScale: 0.6, floor: true });
  const gens = ['TT', 'Tt', 'tt'];
  const parents = new THREE.Group(), gametes = new THREE.Group(), grid = new THREE.Group(), kids = new THREE.Group();
  m.part('parents', 'Parent plants (P generation)', 'Each parent has two alleles for height. T (tall) is dominant over t (dwarf).', parents, { explode: V(0, 0.6, -0.4) });
  m.part('gametes', 'Gametes', 'During gamete formation the two alleles of a gene separate (law of segregation): each gamete gets only one.', gametes, { explode: V(0, 0.7, 0) });
  m.part('punnett', 'Punnett square', 'A grid that shows all the possible combinations of gametes and the resulting genotypes.', grid, { explode: V(0, -0.3, 0) });
  m.part('f1', 'Offspring (F1 generation)', 'Tall plants have genotype TT or Tt. Dwarf plants are only tt. Genotype and phenotype ratios follow from the grid.', kids, { explode: V(0, 0.9, 0.5) });
  m.param({ id: 'p1', label: 'Parent 1 genotype', type: 'buttons', value: 'Tt', options: gens.map((g) => [g, g]) });
  m.param({ id: 'p2', label: 'Parent 2 genotype', type: 'buttons', value: 'Tt', options: gens.map((g) => [g, g]) });
  const clear = (g) => { while (g.children.length) { const o = g.children.pop(); o.traverse((n) => { if (n.geometry) n.geometry.dispose(); }); } };
  let info = { tall: 3, dwarf: 1, geno: {} };
  function rebuild(P) {
    [parents, gametes, grid, kids].forEach(clear); const A = P.p1, B = P.p2;
    const pt = (gt, x) => { const p = pea(gt.includes('T'), x); p.position.set(x, 0, -3.1); parents.add(p); const s = textSprite(gt, { size: 0.55, color: '#ffd479' }); s.position.set(x, 2.2, -3.1); parents.add(s); };
    pt(A, -2.6); pt(B, 2.6);
    const sg = (ch, x, z, col) => { const s = textSprite(ch, { size: 0.6, color: col }); s.position.set(x, 0.6, z); gametes.add(s); };
    const geno = {}; let tall = 0;
    for (let c = 0; c < 2; c++) { sg(A[c], -1.1 + c * 2.2, -1.5, A[c] === 'T' ? '#7ae0a0' : '#ff9a9a'); sg(B[c], -3.5, 0.0 + c * 2.2 + 0.2 - 0.2 + 0, B[c] === 'T' ? '#7ae0a0' : '#ff9a9a'); }
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 2), M(0x14233d, { roughness: 0.5, clearcoat: 0.6 })); tile.position.set(-1.1 + c * 2.2, -0.06, r * 2.2); grid.add(tile);
      const gt = [A[c], B[r]].sort((x, y) => (x === y ? 0 : x === 'T' ? -1 : 1)).join(''), isT = gt.includes('T'); if (isT) tall++; geno[gt] = (geno[gt] || 0) + 1;
      const p = pea(isT, r * 2 + c, isT ? 0xc9a0ff : 0xffffff); p.position.set(-1.1 + c * 2.2, 0, r * 2.2 + 0.1); kids.add(p);
      const s = textSprite(gt, { size: 0.42, color: isT ? '#c4f5d3' : '#ffd0d0' }); s.position.set(-1.1 + c * 2.2, (isT ? 2.1 : 1.2), r * 2.2 + 0.1); kids.add(s);
    }
    info = { tall, dwarf: 4 - tall, geno };
    m.group.children.forEach(() => {});
  }
  m.onParam = (id, v, P) => rebuild(P);
  m.hud = (P) => { const g = info.geno; const gs = Object.keys(g).map((k) => `${g[k]} ${k}`).join(' : '); const ph = info.tall && info.dwarf ? `${info.tall} tall : ${info.dwarf} dwarf` : info.tall ? 'All tall' : 'All dwarf'; return { title: `${P.p1} × ${P.p2}`, lines: [`Genotypes: ${gs}`, `Phenotypes: ${ph}`] }; };
  m.update = null;
  return m;
}

/* ================= ASEXUAL REPRODUCTION ================= */
export function fission() {
  const m = createModel({ mode: 'binary', view: [0.2, 0.5, 1], zoom: 0.95, floor: true, explodeScale: 0.6 });
  const body = organicMat(0x7fe0d0, { transparent: true, opacity: 0.72, clearcoat: 1, roughness: 0.2 }), nmat = organicMat(0x7a52d9), nuc2 = organicMat(0x5b3cb0);
  const cellA = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 34), body), cellB = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 34), body), neck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24), body);
  neck.rotation.z = Math.PI / 2; const nA = sphere(0.38, nmat, 0, 0, 0, 22), nB = sphere(0.38, nmat, 0, 0, 0, 22);
  const bin = new THREE.Group(); bin.add(cellA, cellB, neck); const binN = new THREE.Group(); binN.add(nA, nB);
  m.part('b_cell', 'Parent cell (Amoeba)', 'In binary fission, a single cell divides into two equal daughter cells. Amoeba divides in any plane; Leishmania along a fixed plane.', bin, { mode: 'binary', back: true });
  m.part('b_nuc', 'Nucleus', 'The nucleus divides first by mitosis. Then the cytoplasm constricts and splits.', binN, { mode: 'binary' });
  const mult = new THREE.Group(), cyst = new THREE.Mesh(new THREE.SphereGeometry(2, 48, 34), glass(0xff9fb6, 0.25)), mnuc = new THREE.Group(), daughters = new THREE.Group();
  const fib = []; for (let i = 0; i < 16; i++) { const y = 1 - (i + 0.5) / 8, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996; fib.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
  fib.forEach((v, i) => { mnuc.add(sphere(0.2, nmat, v.x * 1.1, v.y * 1.1, v.z * 1.1, 14)); const d = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), body); d.visible = false; d.userData.dir = v; daughters.add(d); });
  mult.add(cyst, daughters);
  m.part('m_cyst', 'Parent cell (Plasmodium)', 'In multiple fission, the nucleus divides many times first. The cytoplasm then splits around each nucleus, giving many daughter cells at once (Plasmodium, malaria parasite).', mult, { mode: 'multiple', back: true });
  m.part('m_nuc', 'Dividing nuclei', 'Nucleus divides repeatedly: 1 → 2 → 4 → 8 → 16.', mnuc, { mode: 'multiple' });
  const par = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 34), organicMat(0xf2d27a, { transparent: true, opacity: 0.85 })), bud = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), organicMat(0xf5dc90, { transparent: true, opacity: 0.85 }));
  const pn = sphere(0.35, nmat, 0, 0, 0, 20), bn = sphere(0.2, nmat, 0, 0, 0, 16);
  const budG = new THREE.Group(); budG.add(par, bud); const budN = new THREE.Group(); budN.add(pn, bn);
  m.part('y_cell', 'Parent cell and bud (Yeast)', 'In budding, a small outgrowth (bud) forms on the parent. It grows, receives a copy of the nucleus and then separates. Seen in yeast and Hydra.', budG, { mode: 'budding', back: true });
  m.part('y_nuc', 'Nucleus', 'The parent nucleus divides and one daughter nucleus moves into the bud.', budN, { mode: 'budding' });
  m.param({ id: 'mode', label: 'Type of reproduction', type: 'buttons', value: 'binary', options: [['binary', 'Binary fission'], ['multiple', 'Multiple fission'], ['budding', 'Budding']] });
  m.param({ id: 'prog', label: 'Progress', type: 'range', min: 0, max: 1, step: 0.005, value: 0.4 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: false });
  m.autoParams = ['prog'];
  const TXT = { binary: 'Amoeba: nucleus divides, cell elongates, pinches into two.', multiple: 'Plasmodium: many nuclei form, then the cell splits into many daughters.', budding: 'Yeast: a bud grows, gets a nucleus and breaks off.' };
  m.update = (P, t, dt) => {
    let p = P.prog; if (P.play) { p = (p + dt * 0.12) % 1; P.prog = p; }
    const mode = m.mode;
    if (mode === 'binary') {
      const d = smooth(0.15, 0.85, p) * 1.15, R = 1.15 - 0.15 * smooth(0.2, 0.9, p), nk = 1 - smooth(0.45, 0.88, p), sep = smooth(0.85, 1.0, p);
      cellA.position.set(-d - sep * 0.5, 0, 0); cellB.position.set(d + sep * 0.5, 0, 0); cellA.scale.setScalar(R * (1 + Math.sin(t * 2) * 0.02)); cellB.scale.setScalar(R);
      cellA.scale.x *= 1 + 0.2 * (1 - smooth(0.3, 0.9, p)); cellB.scale.x = cellA.scale.x; neck.position.set(0, 0, 0); neck.scale.set(Math.max(0.001, 1.0 * nk * R * 0.95), Math.max(0.001, 2 * d), Math.max(0.001, 1.0 * nk * R * 0.95)); neck.visible = nk > 0.05;
      const nd = smooth(0.1, 0.6, p) * (d * 0.9 + 0.1); nA.position.set(-nd, 0, 0); nB.position.set(nd, 0, 0); nB.visible = p > 0.08; nA.position.x -= sep * 0.5; nB.position.x += sep * 0.5;
    } else if (mode === 'multiple') {
      const k = Math.floor(p * 4.9), cnt = Math.min(16, Math.pow(2, k)), spread = smooth(0.78, 1.0, p);
      mnuc.children.forEach((n, i) => { n.visible = i < cnt && p < 0.99; const v = fib[i]; const s = cnt === 1 ? 0 : 0.6 + 0.2 * Math.sin(t + i); n.position.set(v.x * s * 1.1, v.y * s * 1.1, v.z * s * 1.1); });
      cyst.visible = p < 0.82; cyst.scale.setScalar(1 + 0.05 * Math.sin(t * 2) + 0.15 * smooth(0.6, 0.8, p));
      daughters.children.forEach((d, i) => { d.visible = p > 0.72; const v = fib[i]; const s = 0.55 + spread * 1.6; d.position.set(v.x * s, v.y * s, v.z * s); d.scale.setScalar(0.35 + 0.65 * smooth(0.72, 0.85, p)); });
    } else {
      const g = smooth(0.1, 0.7, p), sep = smooth(0.88, 1, p); par.scale.setScalar(1.25); bud.scale.setScalar(0.12 + 0.62 * g); bud.position.set(1.25 * 0.95 + 0.6 * g + sep * 0.5, 0.2 * g, 0); par.position.set(-0.35, 0, 0);
      pn.position.set(-0.35 - smooth(0.2, 0.6, p) * 0.1, 0, 0); bn.visible = p > 0.3; const mv = smooth(0.35, 0.8, p); bn.position.set(lerp(-0.1, bud.position.x, mv), lerp(0, bud.position.y, mv), 0); bn.scale.setScalar(0.5 + 0.5 * mv);
    }
  };
  m.hud = (P) => ({ title: { binary: 'Binary fission', multiple: 'Multiple fission', budding: 'Budding' }[P.mode], lines: [TXT[P.mode]] });
  return m;
}
