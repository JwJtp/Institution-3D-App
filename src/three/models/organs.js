import * as THREE from 'three';
import { createModel, organicMat, M, glow, glass, blob, tubeAlong, sphere, cyl, setCyl, V, fbm, noise3, smooth, clamp, lerp, mulberry, TAU, displace } from '../kit.js';

const PINK = 0xe99aa2, TAN = 0xe0b48a;

/* ================= DIGESTIVE SYSTEM ================= */
export function digestive() {
  const m = createModel({ view: [0.1, 0.1, 1], zoom: 0.95, explodeScale: 1.1, autoRotate: false });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.95, 4.4, 10, 32), glass(0x7fb0ff, 0.07, { roughness: 0.1 })); body.scale.z = 0.6; body.position.y = 1.0;
  m.part('body', 'Body outline', 'Position of the digestive organs in the trunk.', body, { back: true });
  const sal = new THREE.Group(); [[-0.85, 4.35, 0.15], [0.85, 4.35, 0.15], [0, 3.95, 0.6]].forEach((p) => sal.add(blob(0.32, organicMat(0xf0c89a), { amp: 0.1, seed: p[0] * 3 + 2, s: [0.9, 1.2, 0.8] }).translateX(p[0]).translateY(p[1]).translateZ(p[2])));
  m.part('sal', 'Salivary glands', 'Secrete saliva containing the enzyme salivary amylase that begins the digestion of starch into sugar (maltose).', sal, { explode: V(0, 0.6, 0.6) });
  const mouth = blob(0.55, organicMat(0xe0707a), { amp: 0.05, seed: 3, s: [1.1, 0.8, 1] }); mouth.position.set(0, 4.35, 0.55); const tongue = blob(0.3, organicMat(0xff8a96), { amp: 0.04, s: [1.2, 0.5, 1.6] }); tongue.position.set(0, -0.12, 0.05); mouth.add(tongue);
  m.part('mouth', 'Mouth (buccal cavity)', 'Teeth chew food (mechanical digestion). The tongue mixes it with saliva. Swallowing pushes the food bolus into the oesophagus.', mouth, { explode: V(0, 0.9, 0.5) });
  const eso = tubeAlong([V(0, 4.1, 0.3), V(0, 3.0, 0.1), V(0, 1.9, 0.1), V(0.15, 1.65, 0.1)], 0.17, organicMat(PINK), { taper: (t) => 1 });
  m.part('eso', 'Oesophagus (food pipe)', 'A muscular tube. Waves of contraction called peristalsis push food down to the stomach.', eso, { explode: V(-0.8, 0.4, 0) });
  const st = blob(1.0, organicMat(0xd9707c, { clearcoat: 0.7 }), { amp: 0.04, seed: 8, s: [0.95, 1.5, 0.75], seg: 48 }); st.position.set(0.65, 0.95, 0.1); st.rotation.z = -0.55;
  m.part('stomach', 'Stomach', 'J-shaped muscular bag. Gastric glands release HCl (kills germs, makes acid medium), pepsin (digests proteins) and mucus (protects the wall).', st, { explode: V(1.1, 0.4, 0.5) });
  const liver = blob(1.0, organicMat(0x8f3a38, { clearcoat: 0.8 }), { amp: 0.04, seed: 5, s: [1.55, 0.85, 0.85], seg: 48 }); liver.position.set(-0.9, 1.35, 0.0); liver.rotation.z = 0.12;
  m.part('liver', 'Liver', 'Largest gland. Makes bile juice, which emulsifies fats. Also stores glycogen and detoxifies the blood.', liver, { explode: V(-1.2, 0.6, 0.3) });
  const gb = blob(0.22, organicMat(0x6fa84a), { amp: 0.04, s: [0.8, 1.4, 0.8] }); gb.position.set(-0.45, 0.85, 0.35);
  m.part('gb', 'Gall bladder', 'Stores bile made by the liver and releases it into the small intestine.', gb, { explode: V(-0.5, -0.2, 0.9) });
  const pan = blob(0.3, organicMat(0xf0d284), { amp: 0.08, seed: 2, s: [3.4, 0.9, 1] }); pan.position.set(0.05, 0.62, -0.2); pan.rotation.z = 0.12;
  m.part('pancreas', 'Pancreas', 'Releases pancreatic juice with enzymes (amylase, trypsin, lipase) into the small intestine. Also makes insulin.', pan, { explode: V(0, -0.2, -1.0) });
  // small intestine coil
  const sp = []; for (let r = 0; r < 6; r++) { const y = 0.25 - r * 0.27, dir = r % 2 ? -1 : 1; for (let k = 0; k <= 6; k++) { const x = dir * (-0.78 + (1.56 * k) / 6); sp.push(V(x, y + Math.sin(k * 1.4 + r) * 0.05, 0.02 * Math.sin(k + r))); } }
  const si = tubeAlong(sp, 0.13, organicMat(0xf0a4a0), { seg: 400, radial: 10 });
  m.part('si', 'Small intestine', 'About 6–7 m long. Final digestion takes place here (bile, pancreatic and intestinal juices). Villi absorb the digested food into the blood.', si, { explode: V(0, -0.6, 0.9) });
  const li = tubeAlong([V(-1.05, -1.25, 0.05), V(-1.1, -0.2, 0.05), V(-1.05, 0.55, 0.05), V(-0.4, 0.62, 0.05), V(0.5, 0.58, 0.05), V(1.05, 0.55, 0.05), V(1.1, -0.2, 0.05), V(1.05, -1.1, 0.05), V(0.7, -1.4, 0.05), V(0.2, -1.5, 0.05), V(0, -1.7, 0.05)], 0.2, organicMat(0xd9b27c), { taper: (t) => 1 });
  m.part('li', 'Large intestine', 'About 1.5 m long. Absorbs water and salts from undigested food and forms faeces (egestion).', li, { explode: V(0, -0.2, 1.4) });
  const ap = tubeAlong([V(-1.05, -1.3, 0.08), V(-1.25, -1.6, 0.08), V(-1.15, -1.85, 0.08)], 0.06, organicMat(0xd9b27c), { radial: 8 });
  m.part('ap', 'Appendix', 'A small finger-like pouch at the start of the large intestine.', ap, { explode: V(-0.7, -0.8, 0.4) });
  const rec = tubeAlong([V(0, -1.7, 0.05), V(0, -2.15, 0.05), V(0, -2.5, 0.05)], 0.18, organicMat(0xc79a68)); m.part('rec', 'Rectum & anus', 'Stores faeces temporarily. The anus opens to expel them from the body.', rec, { explode: V(0, -1.0, 0.3) });
  // bolus path
  const path = new THREE.CatmullRomCurve3([V(0, 4.35, 0.55), V(0, 4.0, 0.3), V(0, 3.0, 0.1), V(0, 1.9, 0.1), V(0.35, 1.5, 0.1), V(0.7, 1.0, 0.1), V(0.9, 0.55, 0.1), ...sp, V(1.0, 0.0, 0.05), V(1.05, -0.4, 0.05), V(-1.05, -1.25, 0.05), V(-1.1, -0.2, 0.05), V(-1.05, 0.55, 0.05), V(-0.4, 0.62, 0.05), V(0.5, 0.58, 0.05), V(1.05, 0.55, 0.05), V(1.1, -0.2, 0.05), V(1.05, -1.1, 0.05), V(0.5, -1.45, 0.05), V(0, -1.7, 0.05), V(0, -2.5, 0.05)]);
  const bolus = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), glow(0xc98a4b, 0.4)); m.group.add(bolus);
  m.param({ id: 'travel', label: 'Journey of food', type: 'range', min: 0, max: 1, step: 0.002, value: 0.04 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: true });
  m.autoParams = ['travel'];
  const STAGES = [[0.08, 'Mouth', 'Chewing and saliva: salivary amylase starts breaking starch into maltose.'], [0.2, 'Oesophagus', 'Peristalsis squeezes the food bolus down in about 10 seconds.'], [0.34, 'Stomach', 'HCl and pepsin turn food into a creamy chyme (3–4 hours). Proteins begin to digest.'], [0.74, 'Small intestine', 'Bile, pancreatic and intestinal juices complete digestion. Villi absorb glucose, amino acids and fatty acids.'], [0.94, 'Large intestine', 'Water and salts are absorbed. Undigested matter forms faeces.'], [1.01, 'Rectum & anus', 'Faeces are stored and then egested.']];
  m.update = (P, t, dt) => {
    let u = P.travel; if (P.play) { u = (u + dt * 0.014) % 1; P.travel = u; }
    path.getPointAt(clamp(u, 0, 0.999), bolus.position);
    const col = u < 0.2 ? 0xc98a4b : u < 0.34 ? 0xd9a35a : u < 0.74 ? 0xe5c470 : 0x6b4a2b; bolus.material.color.setHex(col); bolus.material.emissive.setHex(col);
    bolus.scale.setScalar(u < 0.34 ? 1 : u < 0.74 ? 1 - 0.35 * smooth(0.34, 0.74, u) : 0.65);
  };
  m.hud = (P) => { const s = STAGES.find((x) => P.travel < x[0]) || STAGES[5]; return { title: s[1], lines: [s[2]] }; };
  return m;
}

/* ================= LUNGS / ALVEOLI ================= */
export function lungs(mode = 'organ') {
  const m = createModel({ mode, view: [0.15, 0.1, 1], zoom: mode === 'organ' ? 0.95 : 0.9, explodeScale: 1.0, sliceable: false });
  // ---- organ mode ----
  const tr = new THREE.Group(), tm = organicMat(0xf2c9cf); tr.add(tubeAlong([V(0, 3.4, 0), V(0, 2.2, 0), V(0, 1.4, 0)], 0.2, tm, { seg: 30 }));
  for (let i = 0; i < 9; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.035, 8, 20, Math.PI * 1.55), M(0xf6efe9)); r.position.set(0, 3.3 - i * 0.2, 0); r.rotation.set(Math.PI / 2, 0, Math.PI * 0.72); tr.add(r); }
  m.part('trachea', 'Trachea (windpipe)', 'Carries air to the lungs. C-shaped cartilage rings keep it open. Lined with cilia and mucus that trap dust.', tr, { mode: 'organ', explode: V(0, 1.0, 0) });
  const rnd = mulberry(5); const bt = new THREE.Group(), bmat = organicMat(0xf0b4ba);
  const branch = (p, d, len, r, depth, side) => { const e = p.clone().addScaledVector(d, len); bt.add(tubeAlong([p, p.clone().lerp(e, 0.5).add(V((rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08)), e], r, bmat, { radial: 8, seg: 10 })); if (depth > 0) for (let i = 0; i < 2; i++) { const nd = d.clone().add(V((i ? 1 : -1) * 0.55 * (rnd() * 0.5 + 0.7), -0.15 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.5)).normalize(); branch(e, nd, len * 0.74, r * 0.72, depth - 1, side); } };
  [-1, 1].forEach((s) => branch(V(0, 1.4, 0), V(s * 0.8, -0.5, 0).normalize(), 0.8, 0.14, 4, s));
  m.part('bronchi', 'Bronchi & bronchioles', 'The trachea divides into two bronchi, which branch into thousands of bronchioles ending in alveoli.', bt, { mode: 'organ', explode: V(0, 0.3, 0.8) });
  const lungMat = () => organicMat(0xea9aa4, { transparent: true, opacity: 0.55, clearcoat: 0.9, roughness: 0.3, side: THREE.DoubleSide, bumpScale: 0.5 });
  const lr = new THREE.Group(), ll = new THREE.Group();
  [[0, 0.1, 0.1, 1.0, 1.2, 0.85], [-0.15, -0.9, 0.2, 1.0, 0.9, 0.8], [0.4, 0.9, 0, 0.8, 0.8, 0.7]].forEach((a, i) => { const b = blob(1.0, lungMat(), { amp: 0.04, seed: i + 1, s: [a[3], a[4], a[5]], seg: 40 }); b.position.set(a[0] - 1.35, a[1] + 0.1, a[2]); lr.add(b); });
  [[0, 0.0, 0.1, 0.95, 1.5, 0.8], [0.1, -0.85, 0.2, 0.9, 0.95, 0.8]].forEach((a, i) => { const b = blob(1.0, lungMat(), { amp: 0.04, seed: i + 7, s: [a[3], a[4], a[5]], seg: 40 }); b.position.set(a[0] + 1.3, a[1] + 0.15, a[2]); ll.add(b); });
  m.part('rlung', 'Right lung (3 lobes)', 'Larger, with three lobes. Spongy, elastic tissue with millions of alveoli.', lr, { mode: 'organ', explode: V(-1.5, 0, 0.3) });
  m.part('llung', 'Left lung (2 lobes)', 'Slightly smaller with two lobes, leaving space for the heart.', ll, { mode: 'organ', explode: V(1.5, 0, 0.3) });
  const dia = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, TAU, 0, Math.PI / 2), organicMat(0xc8736c, { side: THREE.DoubleSide })); dia.scale.set(3.2, 0.7, 1.5); dia.position.set(0, -1.75, 0);
  m.part('diaphragm', 'Diaphragm', 'Dome-shaped muscle below the lungs. Flattens and moves down on inhalation, rises on exhalation.', dia, { mode: 'organ', explode: V(0, -1.2, 0) });
  const ribs = new THREE.Group(), ribMat = M(0xf1e8d6, { roughness: 0.5 }); const ribList = [];
  for (let i = 0; i < 7; i++) { const y = 2.0 - i * 0.55, s = 1.9 + Math.sin((i / 6) * Math.PI) * 0.65; const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 48, Math.PI * 1.15), ribMat); r.rotation.set(Math.PI / 2, 0, -Math.PI * 0.075); r.scale.set(s, 1.15 * s * 0.55, 1); r.position.set(0, y, 0); r.rotation.x = Math.PI / 2 + 0.1; ribs.add(r); ribList.push(r); }
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.5, 0.1), ribMat); sternum.position.set(0, 0.95, 1.1); ribs.add(sternum);
  m.part('ribs', 'Rib cage', 'Protects the lungs. Rib muscles lift the ribs up and out on inhalation.', ribs, { mode: 'organ', explode: V(0, 0, 1.6) });
  const flowN = 14, air = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), glow(0xa9e8ff, 1.5), flowN); m.group.add(air);
  // ---- alveoli mode ----
  const alv = new THREE.Group(), cap = new THREE.Group(), ox = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0x73d6ff, 2), 40), co = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), glow(0xb0a8a0, 1.2), 40), rbcs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 14), M(0xd62d3b, { emissive: 0x5a0a12, emissiveIntensity: 0.5 }), 36);
  const bron = tubeAlong([V(0, -3.2, 0), V(0, -1.6, 0), V(0, -0.3, 0)], 0.3, organicMat(0xf0b4ba), { taper: (t) => 1 - 0.3 * t });
  const alvSpots = []; for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = i === 0 ? 0 : 0.95 + (i % 2) * 0.25, y = 0.35 + (i === 0 ? 0.3 : Math.sin(i) * 0.45); alvSpots.push(V(Math.cos(a) * rr, y, Math.sin(a) * rr)); }
  alvSpots.forEach((p, i) => { const a = new THREE.Mesh(new THREE.SphereGeometry(0.62, 36, 26), glass(0xff9aa8, 0.28, { roughness: 0.15 })); a.position.copy(p); alv.add(a); const c = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.045, 8, 36), organicMat(i % 2 ? 0xd62d3b : 0x5b66d8)); c.position.copy(p); c.rotation.set(i, i * 1.3, 0); cap.add(c); const c2 = c.clone(); c2.rotation.set(i + 1.5, i, 1); c2.material = organicMat(0xd62d3b); cap.add(c2); });
  m.part('bronchiole', 'Bronchiole', 'The smallest air tube. Ends in a cluster of alveoli like a bunch of grapes.', bron, { mode: 'alveoli', explode: V(0, -1.0, 0) });
  m.part('alveoli', 'Alveoli', 'Tiny air sacs with walls just one cell thick. Surface area of the two lungs is about 70 m². This is where gas exchange takes place.', alv, { mode: 'alveoli', explode: V(0, 0.4, 0), spread: 0.9 });
  m.part('capil', 'Capillaries', 'A web of tiny blood vessels around each alveolus. Their walls are also one cell thick, so gases diffuse quickly.', cap, { mode: 'alveoli', spread: 0.9 });
  m.part('o2', 'Oxygen', 'Diffuses from the alveolus (high concentration) into the blood (low concentration), where haemoglobin binds it.', ox, { mode: 'alveoli' });
  m.part('co2', 'Carbon dioxide', 'Diffuses from the blood into the alveolus and is breathed out.', co, { mode: 'alveoli' });
  m.part('rbc', 'Red blood cells', 'Carry oxygen bound to haemoglobin.', rbcs, { mode: 'alveoli' });
  m.param({ id: 'rate', label: 'Breathing rate', type: 'range', min: 6, max: 40, step: 1, value: 14, unit: ' /min' });
  const d = new THREE.Object3D(); let ph = 0;
  const rs = mulberry(11), seeds = Array.from({ length: 40 }, () => ({ a: Math.floor(rs() * 9), o: rs(), th: rs() * TAU }));
  m.update = (P, t, dt) => {
    ph = (ph + dt * P.rate / 60) % 1; const w = 0.5 - 0.5 * Math.cos(ph * TAU), inhale = ph < 0.5;
    if (m.mode === 'organ') {
      dia.position.y = -1.75 - 0.4 * w; dia.scale.y = 0.7 - 0.25 * w; lr.scale.setScalar(1 + 0.06 * w); ll.scale.setScalar(1 + 0.06 * w); lr.scale.y = ll.scale.y = 1 + 0.08 * w; lr.position.y = ll.position.y = -0.0; ribs.scale.set(1 + 0.045 * w, 1, 1 + 0.06 * w); ribs.position.y = 0.12 * w;
      for (let i = 0; i < flowN; i++) { const u = ((i / flowN + t * 0.35) % 1); d.position.set(Math.sin(i * 2.1) * 0.08, 3.4 - u * 2.0 * (inhale ? 1 : -1) - (inhale ? 0 : -2.0), Math.cos(i * 1.7) * 0.08); d.scale.setScalar(0.6 + w); d.updateMatrix(); air.setMatrixAt(i, d.matrix); }
      air.instanceMatrix.needsUpdate = true; air.visible = m.mode === 'organ';
    } else {
      air.visible = false;
      for (let i = 0; i < 40; i++) { const s = seeds[i], c = alvSpots[s.a], u = (t * 0.35 + s.o) % 1; const r = lerp(0.35, 0.68, u); [ox, co].forEach((im, k) => { const rr = k ? lerp(0.68, 0.3, u) : r; d.position.set(c.x + Math.cos(s.th) * rr * 0.9, c.y + Math.sin(s.th * 1.7) * rr * 0.9, c.z + Math.sin(s.th) * rr * 0.9); d.scale.setScalar(1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); }
      ox.instanceMatrix.needsUpdate = co.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 36; i++) { const c = alvSpots[i % 9], a = t * 0.9 + i * 1.3; d.position.set(c.x + Math.cos(a) * 0.63, c.y + Math.sin(a) * 0.63 * Math.cos(i), c.z + Math.sin(a) * 0.63 * Math.sin(i)); d.rotation.set(a, 0, i); d.updateMatrix(); rbcs.setMatrixAt(i, d.matrix); }
      d.rotation.set(0, 0, 0); rbcs.instanceMatrix.needsUpdate = true;
    }
    m._w = w; m._in = inhale;
  };
  m.hud = (P) => m.mode === 'organ' ? { title: m._in ? 'Inhaling' : 'Exhaling', lines: [m._in ? 'Diaphragm contracts and moves down; ribs move up and out; chest volume rises; air rushes in.' : 'Diaphragm relaxes and rises; ribs move down and in; air is pushed out.', `${P.rate} breaths per minute`] } : { title: 'Gas exchange', lines: ['O₂ diffuses into the blood; CO₂ diffuses into the alveolus.', 'Both gases move from high to low concentration.'] };
  return m;
}

/* ================= KIDNEY & NEPHRON ================= */
export function kidney() {
  const m = createModel({ mode: 'organ', view: [0.2, 0.15, 1], zoom: 0.95, explodeScale: 1.0, sliceable: true, sliceAxis: 'z', autoRotate: false });
  const bean = new THREE.SphereGeometry(1, 80, 60); displace(bean, (x, y, z, n) => 0); const p = bean.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i) * 1.15, y = p.getY(i) * 1.9, z = p.getZ(i) * 0.85; if (x > 0) x -= 0.75 * Math.exp(-(y * y) / 0.6) * (x / 1.15 > 0.05 ? 1 : 0) * Math.min(1, x * 1.5); p.setXYZ(i, x, y, z); }
  bean.computeVertexNormals();
  const cortex = new THREE.Mesh(bean, organicMat(0xb5462f, { clearcoat: 0.8, side: THREE.DoubleSide, roughness: 0.45 }));
  m.part('cortex', 'Renal cortex', 'Outer region. Contains the glomeruli and convoluted tubules of the nephrons. Blood is filtered here.', cortex, { mode: 'organ', explode: V(0, 0, 0) });
  const pyr = new THREE.Group(); for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.33, cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.95, 20), organicMat(0x7d2a22)); cone.position.set(0.05 + Math.cos(a) * 0.15, (i - 3) * 0.42, 0); cone.rotation.z = Math.PI / 2 + a * 0.4; cone.position.x = -0.1 + 0.2 * Math.cos(a); pyr.add(cone); }
  m.part('medulla', 'Renal medulla (pyramids)', 'Inner cone-shaped regions that contain the loops of Henle and collecting ducts. Urine is concentrated here.', pyr, { mode: 'organ', explode: V(-0.3, 0, 0.5) });
  const pelvis = blob(0.4, organicMat(0xf0b45f), { amp: 0.04, s: [1.1, 1.1, 0.8] }); pelvis.position.set(0.75, 0, 0);
  m.part('pelvis', 'Renal pelvis', 'Funnel-shaped space that collects urine from the collecting ducts and passes it to the ureter.', pelvis, { mode: 'organ', explode: V(0.7, 0, 0.7) });
  const ureter = tubeAlong([V(0.9, -0.1, 0), V(1.2, -1.2, 0), V(1.0, -2.3, 0), V(0.5, -3.4, 0)], 0.11, organicMat(0xf0c46f), { taper: (t) => 1 });
  m.part('ureter', 'Ureter', 'Muscular tube that carries urine from the kidney to the urinary bladder.', ureter, { mode: 'organ', explode: V(0.8, -0.6, 0) });
  const ra = tubeAlong([V(0.85, 0.25, 0.1), V(1.6, 0.5, 0.1), V(2.6, 0.7, 0)], 0.12, organicMat(0xd23d55), { taper: (t) => 1 }), rv = tubeAlong([V(0.85, -0.25, -0.1), V(1.5, -0.3, -0.2), V(2.5, -0.5, -0.1)], 0.14, organicMat(0x4e66d6), { taper: (t) => 1 });
  m.part('rartery', 'Renal artery', 'Brings oxygenated blood with wastes (urea) from the aorta to the kidney.', ra, { mode: 'organ', explode: V(0.7, 0.6, 0.2) });
  m.part('rvein', 'Renal vein', 'Carries filtered blood away from the kidney to the inferior vena cava.', rv, { mode: 'organ', explode: V(0.7, -0.4, -0.3) });
  const aorta = tubeAlong([V(2.6, 3.2, 0), V(2.7, 0.7, 0), V(2.7, -2.5, 0)], 0.22, organicMat(0xd23d55), { taper: (t) => 1 }), ivc = tubeAlong([V(2.5, 3.2, -0.5), V(2.6, -0.5, -0.5), V(2.6, -2.5, -0.5)], 0.25, organicMat(0x4e66d6), { taper: (t) => 1 });
  m.part('aorta', 'Aorta & vena cava', 'The aorta supplies each kidney; the vena cava drains it. The kidneys receive about 20% of the heart output.', (() => { const g = new THREE.Group(); g.add(aorta, ivc); return g; })(), { mode: 'organ', explode: V(0.8, 0, 0) });
  // nephron mode
  const rnd = mulberry(3);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.75, 40, 30, 0, TAU, 0.45, Math.PI - 0.45), glass(0xf0b45f, 0.38, { side: THREE.DoubleSide })); cap.position.set(0, 3.0, 0); cap.rotation.x = -0.4;
  const glom = new THREE.Group(); { const pts = []; for (let i = 0; i < 16; i++) pts.push(V((rnd() - 0.5) * 0.7, 3.0 + (rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7)); glom.add(tubeAlong(pts, 0.06, organicMat(0xd23d55), { radial: 8, seg: 120 })); glom.add(tubeAlong([V(-0.9, 3.7, 0), V(-0.4, 3.35, 0), V(-0.15, 3.1, 0)], 0.09, organicMat(0xd23d55), { radial: 8 }), tubeAlong([V(0.15, 3.1, 0), V(0.5, 3.4, 0), V(0.9, 3.7, 0)], 0.06, organicMat(0xb82040), { radial: 8 })); }
  m.part('bowman', "Bowman's capsule", 'Cup-shaped end of the nephron around the glomerulus. Collects the filtrate (ultrafiltration).', cap, { mode: 'nephron', explode: V(-0.3, 0.4, 0) });
  m.part('glom', 'Glomerulus & arterioles', 'A tuft of capillaries. High pressure forces water, glucose, salts and urea out of the blood into the capsule. Blood cells and proteins stay in.', glom, { mode: 'nephron', explode: V(0.3, 0.4, 0.5) });
  const tMat = organicMat(0xf3c76b), neph = [];
  const coil = (cx, y0, y1, r, turns, z) => { const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60, a = u * turns * TAU; pts.push(V(cx + Math.cos(a) * r, lerp(y0, y1, u), z + Math.sin(a) * r)); } return pts; };
  const pctPts = [V(0, 2.2, 0), ...coil(0, 2.1, 1.0, 0.35, 5, 0)], pct = tubeAlong(pctPts, 0.11, organicMat(0xf3c76b), { seg: 400, radial: 10 });
  const loopDown = [V(0, 1.0, 0), V(0.1, 0.4, 0), V(0.2, -1.0, 0), V(0.25, -2.4, 0), V(0.5, -3.0, 0)], loopUp = [V(0.5, -3.0, 0), V(0.8, -2.4, 0), V(0.85, -1.0, 0), V(0.95, 0.6, 0), V(1.1, 1.3, 0)];
  const lh = new THREE.Group(); lh.add(tubeAlong(loopDown, 0.09, organicMat(0xf0a050), { radial: 10 }), tubeAlong(loopUp, 0.13, organicMat(0xe58a3a), { radial: 10 }));
  const dctPts = [V(1.1, 1.3, 0), ...coil(1.45, 1.5, 2.0, 0.3, 3.5, 0).slice(0)].concat([V(1.9, 2.0, 0)]), dct = tubeAlong(dctPts, 0.1, organicMat(0xd88cf0), { seg: 240, radial: 10 });
  const cd = tubeAlong([V(1.9, 2.0, 0), V(2.3, 1.2, 0), V(2.4, -0.5, 0), V(2.35, -2.2, 0), V(2.3, -3.4, 0)], 0.19, organicMat(0x8be0c8), { radial: 12, taper: (t) => 1 });
  const perit = new THREE.Group(); [pctPts, loopDown, loopUp].forEach((pts, k) => { const wrap = pts.map((v, i) => v.clone().add(V(Math.sin(i * 1.3) * 0.2, 0, Math.cos(i * 1.1) * 0.2))); perit.add(tubeAlong(wrap, 0.035, organicMat(k % 2 ? 0x4e66d6 : 0xd23d55), { seg: 260, radial: 6 })); });
  m.part('pct', 'Proximal convoluted tubule', 'Selective reabsorption: all glucose and amino acids and most water and salts return to the blood. Walls have microvilli.', pct, { mode: 'nephron', explode: V(-0.7, 0, 0.2) });
  m.part('loop', 'Loop of Henle', 'Hairpin-shaped tube dipping into the medulla. Reabsorbs more water and builds a salty gradient that helps concentrate urine.', lh, { mode: 'nephron', explode: V(-0.2, -0.5, 0.6) });
  m.part('dct', 'Distal convoluted tubule', 'Tubular secretion and final adjustment of salts and pH. ADH makes it and the collecting duct more permeable to water.', dct, { mode: 'nephron', explode: V(0.5, 0.6, 0.3) });
  m.part('cd', 'Collecting duct', 'Receives filtrate from many nephrons, reabsorbs water and carries urine to the renal pelvis.', cd, { mode: 'nephron', explode: V(0.9, 0, 0) });
  m.part('perit', 'Peritubular capillaries', 'Blood vessels that wrap the tubules and take back the reabsorbed substances.', perit, { mode: 'nephron', explode: V(0, 0, -0.9) });
  const full = [V(0, 3.0, 0), ...pctPts, ...loopDown.slice(1), ...loopUp.slice(1), ...dctPts.slice(1), ...[V(2.3, 1.2, 0), V(2.4, -0.5, 0), V(2.35, -2.2, 0), V(2.3, -3.4, 0)]];
  const curve = new THREE.CatmullRomCurve3(full); const NF = 50, filt = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), glow(0xffe08a, 1.6), NF), wat = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 8, 6), glow(0x73d6ff, 2.2), 40), dd = new THREE.Object3D();
  m.group.add(filt, wat);
  m.param({ id: 'mode', label: 'View', type: 'buttons', value: 'organ', options: [['organ', 'Kidney'], ['nephron', 'Nephron']] });
  m.param({ id: 'flow', label: 'Show filtrate flow', type: 'toggle', value: true });
  const NZ = [[0.12, 'Ultrafiltration', 'In the glomerulus, blood pressure filters small molecules into Bowman\'s capsule.'], [0.4, 'Selective reabsorption', 'PCT returns glucose, amino acids, salts and most of the water to the blood.'], [0.65, 'Loop of Henle', 'More water and salt are reabsorbed; the medulla becomes concentrated.'], [0.8, 'Tubular secretion', 'DCT secretes extra H⁺, K⁺ and drugs into the filtrate and fine-tunes salt balance.'], [1.01, 'Collecting duct', 'Water is reabsorbed under ADH control. The concentrated urine flows to the pelvis.']];
  let zone = 0;
  m.update = (P, t, dt) => {
    const on = m.mode === 'nephron' && P.flow; filt.visible = wat.visible = on; if (!on) return;
    for (let i = 0; i < NF; i++) { const u = (t * 0.045 + i / NF) % 1; curve.getPointAt(u, dd.position); dd.scale.setScalar(u > 0.75 ? 1.2 : 1.0 - 0.45 * Math.min(1, u * 1.2)); dd.updateMatrix(); filt.setMatrixAt(i, dd.matrix); }
    for (let i = 0; i < 40; i++) { const u0 = 0.15 + ((i * 0.618) % 1) * 0.6, k = (t * 0.4 + i * 0.37) % 1; curve.getPointAt(u0, dd.position); dd.position.x += (i % 2 ? 1 : -1) * k * 0.55; dd.position.z += k * 0.45; dd.scale.setScalar(Math.sin(k * Math.PI) + 0.01); dd.updateMatrix(); wat.setMatrixAt(i, dd.matrix); }
    filt.instanceMatrix.needsUpdate = wat.instanceMatrix.needsUpdate = true; zone = ((t * 0.045) % 1);
  };
  m.hud = (P) => m.mode === 'organ' ? { title: 'Kidney', lines: ['Each kidney holds about a million nephrons. Together they filter ~180 L of blood plasma a day and make 1–2 L of urine.', 'Switch to Nephron view to see how.'] } : { title: (NZ.find((z) => zone < z[0]) || NZ[4])[1], lines: [(NZ.find((z) => zone < z[0]) || NZ[4])[2]] };
  return m;
}

/* ================= HUMAN EYE ================= */
export function eye() {
  const m = createModel({ view: [0.8, 0.4, 0.7], zoom: 1.15, explodeScale: 0.9, sliceable: true, sliceAxis: 'y', autoRotate: false, floor: false });
  const g = (o) => o;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), organicMat(0xf4efe9, { roughness: 0.4, clearcoat: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
  m.part('sclera', 'Sclera', 'The tough white outer coat that protects the eye and gives it shape.', globe, { back: true });
  const retina = new THREE.Mesh(new THREE.SphereGeometry(0.97, 48, 36, 0, TAU, 1.12, Math.PI - 1.12), organicMat(0xf09a6a, { side: THREE.DoubleSide, roughness: 0.55 }));
  m.part('retina', 'Retina', 'Light-sensitive layer at the back with rods (dim light) and cones (colour). Forms the real, inverted image and sends signals via the optic nerve.', retina, { back: true });
  const vit = new THREE.Mesh(new THREE.SphereGeometry(0.93, 40, 30), glass(0xbfe9ff, 0.14, { side: THREE.BackSide })); m.part('vitreous', 'Vitreous humour', 'Transparent jelly that fills the eyeball and keeps its shape.', vit, { back: true });
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 28, 0, TAU, 0, 1.05), glass(0xcfeeff, 0.35, { clearcoat: 1, roughness: 0.05 })); cornea.rotation.z = Math.PI / 2; m.part('cornea', 'Cornea', 'Transparent front window. Does most of the refraction (bending) of incoming light.', cornea, { explode: V(-0.7, 0, 0) });
  const iris = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.62, 48), organicMat(0x2f8f8f, { side: THREE.DoubleSide, roughness: 0.4 })); iris.rotation.y = Math.PI / 2;
  m.part('iris', 'Iris', 'Coloured muscular ring. Controls the size of the pupil, so regulates the amount of light entering the eye.', iris, { explode: V(-0.4, 0, 0) });
  const pupilRing = new THREE.Mesh(new THREE.RingGeometry(0.0, 0.17, 32), M(0x05070d, { side: THREE.DoubleSide })); pupilRing.rotation.y = Math.PI / 2; pupilRing.position.x = -0.004; m.part('pupil', 'Pupil', 'The opening in the iris. Gets smaller in bright light and larger in dim light.', pupilRing, { explode: V(-0.6, 0, 0) });
  const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), glass(0xdff6ff, 0.6, { clearcoat: 1, roughness: 0.05, transmission: 0 })); m.part('lens', 'Crystalline lens', 'Transparent, flexible, convex lens. Its curvature changes so images of near and far objects focus on the retina (accommodation).', lens, { explode: V(-0.1, 0, 0) });
  const cil = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.1, 14, 40), organicMat(0xd47a6a)); cil.rotation.y = Math.PI / 2; m.part('ciliary', 'Ciliary muscles', 'Muscles that hold the lens. They contract to make it thicker (near vision) and relax to make it thinner (far vision).', cil, { explode: V(-0.1, 0, 0.0) });
  const on = tubeAlong([V(1.0, 0, 0), V(1.5, 0, 0.1), V(2.4, 0.1, 0.25)], 0.14, organicMat(0xf4efe9), { taper: (t) => 1 }); m.part('onerve', 'Optic nerve', 'Carries electrical signals from the retina to the brain. Where it leaves there is no rod or cone (the blind spot).', on, { explode: V(0.7, 0, 0) });
  const obj = new THREE.Group(); obj.add(tubeAlong([V(0, -0.55, 0), V(0, 0.55, 0)], 0.04, M(0xffb347, { emissive: 0xff8a00, emissiveIntensity: 0.6 }), { radial: 6 })); const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 12), M(0xffb347, { emissive: 0xff8a00, emissiveIntensity: 0.6 })); head.position.y = 0.6; obj.add(head); obj.position.set(-5, 0.55, 0);
  m.group.add(obj); const rays = Array.from({ length: 6 }, (_, i) => { const c = cyl(V(), V(0, 1, 0), 0.012, glow(i < 4 ? 0xfff29a : 0xffd1a0, 1.4, { transparent: true, opacity: 0.9 }), 6); m.group.add(c); return c; });
  const lensPlane = new THREE.Group(); const concave = new THREE.Mesh(new THREE.LatheGeometry([[0.08, -0.04], [0.5, -0.07], [0.5, 0.07], [0.08, 0.04]].map((p) => new THREE.Vector2(p[0], p[1])), 32), glass(0x9fd6ff, 0.5, { clearcoat: 1 })); const convex = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), glass(0x9fd6ff, 0.5, { clearcoat: 1 })); convex.scale.set(0.12, 0.5, 0.5); concave.rotation.z = Math.PI / 2; lensPlane.add(concave, convex); lensPlane.position.set(-0.85, 0, 0); m.group.add(lensPlane);
  m.part('corrective', 'Corrective lens', 'Concave lens corrects myopia (short-sightedness). Convex lens corrects hypermetropia (long-sightedness).', lensPlane, { explode: V(-0.9, 0, 0) });
  m.param({ id: 'dist', label: 'Distance of object', type: 'range', min: 10, max: 100, step: 1, value: 100, unit: ' cm' });
  m.param({ id: 'cond', label: 'Eye condition', type: 'buttons', value: 'normal', options: [['normal', 'Normal'], ['myopia', 'Myopia'], ['hyper', 'Hypermetropia']] });
  m.param({ id: 'fix', label: 'Wear corrective lens', type: 'toggle', value: false });
  const L0 = { normal: 2.4, myopia: 2.8, hyper: 2.05 }; let info = {}; let Lcur = 2.4;
  m.update = (P, t, dt) => {
    const Lt = L0[P.cond]; Lcur += (Lt - Lcur) * Math.min(1, dt * 6); const L = Lcur;
    const rx = (L + 0.45) / 2, cx = (L - 0.45) / 2;
    [globe, vit].forEach((o, i) => { o.scale.set(rx * (i ? 0.96 : 1), 1.2 * (i ? 0.96 : 1), 1.2 * (i ? 0.96 : 1)); o.position.set(cx, 0, 0); });
    retina.scale.set(rx * 0.97, 1.2 * 0.97, 1.2 * 0.97); retina.position.set(cx, 0, 0); retina.rotation.z = -Math.PI / 2; retina.rotation.y = 0;
    cornea.position.set(-0.45 + 0.0, 0, 0); cornea.scale.setScalar(1.1);
    const u = P.dist, Pmin = 1 / 2.4, A = 0.04, Pmax = Pmin + A, need = 1 / u + 1 / L;
    let Pe = clamp(need, Pmin, Pmax), Pc = 0; if (P.fix) { if (need < Pmin) Pc = need - Pmin; else if (need > Pmax) Pc = need - Pmax; }
    const Pt = Pe + Pc, v = 1 / (Pt - 1 / u), sharp = Math.abs(v - L) < 0.05;
    const thick = 0.1 + (Pe - Pmin) / A * 0.16 + 0.12; lens.scale.set(thick, 0.48, 0.48); lens.position.x = 0; cil.position.x = 0;
    lensPlane.visible = P.fix && Pc !== 0; concave.visible = Pc < 0; convex.visible = Pc > 0;
    const Dd = lerp(2.4, 4.8, smooth(10, 100, u)); obj.position.x = -Dd - 0.4; const h = 0.55;
    const tip = V(obj.position.x, h, 0), ent = [V(-0.3, 0.45, 0), V(-0.3, -0.45, 0)];
    const img = V(v, -h * v / (Dd + 0.4) * 0.9 - 0.0, 0);
    const lines = [[tip, V(0, 0.45, 0)], [V(0, 0.45, 0), img], [tip, V(0, -0.45, 0)], [V(0, -0.45, 0), img], [tip, V(0, 0, 0)], [V(0, 0, 0), img]];
    lines.forEach((l, i) => { setCyl(rays[i], l[0], l[1]); rays[i].material.opacity = i > 3 ? 0.45 : 0.9; rays[i].material.emissiveIntensity = sharp ? 1.8 : 1.0; });
    info = { sharp, v, L, Pc, note: v < L - 0.05 ? 'Image forms in front of the retina' : v > L + 0.05 ? 'Image forms behind the retina' : 'Image falls on the retina' };
  };
  m.hud = (P) => ({ title: info.sharp ? 'Clear image' : 'Blurred image', lines: [info.note, P.cond === 'myopia' ? 'Myopia: eyeball too long or lens too curved. Distant objects blur. Use a concave lens.' : P.cond === 'hyper' ? 'Hypermetropia: eyeball too short or lens too flat. Near objects blur. Use a convex lens.' : 'The lens thickens for near objects and flattens for far objects.'] });
  return m;
}

/* ================= JOINTS ================= */
export function joints() {
  const m = createModel({ mode: 'ball', view: [0.2, 0.3, 1], zoom: 0.95, explodeScale: 1.0, autoRotate: false });
  const bone = M(0xf3ead2, { roughness: 0.55, clearcoat: 0.3 }), cart = M(0x9ad8ff, { roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.85 }), lig = organicMat(0xe8e1cf);
  const shaft = (len, r) => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.2, len, 20), bone)); return g; };
  // ball and socket
  const scap = new THREE.Group(); { const soc = new THREE.Mesh(new THREE.SphereGeometry(1.05, 40, 28, 0, TAU, 0, 1.5), organicMat(0xe9dfc2, { side: THREE.DoubleSide })); soc.rotation.x = Math.PI / 2 * 1; soc.rotation.z = -Math.PI / 2; scap.add(soc); const pl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 3.0), bone); pl.position.x = 1.05; scap.add(pl); }
  scap.position.set(-0.4, 0, 0);
  const hum = new THREE.Group(); { const head = sphere(0.9, bone, 0, 0, 0, 36), cartHead = new THREE.Mesh(new THREE.SphereGeometry(0.93, 36, 24), cart); const sh = shaft(3.6, 0.38); sh.position.y = -2.2; hum.add(head, cartHead, sh); }
  hum.position.set(-1.0, 0, 0);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.35, 36, 26), glass(0xf5d98a, 0.2, { roughness: 0.2 })); cap.position.copy(hum.position);
  m.part('b_sock', 'Socket (glenoid cavity)', 'The shallow cup of the shoulder blade that receives the head of the humerus.', scap, { mode: 'ball', explode: V(0.8, 0.4, 0) });
  m.part('b_head', 'Humerus with ball head', 'The rounded end fits in the socket and can rotate in almost every direction.', hum, { mode: 'ball', explode: V(-0.9, -0.2, 0) });
  m.part('b_cap', 'Joint capsule & synovial fluid', 'A sleeve of fibrous tissue holding slippery synovial fluid that lubricates the joint and reduces friction.', cap, { mode: 'ball', back: true });
  // hinge (elbow)
  const humH = new THREE.Group(); { const s = shaft(3.6, 0.38); s.position.y = 1.8; humH.add(s); humH.add(sphere(0.55, bone, 0, 0, 0, 24)); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.9, 24), cart); c2.rotation.x = Math.PI / 2; humH.add(c2); }
  const fore = new THREE.Group(); { const s = shaft(3.4, 0.3); s.position.y = -1.7; fore.add(s); const olecr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.6), bone); olecr.position.set(-0.3, 0.1, 0); fore.add(olecr); }
  const hp = new THREE.Group(); hp.add(fore); hp.position.set(0, 0, 0);
  const ligH = new THREE.Group(); ligH.add(tubeAlong([V(0.55, 0.5, 0.35), V(0.55, -0.1, 0.4), V(0.4, -0.8, 0.28)], 0.06, lig, { radial: 8 }), tubeAlong([V(0.55, 0.5, -0.35), V(0.55, -0.1, -0.4), V(0.4, -0.8, -0.28)], 0.06, lig, { radial: 8 }));
  m.part('h_hum', 'Humerus (upper arm bone)', 'Its lower end is shaped like a pulley.', humH, { mode: 'hinge', explode: V(0, 0.7, 0) });
  m.part('h_fore', 'Ulna (forearm bone)', 'Moves in one plane like a door on a hinge. Allows bending and straightening only.', hp, { mode: 'hinge', explode: V(0, -0.7, 0) });
  m.part('h_lig', 'Ligaments', 'Strong bands of tissue that join bone to bone and keep the joint stable.', ligH, { mode: 'hinge', explode: V(0.8, 0, 0.5) });
  // pivot (neck / forearm)
  const atlas = new THREE.Group(); { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.3, 16, 40), bone); ring.rotation.x = Math.PI / 2; atlas.add(ring); atlas.add(sphere(0.2, bone, 0, 0, 0.0, 12)); atlas.position.y = 0.55; }
  const axis = new THREE.Group(); { const s = shaft(2.0, 0.33); s.position.y = -1.0; axis.add(s); const dens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.2, 20), bone); dens.position.y = 0.55; axis.add(dens); axis.add(sphere(0.38, bone, 0, -0.1, 0, 20)); }
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1.5, 28, 20, 0, TAU, 0, 1.2), glass(0xe9dfc2, 0.25)); skull.position.y = 2.1; atlas.add(skull); skull.position.y = 1.35;
  m.part('p_atlas', 'Atlas (1st vertebra)', 'A ring-shaped bone that carries the skull and rotates around the peg of the axis.', atlas, { mode: 'pivot', explode: V(0, 0.9, 0) });
  m.part('p_axis', 'Axis (2nd vertebra) with peg', 'Has an upward peg (dens) around which the atlas turns. Lets you say no by rotating the head.', axis, { mode: 'pivot', explode: V(0, -0.5, 0) });
  m.param({ id: 'mode', label: 'Type of joint', type: 'buttons', value: 'ball', options: [['ball', 'Ball & socket'], ['hinge', 'Hinge'], ['pivot', 'Pivot']] });
  m.param({ id: 'move', label: 'Range of movement', type: 'range', min: 0, max: 1, step: 0.01, value: 0.4 });
  m.param({ id: 'play', label: 'Play animation', type: 'toggle', value: true });
  m.autoParams = ['move'];
  const TX = { ball: ['Ball and socket joint', 'Shoulder and hip. Movement in all directions plus rotation.'], hinge: ['Hinge joint', 'Elbow, knee and fingers. Movement in one plane (flexion and extension).'], pivot: ['Pivot joint', 'Neck (atlas on axis) and forearm. Allows rotation around one axis.'] };
  m.update = (P, t, dt) => {
    let u = P.move; if (P.play) { u = (u + dt * 0.18) % 1; P.move = u; }
    const s = Math.sin(u * TAU), c = Math.cos(u * TAU);
    if (m.mode === 'ball') { hum.rotation.set(s * 0.9, c * 0.5, c * 0.9); }
    else if (m.mode === 'hinge') { hp.rotation.z = (0.5 - 0.5 * Math.cos(u * TAU)) * 2.4; }
    else { atlas.rotation.y = s * 0.9; }
  };
  m.hud = (P) => ({ title: TX[P.mode][0], lines: [TX[P.mode][1]] });
  return m;
}
