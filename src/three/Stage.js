// Premium 3D stage: studio lighting, bloom, orbit controls, picking, labels, explode, x-ray, slice, focus tween.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clamp } from './kit.js';

function gradientTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#0b1224'); gr.addColorStop(0.55, '#070b16'); gr.addColorStop(1, '#03050a');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function floorTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'), gr = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  gr.addColorStop(0, 'rgba(120,200,255,0.28)'); gr.addColorStop(0.5, 'rgba(80,140,220,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(160,210,255,0.22)'; g.lineWidth = 2;
  [90, 150, 210].forEach((r) => { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let sharedEnv = null;
function envFor(renderer) {
  if (sharedEnv) return sharedEnv;
  const pm = new THREE.PMREMGenerator(renderer);
  sharedEnv = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return sharedEnv;
}

export class Stage {
  constructor(container, opts = {}) {
    this.opts = Object.assign({ mini: false, bloom: true, interactive: true, labelsHost: null }, opts);
    this.container = container;
    (window.__instStages = window.__instStages || new Set()).add(this); // lets public/campus.js add inside views, names and 3D video tours
    this.cb = { onHover: opts.onHover, onSelect: opts.onSelect, onModel: opts.onModel, onTick: opts.onTick };
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.opts.mini ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace; r.localClippingEnabled = true;
    r.domElement.className = 'stage-canvas'; container.appendChild(r.domElement);
    this.scene = new THREE.Scene(); this.scene.background = gradientTexture();
    this.scene.environment = envFor(r);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 300);
    this.camera.position.set(0, 1, 8);
    this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.07, rotateSpeed: 0.7, zoomSpeed: 0.8, panSpeed: 0.6, screenSpacePanning: true });
    this.controls.enabled = this.opts.interactive;
    // lights
    this.scene.add(new THREE.HemisphereLight(0xaec8ff, 0x1a1022, 0.55));
    const key = new THREE.DirectionalLight(0xfff0e0, 2.2); key.position.set(5, 8, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fb6ff, 1.6); rim.position.set(-6, 3, -5); this.scene.add(rim);
    const fill = new THREE.PointLight(0xff8fb0, 14, 30); fill.position.set(-4, -2, 5); this.scene.add(fill);
    this.rig = { key, rim, fill };
    // floor + dust
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.floor.rotation.x = -Math.PI / 2; this.scene.add(this.floor);
    const N = 320, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ size: 0.035, color: 0x9ec8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dust);
    // state
    this.model = null; this.params = {}; this.explode = 0; this._ex = 0; this.xray = false; this.labelsOn = false;
    this.selected = null; this.hovered = null; this.slice = 0; this.sliceOn = false; this.clock = 0; this.hl = new Map();
    this.plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); this.tween = null; this.pick = []; this.labelEls = new Map();
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(); this.down = null; this.visible = true; this.alive = true;
    this.setupComposer();
    this.onResize = this.onResize.bind(this);
    this.ro = new ResizeObserver(this.onResize); this.ro.observe(container);
    this.io = new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }); this.io.observe(container);
    const el = r.domElement;
    if (this.opts.interactive) {
      el.addEventListener('pointermove', (e) => this.onMove(e));
      el.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY }; this.stopAuto(); });
      el.addEventListener('pointerup', (e) => this.onUp(e));
      el.addEventListener('pointerleave', () => this.setHover(null));
    }
    this.onResize();
    this.last = performance.now(); this.raf = requestAnimationFrame(this.loop = this.loop.bind(this));
  }

  setupComposer() {
    if (!this.opts.bloom) { this.composer = null; return; }
    try {
      const c = this.composer = new EffectComposer(this.renderer);
      c.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.7, 0.9);
      c.addPass(this.bloom); c.addPass(new OutputPass());
    } catch (e) { this.composer = null; }
  }
  onResize() {
    const w = this.container.clientWidth || 2, h = this.container.clientHeight || 2;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.setSize(w, h); this.composer.setPixelRatio?.(this.renderer.getPixelRatio()); }
  }

  /* ---------- model ---------- */
  setModel(model) {
    if (this.model) { this.scene.remove(this.model.group); this.model.dispose(); }
    this.clearLabels(); this.hl.clear(); this.selected = null; this.hovered = null;
    this.model = model; this.scene.add(model.group);
    this.params = {}; model.params.forEach((p) => { this.params[p.id] = p.value; });
    model.group.updateMatrixWorld(true);
    model.parts.forEach((p) => {
      p.mats.forEach((m) => { m.envMapIntensity = 0.75; m.userData.e0 = m.emissive ? m.emissive.clone() : null; m.userData.i0 = m.emissiveIntensity ?? 0; m.userData.o0 = m.opacity; m.userData.t0 = m.transparent; m.userData.d0 = m.depthWrite; m.userData.s0 = m.side; });
      const b = new THREE.Box3().setFromObject(p.obj); p.c0 = b.getCenter(new THREE.Vector3()); p.r0 = b.getBoundingSphere(new THREE.Sphere()).radius;
    });
    model.parts.forEach((p) => { if (p.mode !== undefined) p.obj.visible = p.mode === model.mode; });
    this.fit(model);
    this.rebuildPick(); this.buildLabels(); this.applyXray(); this.applySlice();
    model.onParam && Object.keys(this.params).forEach((k) => model.onParam(k, this.params[k], this.params, this));
    this.cb.onModel && this.cb.onModel(this.activeParts());
  }
  fit(model) {
    const box = new THREE.Box3().setFromObject(model.group);
    const c = box.getCenter(new THREE.Vector3()), s = box.getBoundingSphere(new THREE.Sphere()).radius || 3;
    this.center = c; this.radius = s;
    const d = (s / Math.sin((this.camera.fov * Math.PI) / 360)) * (this.opts.mini ? 0.9 : 1.0) * (model.meta.zoom || 1);
    const dir = new THREE.Vector3(...(model.meta.view || [0.35, 0.22, 1])).normalize();
    this.home = { target: c.clone(), pos: c.clone().add(dir.multiplyScalar(d)) };
    this.controls.minDistance = s * 0.35; this.controls.maxDistance = d * 2.4;
    this.camera.position.copy(this.home.pos); this.controls.target.copy(c); this.controls.update();
    const fl = model.meta.floor !== false;
    this.floor.visible = fl; this.floor.scale.setScalar(s * 3.6); this.floor.position.set(c.x, box.min.y - s * 0.08, c.z);
    this.controls.autoRotateSpeed = 0.7;
    this.controls.autoRotate = !!model.meta.autoRotate || this.opts.mini;
  }
  resetView() { this.tweenTo(this.home.pos, this.home.target, 0.9); this.select(null); }
  activeParts() { return this.model ? this.model.parts.filter((p) => p.mode === undefined || p.mode === this.model.mode) : []; }
  rebuildPick() {
    this.pick = [];
    const active = new Set(this.activeParts().map((p) => p.id));
    this.model.group.traverse((o) => { if (o.isMesh && o.userData.part && active.has(o.userData.part)) this.pick.push(o); });
  }
  setMode(mode) {
    this.model.mode = mode; this.model.parts.forEach((p) => { if (p.mode !== undefined) p.obj.visible = p.mode === mode; });
    this.select(null); this.rebuildPick(); this.buildLabels(); this.applyXray();
    this.cb.onModel && this.cb.onModel(this.activeParts());
  }
  /* ---------- parameters & toggles ---------- */
  setParam(id, v) {
    this.params[id] = v;
    if (id === 'mode') this.setMode(v);
    this.model.onParam && this.model.onParam(id, v, this.params, this);
  }
  setExplode(v) { this.explode = v; }
  setXray(b) { this.xray = b; this.applyXray(); }
  setLabels(b) { this.labelsOn = b; this.buildLabels(); }
  setAuto(b) { this.controls.autoRotate = b; }
  stopAuto() { if (!this.opts.mini && this.controls.autoRotate && this.model && !this.model.meta.autoRotate) this.controls.autoRotate = false; }
  setSlice(on, v = 0) { this.sliceOn = on; this.slice = v; this.applySlice(); }
  applyXray() {
    if (!this.model) return;
    this.model.parts.forEach((p) => {
      const dim = this.xray && this.selected !== p.id;
      p.mats.forEach((m) => {
        if (dim) { m.transparent = true; m.opacity = Math.min(m.userData.o0, 0.16); m.depthWrite = false; }
        else { m.transparent = m.userData.t0; m.opacity = m.userData.o0; m.depthWrite = m.userData.d0; }
        m.needsUpdate = true;
      });
    });
  }
  applySlice() {
    if (!this.model) return;
    const on = this.sliceOn && this.model.sliceable;
    const axis = this.model.meta.sliceAxis || 'x';
    const n = axis === 'x' ? new THREE.Vector3(-1, 0, 0) : axis === 'y' ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, -1);
    this.plane.normal.copy(n);
    const extent = this.radius || 3;
    this.plane.constant = (this.center ? this.center[axis] : 0) + (this.slice * 2 - 1) * extent * 0.9;
    this.model.parts.forEach((p) => p.mats.forEach((m) => {
      const want = on ? [this.plane] : [];
      if ((m.clippingPlanes || []).length !== want.length) { m.clippingPlanes = want; m.side = on ? THREE.DoubleSide : m.userData.s0; m.needsUpdate = true; }
    }));
  }
  /* ---------- selection & focus ---------- */
  select(id) {
    this.selected = id; this.applyXray();
    this.cb.onSelect && this.cb.onSelect(id);
    if (id) this.focusPart(id);
  }
  partWorldCenter(p) {
    const k = Math.min(this.explode, 1) * (this.model.meta.explodeScale ?? 1);
    const off = p.obj.position.clone().sub(p.base);
    return this.model.group.localToWorld(p.c0.clone().add(off));
  }
  focusPart(id) {
    const p = this.model.parts.find((x) => x.id === id); if (!p) return;
    const c = this.partWorldCenter(p), dist = clamp(p.r0 * 3.4, this.radius * 0.55, this.radius * 2.2);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.tweenTo(c.clone().add(dir.multiplyScalar(dist)), c, 0.9);
  }
  tweenTo(pos, target, dur = 0.8) {
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur };
  }
  setHover(id) { if (this.hovered !== id) { this.hovered = id; this.container.style.cursor = id ? 'pointer' : ''; this.cb.onHover && this.cb.onHover(id); } }
  castAt(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    const hits = this.ray.intersectObjects(this.pick, false);
    let back = null;
    for (const h of hits) {
      if (this.sliceOn && this.model.sliceable && this.plane.distanceToPoint(h.point) < 0) continue;
      if (!h.object.visible) continue;
      const id = h.object.userData.part, pt = this.model.parts.find((x) => x.id === id);
      if (pt && pt.back) { if (back === null) back = id; continue; }
      return id;
    }
    return back;
  }
  onMove(e) { if (e.buttons) return; this.setHover(this.castAt(e)); }
  onUp(e) {
    if (!this.down) return; const moved = Math.abs(e.clientX - this.down.x) + Math.abs(e.clientY - this.down.y); this.down = null;
    if (moved < 6) { const id = this.castAt(e); this.select(id === this.selected ? null : id); }
  }
  /* ---------- labels ---------- */
  clearLabels() { this.labelEls.forEach((el) => el.remove()); this.labelEls.clear(); }
  buildLabels() {
    this.clearLabels(); if (!this.labelsOn || !this.model || !this.opts.labelsHost) return;
    this.activeParts().forEach((p) => {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'lbl'; el.textContent = p.name;
      el.addEventListener('click', () => this.select(p.id)); this.opts.labelsHost.appendChild(el); this.labelEls.set(p.id, el);
    });
  }
  updateLabels() {
    if (!this.labelEls.size) return;
    const w = this.container.clientWidth, h = this.container.clientHeight, v = new THREE.Vector3();
    this.model.parts.forEach((p) => {
      const el = this.labelEls.get(p.id); if (!el) return;
      v.copy(this.partWorldCenter(p)).project(this.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      el.style.display = vis ? '' : 'none';
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%,-50%)`;
      el.classList.toggle('on', this.selected === p.id || this.hovered === p.id);
    });
  }
  /* ---------- frame ---------- */
  updateHighlight(dt) {
    const m = this.model; if (!m) return;
    m.parts.forEach((p) => {
      const target = (this.selected === p.id ? 0.5 + 0.18 * Math.sin(this.clock * 3.2) : 0) + (this.hovered === p.id ? 0.45 : 0);
      const cur = this.hl.get(p.id) || 0, nv = cur + (target - cur) * Math.min(1, dt * 10);
      if (cur < 0.002 && nv < 0.002) { this.hl.set(p.id, 0); return; } this.hl.set(p.id, nv);
      p.mats.forEach((mt) => {
        if (!mt.emissive || !mt.userData.e0) return;
        mt.emissive.copy(mt.userData.e0).lerp(mt.color, clamp(nv, 0, 1)); mt.emissiveIntensity = mt.userData.i0 + nv * 0.9;
      });
    });
  }
  loop(now) {
    if (!this.alive) return; this.raf = requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden) { this.last = now; return; }
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); // rAF time can be earlier than the constructor time this.last = now; this.clock += dt;
    if (this.tween) {
      const tw = this.tween; tw.t += dt / tw.dur; const k = tw.t >= 1 ? 1 : 1 - Math.pow(1 - tw.t, 3);
      this.camera.position.lerpVectors(tw.p0, tw.p1, k); this.controls.target.lerpVectors(tw.t0, tw.t1, k); if (tw.t >= 1) this.tween = null;
    }
    this.controls.update();
    const m = this.model;
    if (m) {
      this._ex += (this.explode - this._ex) * Math.min(1, dt * 6);
      const sc = (m.meta.explodeScale ?? 1) * this._ex;
      m.parts.forEach((p) => {
        if (p.explode.lengthSq() > 0) p.obj.position.set(p.base.x + p.explode.x * sc, p.base.y + p.explode.y * sc, p.base.z + p.explode.z * sc);
        if (p.spread) p.obj.children.forEach((c) => { const b = c.userData.b0 || (c.userData.b0 = c.position.clone()); const l = b.length() || 1; c.position.set(b.x + (b.x / l) * sc * p.spread, b.y + (b.y / l) * sc * p.spread, b.z + (b.z / l) * sc * p.spread); });
      });
      if (m.update) m.update(this.params, this.clock, dt, this);
      this.updateHighlight(dt);
      this._tk = (this._tk || 0) + dt;
      if (this._tk > 0.12 && this.cb.onTick) { this._tk = 0; this.cb.onTick(this.params, m.hud ? m.hud(this.params) : null, m.autoParams || []); }
    }
    this.dust.rotation.y += dt * 0.01; this.dust.position.y = Math.sin(this.clock * 0.2) * 0.2;
    this.updateLabels();
    if (this.sliceOn) this.applySlice();
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
  }
  screenshot() { if (this.composer) this.composer.render(0); else this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }
  dispose() {
    this.alive = false; cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io.disconnect(); this.clearLabels();
    if (this.model) this.model.dispose(); this.controls.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
  }
}

/* ---------- one-off thumbnail renderer (shared context, cached) ---------- */
let TR = null; const thumbCache = new Map();
export function renderThumb(key, build, w = 520, h = 340) {
  if (thumbCache.has(key)) return thumbCache.get(key);
  if (!TR) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setSize(w, h, false); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace; r.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(); scene.environment = envFor(r);
    scene.add(new THREE.HemisphereLight(0xaec8ff, 0x1a1022, 0.6));
    const key1 = new THREE.DirectionalLight(0xfff0e0, 2.2); key1.position.set(5, 8, 6); scene.add(key1);
    const rim = new THREE.DirectionalLight(0x6fb6ff, 1.6); rim.position.set(-6, 3, -5); scene.add(rim);
    TR = { r, scene, cam: new THREE.PerspectiveCamera(38, w / h, 0.05, 200) };
  }
  let url = '';
  try {
    const m = build(); TR.scene.add(m.group); m.group.updateMatrixWorld(true);
    m.update && m.update(Object.fromEntries(m.params.map((p) => [p.id, p.value])), 1.2, 0.016, null);
    const box = new THREE.Box3().setFromObject(m.group), c = box.getCenter(new THREE.Vector3()), s = box.getBoundingSphere(new THREE.Sphere()).radius || 3;
    const d = (s / Math.sin((38 * Math.PI) / 360)) * 0.95 * (m.meta.zoom || 1);
    TR.cam.position.copy(c).add(new THREE.Vector3(...(m.meta.view || [0.35, 0.22, 1])).normalize().multiplyScalar(d)); TR.cam.lookAt(c);
    TR.r.render(TR.scene, TR.cam); url = TR.r.domElement.toDataURL('image/png');
    TR.scene.remove(m.group); m.dispose();
  } catch (e) { url = ''; }
  thumbCache.set(key, url); return url;
}
