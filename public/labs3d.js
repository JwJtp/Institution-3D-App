/* INSTITUTION 3D Labs, Subjects, Today card and AI teachers
   Loaded after campus.js. Uses the app's own three.js (window.__THREE, set in src/main.jsx). */
(() => {
  if (window.__labsLoaded) return;
  window.__labsLoaded = true;

  /* ================= SETTINGS ================= */
  const AI = {
    // Optional: your server address for the AI teachers. It receives {system, messages}
    // and must reply {text}. See server/ai-teacher-example.mjs. Leave empty to use the
    // built-in offline teacher (and Claude automatically when the page runs inside claude.ai).
    endpoint: '',
    labTeacher: 'Asha',     // name shown for the AI lab teacher
    subjectTeacher: 'Ravi', // name shown for the AI subject teacher
  };

  const start = () => { const C = window.INSTITUTION_CAMPUS; if (!C) { document.addEventListener('campus:ready', start, { once: true }); return; } main(C); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  function main(C) {
  const { h, toast, notify, save, route, clsLabel, speak, stopSpeech, when, fmt } = C;
  const S = C.state();
  S.labs = S.labs || {}; S.subj = S.subj || {}; S.assign = S.assign || []; S.subjSel = S.subjSel || null;
  const $ = (s, r = document) => r.querySelector(s);
  const appState = () => { try { return JSON.parse(localStorage.getItem(C.CAMPUS.appStorageKey) || '{}'); } catch (e) { return {}; } };
  const TH = () => window.__THREE;
  const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const LABS = {}; const LAB_ORDER = [];
  const defineLab = (def) => { LABS[def.id] = def; LAB_ORDER.push(def.id); };

  /* ================= AI TEACHER ================= */
  let sampleFn = null;
  (async () => { try { if (window.claude && window.claude.use) sampleFn = await window.claude.use('sample'); } catch (e) { sampleFn = null; } })();
  const STOP = new Set('a an the is are was were be been of to in on at for and or but with by from as it its this that these those what which who whom how why when where do does did can could should would will shall may might i me my we our you your he she they them their there here about into than then so if not no yes please tell explain give show find'.split(' '));
  const words = (s) => (s.toLowerCase().match(/[a-z0-9₂]+/g) || []).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, ''));
  function offlineAnswer(q, ctx) {
    const lq = q.toLowerCase();
    if (ctx.lab && /(what|how).*(next|now|do i|should i)|next step|stuck|help me|what to do|how to start/.test(lq)) {
      return ctx.step ? 'Next step: ' + ctx.step + (ctx.hint ? '\nHow: ' + ctx.hint : '') : 'You have finished every step. Look at your observations and try the quiz or another lab.';
    }
    if (!ctx.lab && /quiz|test me|question/.test(lq) && ctx.quiz && ctx.quiz.length) { const x = ctx.quiz[Math.floor(Math.random() * ctx.quiz.length)]; return 'Try this: ' + x[0] + ' Options: ' + x[1].join(' / ') + '. (Answer: ' + x[1][x[2]] + ')'; }
    if (!ctx.lab && /summar|explain|simpl|what is this|teach/.test(lq) && ctx.notes && ctx.notes.length && !(ctx.glossary || []).some((g) => lq.includes(g.name.toLowerCase()))) return ctx.notes.slice(0, 3).join(' ');
    const qw = new Set(words(q));
    let best = null, bs = 0;
    (ctx.glossary || []).forEach((g) => { const nw = words(g.name); const sc = nw.filter((w) => qw.has(w)).length / Math.max(1, nw.length) + (lq.includes(g.name.toLowerCase()) ? 1 : 0); if (sc > bs) { bs = sc; best = g; } });
    if (best && bs >= 0.5) return best.name + ': ' + best.info;
    const sents = (ctx.notes || []).flatMap((n) => n.split(/(?<=[.!?])\s+/));
    const scored = sents.map((s) => { const sw = words(s); return [s, sw.filter((w) => qw.has(w)).length / Math.sqrt(sw.length + 1)]; }).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]);
    if (scored.length) return scored.slice(0, 2).map((x) => x[0]).join(' ');
    const sample = (ctx.glossary || []).slice(0, 3).map((g) => g.name).join(', ');
    return 'I\'m the offline teacher, so I only know the notes for "' + (ctx.title || 'this lesson') + '".' + (sample ? ' Try asking about ' + sample + '.' : '') + ' For anything else, send your question to your class teacher in Messages.';
  }
  async function askAI(q, ctx, history) {
    const sys = 'You are ' + ctx.teacher + ', a friendly AI ' + (ctx.lab ? 'science lab teacher' : 'teacher') + ' for an Indian school student (' + ctx.cls + '). Subject: ' + ctx.subject + '. Topic: "' + ctx.title + '".' +
      (ctx.step ? ' The student is on this lab step: "' + ctx.step + '" (' + (ctx.hint || '') + ').' : '') +
      ' Notes you can rely on: ' + (ctx.notes || []).join(' ').slice(0, 2500) +
      ' Rules: you are an AI, say so if asked; answer in under 110 words, simple English, plain text; give a hint before a full answer for homework or quiz questions; be accurate and NCERT-aligned; always mention safety for real lab work; never encourage harming animals (dissection here is virtual).';
    const hist = (history || []).slice(-8);
    if (sampleFn) {
      try { const r = await sampleFn([{ role: 'user', content: sys }, ...hist, { role: 'user', content: q }], { modelTier: 'quick', cache: false }); if (r && r.text) return { text: r.text, via: 'Claude' }; } catch (e) { if (e && ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) sampleFn = null; }
    }
    if (AI.endpoint) {
      try { const r = await fetch(AI.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: sys, messages: [...hist, { role: 'user', content: q }] }) }); if (r.ok) { const j = await r.json(); if (j && j.text) return { text: j.text, via: 'school server' }; } } catch (e) {}
    }
    return { text: offlineAnswer(q, ctx), via: 'offline' };
  }
  function teacherPanel(opt) {
    // opt: {name, role, getCtx(), starters:[...], compact}
    const hist = [], list = h('div', { class: 'cx-ai-msgs', 'aria-live': 'polite' }), input = h('input', { class: 'cx-ai-in', placeholder: 'Ask ' + opt.name + ' anything…', 'aria-label': 'Your question' });
    const mode = h('span', { class: 'cx-chip a', text: sampleFn ? 'AI · Claude' : AI.endpoint ? 'AI · school server' : 'AI · offline notes' });
    const vbtn = h('button', { class: 'cx-btn cx-ai-voice' + (S.aiVoice ? ' on' : ''), type: 'button', text: S.aiVoice ? 'Voice on' : 'Voice off', title: 'Read answers aloud' });
    vbtn.onclick = () => { S.aiVoice = !S.aiVoice; vbtn.classList.toggle('on', S.aiVoice); vbtn.textContent = S.aiVoice ? 'Voice on' : 'Voice off'; if (!S.aiVoice) stopSpeech(); save(); };
    const add = (who, text) => { const m = h('div', { class: 'cx-ai-m ' + who, text }); list.append(m); list.scrollTop = list.scrollHeight; return m; };
    let busy = false;
    const ask = async (q) => {
      q = (q || '').trim(); if (!q || busy) return; busy = true; add('me', q); input.value = '';
      const wait = add('ai', 'Thinking…'); const ctx = Object.assign({ teacher: opt.name }, opt.getCtx());
      const r = await askAI(q, ctx, hist); wait.textContent = r.text; hist.push({ role: 'user', content: q }, { role: 'assistant', content: r.text });
      mode.textContent = r.via === 'Claude' ? 'AI · Claude' : r.via === 'school server' ? 'AI · school server' : 'AI · offline notes';
      if (S.aiVoice) speak(r.text); busy = false; list.scrollTop = list.scrollHeight;
    };
    const send = h('button', { class: 'cx-btn pri', type: 'button', text: 'Ask', onclick: () => ask(input.value) });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(input.value); });
    let mic = null; const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) { mic = h('button', { class: 'cx-btn', type: 'button', text: 'Speak', title: 'Ask by voice' }); mic.onclick = () => { try { const r = new SR(); r.lang = 'en-IN'; r.interimResults = false; mic.textContent = 'Listening…'; r.onresult = (e) => { ask(e.results[0][0].transcript); }; r.onend = () => { mic.textContent = 'Speak'; }; r.onerror = () => { mic.textContent = 'Speak'; toast('Voice input isn\'t available here. Type your question instead.'); }; r.start(); } catch (e) { toast('Voice input isn\'t available here.'); } }; }
    const starters = h('div', { class: 'cx-ai-starters' }, (opt.starters || []).map((s) => h('button', { type: 'button', text: s, onclick: () => ask(s) })));
    const el = h('div', { class: 'cx-ai' }, h('div', { class: 'cx-ai-head' }, h('span', { class: 'cx-ai-av', text: opt.name[0] }), h('span', {}, h('b', { text: opt.name }), h('small', { text: opt.role + ' · an AI, not a person' })), mode),
      list, starters, h('div', { class: 'cx-ai-row' }, input, mic, send), h('div', { class: 'cx-row', style: 'justify-content:space-between' }, vbtn, h('small', { class: 'cx-note', text: 'Stuck? Send it to your class teacher in Messages.' })));
    add('ai', opt.hello || ('Hi ' + S.child.name + ', I\'m ' + opt.name + '. Ask me anything about this.'));
    return { el, ask, say: (t) => { add('ai', t); if (S.aiVoice) speak(t); } };
  }

  /* ================= 3D LAB ENGINE ================= */
  class Lab3D {
    constructor(host, opt = {}) {
      const T = TH(); this.T = T; this.host = host; this.alive = true;
      const r = this.r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.outputColorSpace = 'srgb'; r.toneMapping = 4; r.toneMappingExposure = 1.1; r.localClippingEnabled = true;
      r.domElement.className = 'cx-lab-canvas'; host.append(r.domElement);
      this.scene = new T.Scene(); this.scene.background = new T.Color(opt.bg || 0x0b1020);
      this.cam = new T.PerspectiveCamera(40, 1, 0.05, 400);
      this.scene.add(new T.HemisphereLight(0xe8eeff, 0x2a2230, 1.25));
      const k = new T.DirectionalLight(0xffffff, 2.3); k.position.set(5, 9, 6); this.scene.add(k); this.key = k;
      const r2 = new T.DirectionalLight(0x9ab8ff, 0.9); r2.position.set(-6, 4, -5); this.scene.add(r2);
      this.target = new T.Vector3(...(opt.target || [0, 0.4, 0])); this.orb = { r: opt.dist || 9, th: opt.th ?? 0.55, ph: opt.ph ?? 1.0 };
      this.home = { t: this.target.clone(), r: this.orb.r, th: this.orb.th, ph: this.orb.ph };
      this.minR = opt.minR || 1.5; this.maxR = opt.maxR || 40;
      this.ray = new T.Raycaster(); this.ndc = new T.Vector2(); this.clickables = []; this.labels = []; this.updaters = [];
      this.labelHost = h('div', { class: 'cx-lab-labels' }); host.append(this.labelHost); this.labelsOn = true;
      this.ptrs = new Map(); this.mode = null; this.tool = null; this.onClick = null; this.tw = null;
      const el = r.domElement;
      el.addEventListener('pointerdown', (e) => this.down(e)); el.addEventListener('pointermove', (e) => this.move(e));
      el.addEventListener('pointerup', (e) => this.up(e)); el.addEventListener('pointercancel', (e) => this.up(e));
      el.addEventListener('wheel', (e) => { e.preventDefault(); this.orb.r = clamp(this.orb.r * (1 + Math.sign(e.deltaY) * 0.1), this.minR, this.maxR); this.tw = null; }, { passive: false });
      el.addEventListener('contextmenu', (e) => e.preventDefault());
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host); this.resize();
      this.last = performance.now(); this.clock = 0;
      const loop = (now) => { if (!this.alive) return; this.raf = requestAnimationFrame(loop); const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now; this.clock += dt; this.frame(dt); };
      this.raf = requestAnimationFrame(loop);
    }
    resize() { const w = this.host.clientWidth || 2, hh = this.host.clientHeight || 2; this.r.setSize(w, hh, false); this.cam.aspect = w / hh; this.cam.updateProjectionMatrix(); }
    setNDC(e) { const b = this.r.domElement.getBoundingClientRect(); this.ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); this.ray.setFromCamera(this.ndc, this.cam); }
    hit(e, objs) {
      this.setNDC(e); const hs = this.ray.intersectObjects(objs || this.clickables, true).filter((x) => visibleDeep(x.object));
      const pr = hs.find((x) => x.object.userData.priority); if (pr) return pr; // pins and handles win even when partly hidden
      if (!objs) { // forgiving taps: a priority target within 26 px of the finger counts
        const b = this.r.domElement.getBoundingClientRect(), v = new this.T.Vector3(); let best = null, bd = 26;
        this.clickables.forEach((o) => { if (!o.userData.priority || !visibleDeep(o)) return; o.getWorldPosition(v); v.project(this.cam); const d = Math.hypot(b.left + (v.x + 1) / 2 * b.width - e.clientX, b.top + (1 - v.y) / 2 * b.height - e.clientY); if (v.z < 1 && d < bd) { bd = d; best = o; } });
        if (best) return { object: best, point: best.getWorldPosition(new this.T.Vector3()) };
      }
      return hs[0] || null;
    }
    planeHit(e, y) { this.setNDC(e); const p = new this.T.Plane(new this.T.Vector3(0, 1, 0), -y), out = new this.T.Vector3(); return this.ray.ray.intersectPlane(p, out) ? out : null; }
    down(e) {
      this.r.domElement.setPointerCapture(e.pointerId); this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
      if (this.ptrs.size === 2) { this.mode = 'pinch'; const [a, b] = [...this.ptrs.values()]; this.pd = Math.hypot(a.x - b.x, a.y - b.y); return; }
      this.moved = 0;
      if (this.tool && this.tool.down && this.tool.down(e) === true) { this.mode = 'tool'; return; }
      const dh = this.hit(e, this.clickables.filter((o) => o.userData.drag));
      if (dh) { const o = rootDrag(dh.object); if (o && o.userData.drag) { o.userData.drag.start && o.userData.drag.start(o); this.mode = 'drag'; this.dragObj = o; this.dragY = o.userData.drag.y ?? o.position.y; const p = this.planeHit(e, this.dragY); this.dragOff = p ? new this.T.Vector3(o.position.x - p.x, 0, o.position.z - p.z) : new this.T.Vector3(); return; } }
      this.mode = e.button === 2 || e.shiftKey ? 'pan' : 'orbit';
    }
    move(e) {
      const p = this.ptrs.get(e.pointerId); if (!p) { if (this.tool && this.tool.hover) this.tool.hover(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.mode === 'pinch' && this.ptrs.size === 2) { const [a, b] = [...this.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (this.pd) this.orb.r = clamp(this.orb.r * this.pd / d, this.minR, this.maxR); this.pd = d; this.tw = null; return; }
      if (this.mode === 'tool') { this.tool && this.tool.move && this.tool.move(e); return; }
      if (this.mode === 'drag' && this.dragObj) { const q = this.planeHit(e, this.dragY); if (q) { const d = this.dragObj.userData.drag, np = q.add(this.dragOff); if (d.bounds) { np.x = clamp(np.x, d.bounds[0], d.bounds[1]); np.z = clamp(np.z, d.bounds[2], d.bounds[3]); } this.dragObj.position.set(np.x, this.dragY, np.z); d.move && d.move(this.dragObj); } return; }
      if (this.mode === 'orbit') { this.orb.th -= dx * 0.008; this.orb.ph = clamp(this.orb.ph - dy * 0.008, 0.15, Math.PI - 0.15); this.tw = null; }
      if (this.mode === 'pan') { const s = this.orb.r * 0.0016, T = this.T, right = new T.Vector3().setFromMatrixColumn(this.cam.matrix, 0), up = new T.Vector3().setFromMatrixColumn(this.cam.matrix, 1); this.target.add(right.multiplyScalar(-dx * s)).add(up.multiplyScalar(dy * s)); this.tw = null; }
    }
    up(e) {
      const wasTool = this.mode === 'tool', wasDrag = this.mode === 'drag';
      this.ptrs.delete(e.pointerId); if (this.ptrs.size) return;
      if (wasTool) { this.tool && this.tool.up && this.tool.up(e); }
      if (wasDrag && this.dragObj) { const o = this.dragObj; this.dragObj = null; o.userData.drag.drop && o.userData.drag.drop(o); }
      if (this.moved < 6 && !wasTool) { const x = this.hit(e); if (this.onClick) this.onClick(x ? clickRoot(x.object) : null, x, e); }
      this.mode = null;
    }
    flyTo(target, r, th, ph, dur = 0.9) { this.tw = { t0: this.target.clone(), t1: target.clone ? target.clone() : new this.T.Vector3(...target), r0: this.orb.r, r1: r ?? this.orb.r, th0: this.orb.th, th1: th ?? this.orb.th, ph0: this.orb.ph, ph1: ph ?? this.orb.ph, k: 0, dur }; }
    resetView() { this.flyTo(this.home.t, this.home.r, this.home.th, this.home.ph); }
    frame(dt) {
      if (this.tw) { const w = this.tw; w.k = Math.min(1, w.k + dt / w.dur); const e = ease(w.k); this.target.lerpVectors(w.t0, w.t1, e); this.orb.r = lerp(w.r0, w.r1, e); this.orb.th = lerp(w.th0, w.th1, e); this.orb.ph = lerp(w.ph0, w.ph1, e); if (w.k >= 1) this.tw = null; }
      const o = this.orb; this.cam.position.set(this.target.x + o.r * Math.sin(o.ph) * Math.sin(o.th), this.target.y + o.r * Math.cos(o.ph), this.target.z + o.r * Math.sin(o.ph) * Math.cos(o.th)); this.cam.lookAt(this.target);
      this.updaters.forEach((f) => f(dt, this.clock));
      this.r.render(this.scene, this.cam);
      this.drawLabels();
    }
    addLabel(obj, text, off, cls) { const el = h('button', { class: 'cx-l3 ' + (cls || ''), type: 'button', text }); el.onclick = () => { if (this.onClick) this.onClick(clickRoot(obj), null); }; this.labelHost.append(el); const L = { obj, el, off: off || [0, 0, 0], show: true }; this.labels.push(L); return L; }
    drawLabels() {
      const w = this.host.clientWidth, hh = this.host.clientHeight, v = new this.T.Vector3();
      this.labels.forEach((L) => {
        const vis = this.labelsOn && L.show && visibleDeep(L.obj);
        if (!vis) { L.el.style.display = 'none'; return; }
        L.obj.getWorldPosition(v); v.x += L.off[0]; v.y += L.off[1]; v.z += L.off[2]; v.project(this.cam);
        if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { L.el.style.display = 'none'; return; }
        L.el.style.display = ''; L.el.style.transform = 'translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * hh).toFixed(1) + 'px) translate(-50%,-100%)';
      });
    }
    snapshot(title) {
      const c = this.r.domElement, W = c.width, H = c.height, out = document.createElement('canvas'); out.width = W; out.height = H; const g = out.getContext('2d');
      this.r.render(this.scene, this.cam); g.drawImage(c, 0, 0);
      const k = W / (this.host.clientWidth || W), v = new this.T.Vector3();
      g.font = '600 ' + Math.round(13 * k) + 'px Inter, system-ui, sans-serif'; g.textBaseline = 'middle';
      this.labels.forEach((L) => { if (!this.labelsOn || !L.show || !visibleDeep(L.obj)) return; L.obj.getWorldPosition(v); v.x += L.off[0]; v.y += L.off[1]; v.z += L.off[2]; v.project(this.cam); if (v.z > 1) return;
        const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, tw = g.measureText(L.el.textContent).width + 16 * k, th = 22 * k;
        g.fillStyle = 'rgba(5,7,13,.85)'; g.fillRect(x - tw / 2, y - th - 4 * k, tw, th); g.fillStyle = '#eaf0ff'; g.fillText(L.el.textContent, x - tw / 2 + 8 * k, y - th / 2 - 4 * k); });
      g.fillStyle = 'rgba(5,7,13,.8)'; g.fillRect(0, 0, W, 34 * k); g.fillStyle = '#5ee6c8'; g.font = '600 ' + Math.round(14 * k) + 'px "JetBrains Mono", monospace'; g.fillText(title, 12 * k, 17 * k);
      out.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b), a = h('a', { href: u, download: title.replace(/\W+/g, '-').toLowerCase() + '.png' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); toast('Saved a labelled picture.'); }, 'image/png');
    }
    dispose() {
      this.alive = false; cancelAnimationFrame(this.raf); this.ro.disconnect();
      this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
      this.r.dispose(); try { this.r.forceContextLoss(); } catch (e) {} this.r.domElement.remove(); this.labelHost.remove();
    }
  }
  function visibleDeep(o) { while (o) { if (o.visible === false) return false; o = o.parent; } return true; }
  function clickRoot(o) { let x = o; while (x) { if (x.userData && x.userData.click) return x; x = x.parent; } return o; }
  function rootDrag(o) { let x = o; while (x) { if (x.userData && x.userData.drag) return x; x = x.parent; } return null; }

  /* geometry + material helpers (all built from the app's own three.js) */
  function kit() {
    const T = TH();
    const V = (x, y, z) => new T.Vector3(x, y, z);
    const mat = (c, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55, metalness: 0 }, o));
    const glass = (c, op = 0.25, o = {}) => new T.MeshPhysicalMaterial(Object.assign({ color: c, transparent: true, opacity: op, roughness: 0.08, metalness: 0, clearcoat: 1, side: 2, depthWrite: false }, o));
    const glow = (c, k = 1.5) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
    const mesh = (g, m, p, r, s) => { const x = new T.Mesh(g, m); if (p) x.position.set(p[0], p[1], p[2]); if (r) x.rotation.set(r[0], r[1], r[2]); if (s) { if (typeof s === 'number') x.scale.setScalar(s); else x.scale.set(s[0], s[1], s[2]); } return x; };
    const box = (w, hh, d, m, p, r) => mesh(new T.BoxGeometry(w, hh, d), m, p, r);
    const cyl = (rt, rb, hh, m, p, r, seg = 32, open = false) => mesh(new T.CylinderGeometry(rt, rb, hh, seg, 1, open), m, p, r);
    const sph = (rad, m, p, s, seg = 28) => mesh(new T.SphereGeometry(rad, seg, Math.round(seg * 0.7)), m, p, null, s);
    const cone = (rad, hh, m, p, r, seg = 28) => mesh(new T.ConeGeometry(rad, hh, seg), m, p, r);
    const torus = (rad, tube, m, p, r, arc = TAU) => mesh(new T.TorusGeometry(rad, tube, 12, 48, arc), m, p, r);
    const plane = (w, hh, m, p, r) => mesh(new T.PlaneGeometry(w, hh), m, p, r);
    const tube = (pts, rad, m, seg) => { const c = new T.CatmullRomCurve3(pts.map((q) => V(q[0], q[1], q[2]))); const x = new T.Mesh(new T.TubeGeometry(c, seg || Math.max(24, pts.length * 14), rad, 10, false), m); x.userData.curve = c; return x; };
    const group = (...kids) => { const g = new T.Group(); kids.flat().forEach((k) => k && g.add(k)); return g; };
    const tex = (w, hh, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; draw(c.getContext('2d'), w, hh); const t = new T.CanvasTexture(c); t.colorSpace = 'srgb'; t.anisotropy = 4; return t; };
    const halfShell = (rad, side, m) => new T.Mesh(new T.SphereGeometry(rad, 28, 14, side > 0 ? 0 : Math.PI, Math.PI, 0, Math.PI / 2), m);
    return { T, V, mat, glass, glow, mesh, box, cyl, sph, cone, torus, plane, tube, group, tex, halfShell };
  }

  /* ================= LAB SCREEN ================= */
  const SUBJ_COL = { Biology: '#7fe08a', Physics: '#6aa8ff', Chemistry: '#b27cff', Maths: '#ffcf5c', 'Social Science': '#ff9f6a', Computers: '#5ee6c8' };
  let LAB = null; // {id, E, def, api, el, ...}
  function labState(id) { return (S.labs[id] = S.labs[id] || { steps: [], obs: [], done: false, at: 0, secs: 0 }); }
  function closeLab() {
    if (!LAB) return;
    try { LAB.inst && LAB.inst.dispose && LAB.inst.dispose(); } catch (e) {}
    try { LAB.E.dispose(); } catch (e) {}
    stopSpeech(); clearInterval(LAB.timer); LAB.el.remove(); LAB = null;
    document.documentElement.classList.remove('cx-lab-open');
  }
  function openLab(id) {
    const def = LABS[id]; if (!def) { toast('That lab was not found.'); return; }
    if (!TH()) { toast('3D is still loading. Try again in a moment.'); return; }
    closeLab();
    const st = labState(id); st.at = Date.now();
    S.last = { kind: 'lab', id, title: def.title, at: Date.now() }; save();
    const el = h('div', { id: 'cx-lab', role: 'dialog', 'aria-label': def.title + ' 3D lab' });
    const stage = h('div', { class: 'cx-lab-stage' });
    const info = h('div', { class: 'cx-lab-info', hidden: true });
    const read = h('div', { class: 'cx-lab-read', hidden: true });
    const toolsBar = h('div', { class: 'cx-lab-tools' });
    stage.append(info, read, toolsBar);
    const stepsEl = h('ol', { class: 'cx-lab-steps' }), obsEl = h('div', { class: 'cx-lab-obs' }), ctrlEl = h('div', { class: 'cx-lab-ctrls' });
    const prog = h('span', { class: 'cx-chip a' });
    const labelsBtn = h('button', { class: 'cx-btn on', type: 'button', text: 'Names on' });
    const back = h('button', { class: 'cx-back', type: 'button', text: '← Back' });
    el.append(
      h('header', { class: 'cx-lab-head' }, back,
        h('div', { class: 'cx-lab-title' }, h('span', { class: 'eyebrow', style: 'color:' + (SUBJ_COL[def.subject] || '#5ee6c8'), text: def.subject + ' · ' + def.cls + ' · 3D lab' }), h('h2', { text: def.icon + ' ' + def.title })),
        prog, labelsBtn,
        h('button', { class: 'cx-btn', type: 'button', text: 'Reset view', onclick: () => E.resetView() }),
        h('button', { class: 'cx-btn', type: 'button', text: 'Labelled picture', onclick: () => E.snapshot(def.title + ' · ' + S.child.name) })),
      h('div', { class: 'cx-lab-body' },
        h('aside', { class: 'cx-lab-left' }, h('p', { class: 'cx-note', style: 'margin:0', text: def.intro }), def.safety ? h('p', { class: 'cx-lab-safe', text: def.safety }) : null,
          h('h4', { text: 'Steps' }), stepsEl, ctrlEl, h('h4', { text: 'Observations' }), obsEl),
        stage,
        h('aside', { class: 'cx-lab-right' })));
    document.body.append(el); document.documentElement.classList.add('cx-lab-open');
    const E = new Lab3D(stage, def.view || {});
    labelsBtn.onclick = () => { E.labelsOn = !E.labelsOn; labelsBtn.classList.toggle('on', E.labelsOn); labelsBtn.textContent = E.labelsOn ? 'Names on' : 'Names off'; };
    back.onclick = () => { location.hash = S.labReturn || '#/campus/labs'; };
    const glossary = [], K = kit();
    let curTool = null, toolList = [], onTool = null;
    const api = {
      E, K, h, T: K.T, def,
      part(obj, name, infoText, opt = {}) { obj.userData.click = { name, info: infoText, id: opt.id || name }; E.clickables.push(obj); glossary.push({ name, info: infoText }); const L = E.addLabel(obj, name, opt.off, opt.cls); if (opt.hidden) L.show = false; obj.userData.label = L; return L; },
      clickable(obj) { E.clickables.push(obj); return obj; },
      info(name, text) { info.hidden = false; info.replaceChildren(h('b', { text: name }), h('p', { text }), h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn', type: 'button', text: 'Ask ' + AI.labTeacher, onclick: () => teacher.ask('Tell me more about the ' + name) }), h('button', { class: 'cx-btn', type: 'button', text: 'Close', onclick: () => { info.hidden = true; } }))); },
      say(t) { teacher.say(t); },
      obs(t) { if (!st.obs.includes(t)) { st.obs.push(t); save(); drawObs(); } },
      readout(rows) { read.hidden = !rows; if (rows) read.replaceChildren(...rows.map(([k, v]) => h('div', { class: 'cx-lab-rr' }, h('span', { text: k }), h('b', { text: v })))); },
      controls(...nodes) { ctrlEl.replaceChildren(...nodes.flat().filter(Boolean)); },
      tools(list, cb) { toolList = list; onTool = cb; drawTools(); },
      setTool(id) { curTool = id; el.dataset.tool = id || ''; drawTools(); onTool && onTool(id); },
      get tool() { return curTool; },
      cur() { return firstOpen(); },
      done(i, observation) {
        if (st.steps[i]) return; st.steps[i] = true; if (observation) api.obs(observation);
        drawSteps(); save();
        const n = firstOpen();
        if (n >= def.steps.length) complete();
        else { teacher.say('Well done! Next: ' + def.steps[n].t + (def.steps[n].hint ? ' ' + def.steps[n].hint : '')); if (def.steps[n].tool) api.setTool(def.steps[n].tool); }
      },
      isDone(i) { return !!st.steps[i]; },
      slider(id, label, min, max, step, val, unit, on) { const out = h('b', { text: val + (unit || '') }), inp = h('input', { type: 'range', id: 'cx-ls-' + id, min, max, step, value: val }); inp.oninput = () => { out.textContent = inp.value + (unit || ''); on(+inp.value); }; return h('label', { class: 'cx-lab-sl' }, h('span', {}, label, out), inp); },
      buttons(list) { return h('div', { class: 'cx-row' }, list.map(([t, fn, cls]) => h('button', { class: 'cx-btn ' + (cls || ''), type: 'button', text: t, onclick: fn }))); },
    };
    const firstOpen = () => { for (let i = 0; i < def.steps.length; i++) if (!st.steps[i]) return i; return def.steps.length; };
    function drawSteps() {
      const cur = firstOpen();
      stepsEl.replaceChildren(...def.steps.map((s, i) => h('li', { class: st.steps[i] ? 'done' : i === cur ? 'now' : '' }, h('span', { class: 'n', text: st.steps[i] ? '✓' : String(i + 1) }), h('span', {}, h('b', { text: s.t }), i === cur && s.hint ? h('small', { text: s.hint }) : null))));
      const n = st.steps.filter(Boolean).length; prog.textContent = n + ' / ' + def.steps.length + ' steps';
    }
    function drawObs() { obsEl.replaceChildren(...(st.obs.length ? st.obs.map((o) => h('p', { text: '• ' + o })) : [h('p', { class: 'cx-note', text: 'Your observations appear here as you work.' })])); }
    function drawTools() {
      toolsBar.replaceChildren(...toolList.map((t) => h('button', { type: 'button', class: (curTool === t.id ? 'on ' : '') + (t.cls || ''), title: t.title || t.label, onclick: () => { if (t.action) { t.action(); return; } api.setTool(t.id); } }, h('span', { class: 'i', text: t.icon || '•' }), h('span', { text: t.label }))));
      toolsBar.hidden = !toolList.length;
    }
    function complete() {
      if (!st.done) { st.done = true; st.doneAt = Date.now(); save(); notify('parent', S.child.name + ' completed the 3D lab "' + def.title + '" (' + def.subject + ').', 'lab'); notify('teacher', S.child.name + ' completed the 3D lab "' + def.title + '".', 'lab'); }
      teacher.say('Lab complete! You did every step. Read your observations, then try the quiz for this topic or another lab.');
      toast('Lab complete: ' + def.title);
    }
    const teacher = teacherPanel({ name: AI.labTeacher, role: 'Lab teacher', starters: ['What do I do next?', 'Why does this happen?', 'Explain this step', 'Is it safe in a real lab?'],
      hello: 'Hi ' + S.child.name + ', I\'m ' + AI.labTeacher + ', your AI lab teacher. ' + (firstOpen() < def.steps.length ? 'First: ' + def.steps[firstOpen()].t + '. ' + (def.steps[firstOpen()].hint || '') : 'You finished this lab before. Explore freely!'),
      getCtx: () => { const i = firstOpen(), s = def.steps[i]; return { lab: true, subject: def.subject, cls: def.cls, title: def.title, step: s ? s.t : '', hint: s ? s.hint : '', notes: [def.intro, ...(def.notes || []), ...st.obs, ...glossary.map((g) => g.name + ': ' + g.info)], glossary }; } });
    el.querySelector('.cx-lab-right').append(teacher.el);
    E.onClick = (obj, hit, e) => {
      if (LAB && LAB.inst && LAB.inst.click && LAB.inst.click(obj, hit, e) === true) return;
      if (obj && obj.userData.click) api.info(obj.userData.click.name, obj.userData.click.info);
    };
    LAB = { id, E, def, api, el, inst: null }; window.__cxLab = LAB;
    try { LAB.inst = def.build(api) || {}; } catch (e) { console.error(e); teacher.say('Sorry, this lab could not start on this device: ' + e.message); }
    if (LAB.inst && LAB.inst.update) E.updaters.push(LAB.inst.update);
    drawSteps(); drawObs(); drawTools();
    const f = firstOpen(); if (f < def.steps.length && def.steps[f].tool) api.setTool(def.steps[f].tool);
    LAB.timer = setInterval(() => { if (!document.hidden) { st.secs += 1; if (st.secs % 10 === 0) save(); } }, 1000);
  }
  function labRoute() {
    const r = route();
    if (r.v === 'lab') { if (!LAB || LAB.id !== r.a) openLab(r.a); }
    else if (LAB) closeLab();
  }
  addEventListener('hashchange', labRoute);
  const goLab = (id) => { S.labReturn = location.hash.startsWith('#/lab/') ? (S.labReturn || '#/campus/labs') : (location.hash || '#/campus/labs'); save(); location.hash = '#/lab/' + id; };

  /* ================= LAB HELPERS ================= */
  function anims(E) {
    const list = [];
    E.updaters.push((dt) => { for (let i = list.length - 1; i >= 0; i--) { const a = list[i]; a.t += dt; const k = Math.min(1, a.t / a.d); a.fn(ease(k)); if (k >= 1) { list.splice(i, 1); a.done && a.done(); } } });
    return (d, fn, done) => list.push({ t: 0, d, fn, done });
  }
  function pinSpots(api, spots, y, onAll) {
    const { K, E } = api; let n = 0;
    const ms = spots.map(([x, z]) => { const m = K.sph(0.1, K.glow(0x5ee6c8, 1.8), [x, y + 0.05, z]); m.userData.pinSpot = true; m.userData.priority = true; E.scene.add(m); E.clickables.push(m); return m; });
    return {
      click(obj, hit) {
        if ((!obj || !obj.userData.pinSpot) && hit && hit.point) { const m = ms.find((q) => !q.userData.pinned && Math.hypot(q.position.x - hit.point.x, q.position.z - hit.point.z) < 0.45); if (m) obj = m; }
        if (!obj || !obj.userData.pinSpot || obj.userData.pinned) return false;
        obj.userData.pinned = true; obj.visible = false;
        const pin = K.group(K.cyl(0.016, 0.016, 0.55, K.mat(0xcfd6e0, { metalness: 0.8, roughness: 0.3 }), [0, 0.22, 0]), K.sph(0.065, K.mat(0xff4d6a), [0, 0.5, 0]));
        pin.position.copy(obj.position); pin.rotation.z = 0.25; E.scene.add(pin);
        if (++n === ms.length) onAll(); return true;
      },
      show(v) { ms.forEach((m) => { if (!m.userData.pinned) m.visible = v; }); },
      all() { ms.forEach((m) => { if (!m.userData.pinned) this.click(m); }); },
    };
  }
  function sliceSound() { try { const c = (window.__cxAC = window.__cxAC || new (window.AudioContext || window.webkitAudioContext)()), len = Math.floor(c.sampleRate * 0.12), bf = c.createBuffer(1, len, c.sampleRate), d = bf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len) * 0.35; const s = c.createBufferSource(), f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500; s.buffer = bf; s.connect(f).connect(c.destination); s.start(); } catch (e) {} }
  function cutLine(api, pts, onDone) {
    // Scalpel cut. Drag along the glowing guide, or tap along it. The camera turns to look straight down,
    // a 3D scalpel follows the pointer, and "Guide my hand" finishes the cut automatically if it is hard to do.
    const { K, E } = api, T = K.T, red = K.glow(0xff3355, 1.3), white = K.glow(0xffffff, 1.4);
    const guide = K.tube(pts, 0.03, new T.MeshBasicMaterial({ color: 0x9ff8e6, transparent: true, opacity: 0.4, depthTest: false })); guide.renderOrder = 5; E.scene.add(guide);
    const dots = pts.map((p) => { const d = K.sph(0.05, white, p); E.scene.add(d); return d; });
    const blade = K.group(K.box(0.36, 0.02, 0.07, K.mat(0xdfe6ee, { metalness: 0.95, roughness: 0.15 }), [0.18, 0, 0]), K.box(0.55, 0.06, 0.09, K.mat(0x2a2f38, { roughness: 0.5 }), [-0.28, 0.03, 0]));
    blade.visible = false; blade.rotation.z = 0.5; E.scene.add(blade);
    const cut = pts.map(() => false); let fin = false, down = false, tries = 0, focused = false, active = false; const v = new T.Vector3();
    const segs = [], pct = () => Math.round(cut.filter(Boolean).length / pts.length * 100);
    const yLine = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const seg = (i, j) => { const sg = K.tube([pts[i], pts[j]], 0.024, red, 4); E.scene.add(sg); segs.push(sg); };
    const mark = (i) => { if (cut[i]) return; cut[i] = true; dots[i].visible = false; if (i > 0 && cut[i - 1]) seg(i - 1, i); if (i < pts.length - 1 && cut[i + 1]) seg(i, i + 1); };
    const finish = () => { if (fin) return; fin = true; dots.forEach((d) => { d.visible = false; }); guide.visible = false; blade.visible = false; segs.forEach((sg) => E.scene.remove(sg)); E.scene.add(K.tube(pts, 0.026, red)); api.readout(null); E.tool = null; onDone && onDone(); };
    const moveBlade = (e) => { const q = E.planeHit(e, yLine + 0.12); if (q) { blade.visible = active && !fin; blade.position.copy(q); } };
    const near = (e) => {
      if (fin) return; const b = E.r.domElement.getBoundingClientRect(), R = Math.max(70, Math.min(b.width, b.height) * 0.09); let hitAny = false;
      pts.forEach((p, i) => { if (cut[i]) return; v.set(p[0], p[1], p[2]).project(E.cam); const sx = b.left + (v.x + 1) / 2 * b.width, sy = b.top + (1 - v.y) / 2 * b.height; if (Math.hypot(sx - e.clientX, sy - e.clientY) < R) { mark(i); hitAny = true; } });
      if (hitAny) sliceSound(); moveBlade(e);
      api.readout([['Scalpel', 'cutting'], ['Cut done', pct() + '%'], ['Tip', 'drag along the glow']]);
      if (pct() >= 55) { cut.forEach((c, i) => mark(i)); finish(); }
    };
    function auto() { if (fin) return; let i = 0; active = true; blade.visible = true; E.tool = null; const tick = () => { if (fin || !E.alive) return; const p = pts[i]; blade.position.set(p[0], yLine + 0.12, p[2]); mark(i); sliceSound(); api.readout([['Scalpel', 'guided cut'], ['Cut done', pct() + '%']]); i++; if (i < pts.length) setTimeout(tick, 110); else finish(); }; tick(); }
    function focus() { if (focused) return; focused = true; const a = pts[0], z = pts[pts.length - 1], mid = new T.Vector3((a[0] + z[0]) / 2, yLine, (a[2] + z[2]) / 2), len = Math.hypot(z[0] - a[0], z[2] - a[2]); E.flyTo(mid, Math.max(3.6, len * 1.75), Math.atan2(z[0] - a[0], z[2] - a[2]) + Math.PI / 2, 0.32, 0.8); }
    return {
      tool: {
        down: (e) => { down = true; near(e); return true; },
        move: (e) => { if (down) near(e); },
        hover: (e) => moveBlade(e),
        up: () => { down = false; if (fin) return; tries++; if (pct() > 0) api.say('Cut ' + pct() + '% done. Keep going along the glowing line.' + (tries >= 2 ? ' If it is hard, press "Guide my hand".' : '')); else if (tries >= 2) api.say('Press and drag along the glowing line, or press "Guide my hand" and watch the scalpel do it.'); },
      },
      show(vv) { active = vv && !fin; guide.visible = active; blade.visible = false; dots.forEach((d, i) => { if (!fin && !cut[i]) d.visible = active; }); if (active) focus(); },
      auto, get done() { return fin; },
    };
  }
  const TOOLS = { forceps: { id: 'forceps', label: 'Forceps', icon: '⟨⟩' }, scalpel: { id: 'scalpel', label: 'Scalpel', icon: '✂' }, lens: { id: 'lens', label: 'Hand lens', icon: '◎' } };

  /* ================= BIOLOGY: COCKROACH ================= */
  defineLab({
    id: 'cockroach', subject: 'Biology', cls: '1st PUC', icon: '🪳', title: 'Cockroach: virtual dissection',
    intro: 'Dissect a cockroach from the back (dorsal side) and find its heart, gut and nerve cord. This is a virtual dissection; no animal is harmed.',
    safety: 'In a real lab: wear gloves, handle the scalpel away from your body, and follow your teacher. CBSE does not require real animal dissection.',
    notes: ['The cockroach body has a head, thorax (3 segments) and abdomen (10 segments).', 'Its heart is a long muscular tube lying along the mid-dorsal line of the thorax and abdomen, with 13 funnel-shaped chambers and openings called ostia.', 'The alimentary canal has a foregut (mouth, pharynx, oesophagus, crop, gizzard), midgut and hindgut (ileum, colon, rectum).', 'Hepatic caeca, 6–8 blind tubules at the junction of foregut and midgut, secrete digestive juice.', 'Malpighian tubules, 100–150 yellow threads at the junction of midgut and hindgut, remove nitrogenous waste (excretion).', 'The nervous system is a double ventral nerve cord with ganglia: 3 in the thorax and 6 in the abdomen. The brain is the supra-oesophageal ganglion.', 'Cockroaches breathe through tracheae that open by 10 pairs of spiracles.'],
    view: { dist: 8.5, th: 0.7, ph: 0.95, target: [0, 0.35, 0] },
    steps: [
      { t: 'Pin the cockroach to the tray', hint: 'Click each of the 4 glowing pin points.' },
      { t: 'Lift the wings', hint: 'With the forceps, click the brown wings.', tool: 'forceps' },
      { t: 'Cut along the middle of the back', hint: 'With the scalpel, drag along the glowing line (or tap along it). Stuck? Press Guide my hand.', tool: 'scalpel' },
      { t: 'Open the body wall', hint: 'With the forceps, click the body wall on the left and on the right.', tool: 'forceps' },
      { t: 'Find the heart', hint: 'Click the long pink tube along the middle of the back.' },
      { t: 'Find 4 parts of the gut', hint: 'Click the crop, gizzard, hepatic caeca and Malpighian tubules.' },
      { t: 'Lift the gut and find the nerve cord', hint: 'With the forceps click the gut to lift it, then click the white nerve cord underneath.', tool: 'forceps' },
    ],
    build(api) {
      const { K, E } = api, A = anims(E), T = K.T;
      E.scene.add(K.box(7.4, 0.3, 4.4, K.mat(0x5b3a1e), [0, -0.15, 0]), K.box(7, 0.06, 4, K.mat(0x1e1e22, { roughness: 0.9 }), [0, 0.03, 0]));
      const brown = K.mat(0x6b3517, { roughness: 0.35, metalness: 0.05 }), dark = K.mat(0x3a1d0c, { roughness: 0.4 }), under = K.mat(0x8a5532, { roughness: 0.6 });
      const body = K.group(); E.scene.add(body);
      const segs = [[1.45, 0.32, 0.16, 0.5], [1.07, 0.22, 0.2, 0.46], [0.77, 0.22, 0.2, 0.46]];
      for (let i = 0; i < 10; i++) segs.push([0.45 - i * 0.27, 0.17, 0.2 * (1 - i * 0.035), 0.5 * (1 - i * 0.055)]);
      const flapL = K.group(), flapR = K.group(); flapL.position.set(0, 0.35, -0.47); flapR.position.set(0, 0.35, 0.47); body.add(flapL, flapR);
      const bottomGeo = new T.SphereGeometry(1, 24, 10, 0, TAU, Math.PI / 2, Math.PI / 2), wallMat = K.mat(0x6b3517, { roughness: 0.35, side: 2 });
      segs.forEach(([x, rx, ry, rz]) => {
        const b = new T.Mesh(bottomGeo, under); b.position.set(x, 0.35, 0); b.scale.set(rx, ry * 0.9, rz); body.add(b);
        [[flapL, -1], [flapR, 1]].forEach(([g, s]) => { const m = K.halfShell(1, s, wallMat); m.scale.set(rx, ry, rz); m.position.set(x, 0, -0.47 * s); g.add(m); });
      });
      api.part(flapR, 'Body wall (tergites)', 'Hard plates of chitin on the back of each segment, called tergites. The plates underneath are sternites.', { off: [-0.6, 0.35, -0.47] });
      flapL.userData.click = flapR.userData.click; E.clickables.push(flapL);
      const head = K.sph(0.3, dark, [2.0, 0.33, 0], [0.75, 0.85, 0.95]); body.add(head);
      api.part(head, 'Head', 'Triangular head with mouthparts for biting and chewing.', { off: [0, 0.35, 0] });
      const eyes = K.group(K.sph(0.09, K.mat(0x050505, { roughness: 0.2 }), [2.08, 0.42, 0.21], [0.8, 1.2, 0.6]), K.sph(0.09, K.mat(0x050505, { roughness: 0.2 }), [2.08, 0.42, -0.21], [0.8, 1.2, 0.6])); body.add(eyes);
      api.part(eyes, 'Compound eyes', 'A pair of large compound eyes made of about 2000 tiny units (ommatidia).', { off: [0, 0.2, 0.25] });
      const ant = K.group([1, -1].map((s) => K.tube([[2.12, 0.45, 0.1 * s], [2.7, 0.62, 0.4 * s], [3.4, 0.58, 0.95 * s], [3.9, 0.5, 1.55 * s]], 0.012, dark))); body.add(ant);
      api.part(ant, 'Antennae', 'Long thread-like feelers with sensory receptors for touch and smell.', { off: [0.6, 0.15, 0] });
      const pron = K.sph(1, brown, [1.45, 0.47, 0], [0.36, 0.08, 0.56]); body.add(pron);
      api.part(pron, 'Pronotum (thorax shield)', 'The shield-like plate on the first thoracic segment (prothorax).', { off: [0, 0.18, 0] });
      const legs = K.group(); [[1.4, 0.35], [1.05, -0.1], [0.75, -0.45]].forEach(([x, dxo]) => [1, -1].forEach((s) => legs.add(K.tube([[x, 0.25, 0.38 * s], [x + dxo * 0.4, 0.42, 0.95 * s], [x + dxo, 0.12, 1.35 * s], [x + dxo * 1.5, 0.05, 1.65 * s]], 0.03, dark)))); body.add(legs);
      api.part(legs, 'Legs (3 pairs)', 'Three pairs of jointed walking legs, one pair on each thoracic segment.', { off: [0.2, 0.35, 1.3] });
      const cerci = K.group(K.cone(0.035, 0.32, dark, [-2.25, 0.36, 0.12], [0, 0, Math.PI / 2 + 0.1]), K.cone(0.035, 0.32, dark, [-2.25, 0.36, -0.12], [0, 0, Math.PI / 2 + 0.1])); body.add(cerci);
      api.part(cerci, 'Anal cerci', 'A pair of jointed sensory structures at the tip of the abdomen.', { off: [-0.1, 0.2, 0] });
      const spir = K.group(); for (let i = 0; i < 8; i++) [1, -1].forEach((s) => spir.add(K.sph(0.025, K.mat(0x111111), [0.4 - i * 0.27, 0.3, 0.44 * (1 - i * 0.05) * s]))); body.add(spir);
      api.part(spir, 'Spiracles', 'Small breathing holes on the sides. Air enters the tracheae through 10 pairs of spiracles.', { off: [-0.6, 0.12, 0.45] });
      const wingM = K.mat(0x8a4b22, { roughness: 0.3, transparent: true, opacity: 0.94 }), hindM = K.glass(0xd8c7a0, 0.35);
      const wings = K.group(); const wR = K.group(K.sph(1, wingM, [0, 0, 0], [1.6, 0.03, 0.33]), K.sph(1, hindM, [0.05, -0.03, 0.08], [1.45, 0.02, 0.36])), wL = K.group(K.sph(1, wingM, [0, 0, 0], [1.6, 0.03, 0.33]), K.sph(1, hindM, [0.05, -0.03, -0.08], [1.45, 0.02, 0.36]));
      wR.position.set(-0.45, 0.6, 0.16); wL.position.set(-0.45, 0.61, -0.16); wings.add(wR, wL); body.add(wings);
      api.part(wings, 'Wings', 'Two pairs: the outer forewings (tegmina) are leathery and protect the thin, membranous hindwings used for flying.', { off: [-0.3, 0.2, 0] });
      // internal organs
      const inside = [];
      const heart = K.group(K.tube([[1.3, 0.47, 0], [0.5, 0.49, 0], [-0.5, 0.48, 0], [-1.9, 0.43, 0]], 0.035, K.mat(0xe28fb0, { roughness: 0.3 }))); for (let i = 0; i < 13; i++) heart.add(K.sph(0.05, K.mat(0xe28fb0, { roughness: 0.3 }), [1.15 - i * 0.24, 0.48 - (i > 8 ? 0.01 * (i - 8) : 0), 0], [1.4, 0.8, 1]));
      body.add(heart); inside.push(api.part(heart, 'Heart (13 chambers)', 'A long muscular tube along the middle of the back. It has 13 funnel-shaped chambers with small openings (ostia) and pumps blood (haemolymph) forward.', { off: [0, 0.15, 0], hidden: true }));
      const gut = K.group(); body.add(gut);
      const oes = K.tube([[2.05, 0.32, 0], [1.7, 0.34, 0], [1.25, 0.35, 0]], 0.04, K.mat(0xe7c18c)); gut.add(oes);
      const crop = K.sph(1, K.mat(0xf0cf95, { roughness: 0.35 }), [0.95, 0.36, 0], [0.42, 0.13, 0.21]); gut.add(crop);
      const giz = K.sph(0.12, K.mat(0x7a4a22, { roughness: 0.4 }), [0.5, 0.35, 0]); gut.add(giz);
      const caeca = K.group(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; caeca.add(K.tube([[0.36, 0.35, 0], [0.42 + 0.05 * Math.cos(a), 0.35 + 0.12 * Math.sin(a), 0.15 * Math.cos(a)], [0.62, 0.35 + 0.15 * Math.sin(a), 0.22 * Math.cos(a)]], 0.022, K.mat(0xf3dc8c))); } gut.add(caeca);
      const mid = K.tube([[0.36, 0.35, 0], [-0.2, 0.33, 0.12], [-0.85, 0.34, -0.05]], 0.055, K.mat(0xe9b97a)); gut.add(mid);
      const malp = K.group(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, l = 0.35 + (i % 3) * 0.07; malp.add(K.tube([[-0.86, 0.34, 0], [-0.86 + 0.1 * Math.cos(a), 0.34 + 0.08 * Math.sin(a * 2), 0.18 * Math.sin(a)], [-0.86 + l * Math.cos(a) * 0.7, 0.3 + 0.06 * Math.cos(a * 3), l * Math.sin(a)]], 0.009, K.mat(0xffe14d, { roughness: 0.4 }))); } gut.add(malp);
      const hind = K.tube([[-0.86, 0.34, 0], [-1.2, 0.3, 0.15], [-1.5, 0.33, -0.1], [-1.85, 0.32, 0.05], [-2.15, 0.31, 0]], 0.045, K.mat(0xd9a86a)); gut.add(hind);
      const sal = K.group(); for (let i = 0; i < 8; i++) sal.add(K.sph(0.04, K.mat(0xf6f1e4), [1.3 + (i % 2) * 0.08, 0.3 + (i % 3) * 0.03, (i < 4 ? 1 : -1) * (0.14 + (i % 2) * 0.05)])); gut.add(sal);
      const fat = K.group(); for (let i = 0; i < 12; i++) fat.add(K.sph(0.06 + (i % 3) * 0.015, K.mat(0xfdf6e3, { roughness: 0.8 }), [0.2 - (i >> 1) * 0.3, 0.28, (i % 2 ? 1 : -1) * 0.27])); body.add(fat);
      inside.push(api.part(oes, 'Oesophagus', 'Narrow tube from the pharynx that carries food to the crop.', { off: [0, 0.1, 0], hidden: true }));
      inside.push(api.part(crop, 'Crop', 'A sac-like part of the foregut that stores food.', { off: [0, 0.15, 0], hidden: true }));
      inside.push(api.part(giz, 'Gizzard (proventriculus)', 'Has a thick muscular wall and chitinous teeth that grind the food.', { off: [0, 0.16, 0], hidden: true }));
      inside.push(api.part(caeca, 'Hepatic caeca', '6–8 blind finger-like tubules at the junction of foregut and midgut. They secrete digestive juice.', { off: [0.2, 0.25, 0], hidden: true }));
      inside.push(api.part(mid, 'Midgut (mesenteron)', 'The narrow middle part of the gut where digestion and absorption happen.', { off: [0, 0.12, 0], hidden: true }));
      inside.push(api.part(malp, 'Malpighian tubules', '100–150 thin yellow threads at the junction of midgut and hindgut. They remove nitrogenous waste: the excretory organs.', { off: [0, 0.2, 0.3], hidden: true }));
      inside.push(api.part(hind, 'Hindgut: ileum, colon, rectum', 'The wider last part of the gut. Water is absorbed in the rectum and waste leaves through the anus.', { off: [0, 0.12, 0], hidden: true }));
      inside.push(api.part(sal, 'Salivary glands', 'A pair of glands near the crop that secrete saliva.', { off: [0, 0.1, 0.2], hidden: true }));
      inside.push(api.part(fat, 'Fat bodies', 'Whitish tissue that stores food reserves.', { off: [-0.6, 0.1, -0.3], hidden: true }));
      const nerve = K.group(K.sph(0.08, K.mat(0xf4f1e6), [1.95, 0.4, 0]), K.tube([[1.95, 0.38, 0.03], [1.8, 0.22, 0.03], [-1.7, 0.19, 0.03]], 0.012, K.mat(0xf4f1e6)), K.tube([[1.95, 0.38, -0.03], [1.8, 0.22, -0.03], [-1.7, 0.19, -0.03]], 0.012, K.mat(0xf4f1e6)));
      [1.4, 1.05, 0.75, 0.25, -0.1, -0.45, -0.8, -1.15, -1.5].forEach((x) => nerve.add(K.sph(0.045, K.mat(0xf4f1e6), [x, 0.195, 0], [1.3, 0.7, 1.4]))); body.add(nerve);
      const nerveL = api.part(nerve, 'Ventral nerve cord', 'A double nerve cord along the belly side with ganglia: 3 in the thorax and 6 in the abdomen. The brain (supra-oesophageal ganglion) is in the head.', { off: [0, 0.12, 0], hidden: true });
      const pins = pinSpots(api, [[1.75, 1.2], [1.75, -1.2], [-1.75, 1.0], [-1.75, -1.0]], 0.1, () => api.done(0, 'The cockroach is pinned through the legs, back facing up.'));
      const topY = (x) => { const s = segs.reduce((b, q) => (Math.abs(q[0] - x) < Math.abs(b[0] - x) ? q : b)); return 0.35 + s[2] + 0.01; };
      const cutPts = []; for (let x = -1.95; x <= 1.55; x += 0.25) cutPts.push([x, topY(x), 0]);
      const cut = cutLine(api, cutPts, () => api.done(2, 'A cut along the mid-dorsal line opens the body wall without damaging the organs below.')); cut.show(false);
      let opened = 0, gutUp = false; const found = new Set();
      api.tools([TOOLS.forceps, TOOLS.scalpel, TOOLS.lens, { id: 'guide', label: 'Guide my hand', icon: '✋', action: () => { if (api.cur() === 0) { pins.all(); } else if (api.cur() === 2) { api.setTool('scalpel'); cut.auto(); } else api.say('Guide my hand helps with pinning (step 1) and the scalpel cut (step 3).'); } }], (id) => { E.tool = id === 'scalpel' && api.isDone(1) && !cut.done ? cut.tool : null; cut.show(api.isDone(1) && !cut.done); if (id === 'scalpel' && !api.isDone(1)) api.say('First ' + (api.isDone(0) ? 'lift the wings with the forceps' : 'pin the cockroach (click the 4 glowing points)') + ', then the scalpel can cut.'); });
      if (api.isDone(0)) pins.show(false);
      return {
        click(obj, hit) {
          if (api.tool === 'lens' && hit) { E.flyTo(hit.point, 2.2); return true; }
          if (pins.click(obj, hit)) return true;
          const step = api.cur();
          if (step === 1 && obj === wings && api.tool === 'forceps') { A(0.8, (k) => { wR.rotation.x = 1.25 * k; wR.position.z = 0.16 + 0.75 * k; wL.rotation.x = -1.25 * k; wL.position.z = -0.16 - 0.75 * k; wR.position.y = wL.position.y = 0.6 + 0.1 * k; }); api.done(1, 'The leathery forewings (tegmina) cover thin, membranous hindwings.'); api.setTool('scalpel'); return true; }
          if (step === 3 && (obj === flapL || obj === flapR) && api.tool === 'forceps') {
            if (flapR.userData.open) return true; flapR.userData.open = flapL.userData.open = true;
            [[flapR, 1], [flapL, -1]].forEach(([g, sg], n) => A(0.9 + n * 0.25, (k) => { g.rotation.x = 2.2 * k * sg; }, () => { if (++opened === 2) { inside[0].show = true; api.done(3, 'Under the body wall lies the long tubular heart on top, with the gut below it.'); } }));
            return true;
          }
          if (step === 4 && obj === heart) { api.info('Heart (13 chambers)', heart.userData.click.info); api.done(4, 'The heart is a 13-chambered tube along the mid-dorsal line. Blood (haemolymph) is colourless and flows in open spaces (open circulation).'); inside.forEach((L) => { L.show = true; }); return false; }
          if (step === 5 && [crop, giz, caeca, malp].includes(obj)) { found.add(obj); api.info(obj.userData.click.name, obj.userData.click.info); if (found.size === 4) api.done(5, 'Gut order: mouth → pharynx → oesophagus → crop → gizzard → midgut (with hepatic caeca) → hindgut (with Malpighian tubules) → anus.'); else api.say('Good: ' + obj.userData.click.name + '. ' + (4 - found.size) + ' more to find.'); return true; }
          if (step === 6 && !gutUp && api.tool === 'forceps' && (obj === gut || [oes, crop, giz, caeca, mid, malp, hind, sal].includes(obj) || obj === heart)) { gutUp = true; A(1, (k) => { gut.position.set(0, 0.55 * k, 1.05 * k); gut.rotation.x = -0.5 * k; heart.position.set(0, 0.7 * k, -0.9 * k); fat.position.set(0, 0.3 * k, 0); }); nerveL.show = true; api.say('The gut is lifted aside. Now click the white nerve cord along the floor of the body.'); return true; }
          if (step === 6 && gutUp && obj === nerve) { api.info('Ventral nerve cord', nerve.userData.click.info); api.done(6, 'The double ventral nerve cord has ganglia in each segment: 3 thoracic and 6 abdominal.'); return true; }
          return false;
        },
      };
    },
  });

  /* ================= BIOLOGY: FROG ================= */
  defineLab({
    id: 'frog', subject: 'Biology', cls: '1st PUC', icon: '🐸', title: 'Frog: virtual dissection',
    intro: 'Open the frog from the belly side (ventral side) and find its heart, lungs, liver, gut, kidneys and urinary bladder. This is a virtual dissection; no animal is harmed.',
    safety: 'In a real lab: gloves, care with the scalpel, and follow your teacher. CBSE does not require real animal dissection.',
    notes: ['The frog has a three-chambered heart: two atria and one ventricle, covered by a membrane called the pericardium.', 'Frogs breathe through their skin in water and through a pair of lungs on land.', 'The liver is large and reddish-brown; bile made by the liver is stored in the gall bladder.', 'Food passes from the mouth to the oesophagus, stomach, intestine and rectum, and leaves through the cloaca.', 'A pair of elongated dark red kidneys lies against the back wall. Urine is stored in the urinary bladder and passes out through the cloaca.', 'Fat bodies are yellow finger-like structures that store food.'],
    view: { dist: 10, th: 0.5, ph: 0.62, target: [-0.3, 0.3, 0.45] },
    steps: [
      { t: 'Pin the frog to the tray', hint: 'Click the 4 glowing pin points at the hands and feet.' },
      { t: 'Cut the skin along the middle', hint: 'With the scalpel, drag along the glowing line. Stuck? Press Guide my hand.', tool: 'scalpel' },
      { t: 'Open the skin flaps', hint: 'With the forceps, click the skin on both sides.', tool: 'forceps' },
      { t: 'Cut the muscle wall', hint: 'With the scalpel, drag along the dotted line again.', tool: 'scalpel' },
      { t: 'Open the muscle wall', hint: 'With the forceps, click the muscle on both sides.', tool: 'forceps' },
      { t: 'Find 5 organs', hint: 'Click the heart, lungs, liver, stomach and intestine.' },
      { t: 'Move the gut aside and find the kidneys and bladder', hint: 'With the forceps click the intestine, then click the kidneys and the urinary bladder.', tool: 'forceps' },
    ],
    build(api) {
      const { K, E } = api, A = anims(E), T = K.T;
      E.scene.add(K.box(7.4, 0.3, 5, K.mat(0x5b3a1e), [0, -0.15, 0]), K.box(7, 0.06, 4.6, K.mat(0x1e1e22, { roughness: 0.9 }), [0, 0.03, 0]));
      const skinM = K.mat(0xe6df9c, { roughness: 0.5, side: 2 }), backM = K.mat(0x587a35, { roughness: 0.5 }), musM = K.mat(0xc86a6a, { roughness: 0.6, side: 2 });
      const body = K.group(); E.scene.add(body);
      const C = [0, 0.45, 0], SC = [1.45, 0.45, 0.82];
      const back = new T.Mesh(new T.SphereGeometry(1, 32, 12, 0, TAU, Math.PI / 2, Math.PI / 2), backM); back.position.set(...C); back.scale.set(...SC); body.add(back);
      const flap = (mat, k, z) => { const g = K.group(); g.position.set(0, 0.45, z); const m = K.halfShell(1, z > 0 ? 1 : -1, mat); m.scale.set(SC[0] * k, SC[1] * k, SC[2] * k); m.position.set(0, 0, -z); g.add(m); body.add(g); return g; };
      const skinL = flap(skinM, 1, -0.8), skinR = flap(skinM, 1, 0.8), musL = flap(musM, 0.94, -0.76), musR = flap(musM, 0.94, 0.76);
      api.part(skinR, 'Skin', 'Moist, smooth skin. Frogs can breathe through their skin when in water (cutaneous respiration).', { off: [0.3, 0.5, -0.8] }); skinL.userData.click = skinR.userData.click; E.clickables.push(skinL);
      const musLab = api.part(musR, 'Muscle wall', 'The layer of body-wall muscle under the skin.', { off: [-0.3, 0.45, -0.76], hidden: true }); musL.userData.click = musR.userData.click; E.clickables.push(musL);
      const head = K.sph(1, K.mat(0xe6df9c, { roughness: 0.5 }), [1.8, 0.32, 0], [0.62, 0.3, 0.72]); body.add(head);
      api.part(head, 'Head', 'Flat head with a wide mouth. The eyes and nostrils are on the other (dorsal) side.', { off: [0.1, 0.3, 0] });
      const limb = K.mat(0xd8d08c, { roughness: 0.5 }), limbs = K.group();
      [1, -1].forEach((s) => { limbs.add(K.tube([[1.05, 0.35, 0.65 * s], [1.4, 0.3, 1.25 * s], [1.85, 0.15, 1.55 * s]], 0.09, limb), K.sph(1, limb, [1.95, 0.1, 1.62 * s], [0.18, 0.04, 0.16])); limbs.add(K.tube([[-1.2, 0.35, 0.55 * s], [-0.6, 0.3, 1.45 * s], [-1.9, 0.2, 1.8 * s], [-2.6, 0.12, 1.35 * s]], 0.12, limb), K.sph(1, limb, [-2.75, 0.08, 1.3 * s], [0.32, 0.04, 0.22])); });
      body.add(limbs); api.part(limbs, 'Limbs', 'Short forelimbs and long, strong hindlimbs with webbed feet for jumping and swimming.', { off: [-1.6, 0.3, 1.6] });
      const L = [];
      const heart = K.group(K.cone(0.17, 0.32, K.mat(0xa52a3a, { roughness: 0.3 }), [0.72, 0.66, 0], [0, 0, Math.PI / 2]), K.sph(0.12, K.mat(0x7a1f2b, { roughness: 0.3 }), [0.92, 0.66, 0.11]), K.sph(0.12, K.mat(0x7a1f2b, { roughness: 0.3 }), [0.92, 0.66, -0.11]), K.tube([[0.85, 0.72, 0], [1.05, 0.74, 0], [1.15, 0.72, 0.15]], 0.035, K.mat(0xc8404f)), K.tube([[1.05, 0.74, 0], [1.15, 0.72, -0.15]], 0.035, K.mat(0xc8404f)));
      body.add(heart); L.push(api.part(heart, 'Heart (3 chambers)', 'Two atria and one ventricle, inside a thin membrane (pericardium). Oxygen-rich and oxygen-poor blood mix a little in the single ventricle.', { off: [0, 0.2, 0], hidden: true }));
      const lungs = K.group(K.sph(1, K.mat(0xf2a0a8, { roughness: 0.6 }), [0.55, 0.52, 0.4], [0.42, 0.11, 0.17]), K.sph(1, K.mat(0xf2a0a8, { roughness: 0.6 }), [0.55, 0.52, -0.4], [0.42, 0.11, 0.17]));
      body.add(lungs); L.push(api.part(lungs, 'Lungs', 'A pair of elongated, pink, sac-like lungs used for breathing on land.', { off: [0, 0.15, 0.4], hidden: true }));
      const liverM = K.mat(0x7a2e1f, { roughness: 0.35 });
      const liver = K.group(K.sph(1, liverM, [0.33, 0.68, 0.3], [0.42, 0.11, 0.3]), K.sph(1, liverM, [0.33, 0.68, -0.3], [0.42, 0.11, 0.3]), K.sph(1, liverM, [0.2, 0.7, 0], [0.3, 0.1, 0.2]), K.sph(0.08, K.mat(0x3fae4b, { roughness: 0.3 }), [0.2, 0.62, 0.06]));
      body.add(liver); L.push(api.part(liver, 'Liver and gall bladder', 'The large reddish-brown liver makes bile, which is stored in the small green gall bladder.', { off: [0, 0.15, -0.3], hidden: true }));
      const gut = K.group(); body.add(gut);
      const stom = K.tube([[0.6, 0.52, 0.3], [0.3, 0.55, 0.43], [-0.1, 0.55, 0.38], [-0.3, 0.52, 0.2]], 0.09, K.mat(0xe8b4a8)); gut.add(stom);
      const intest = K.tube([[-0.3, 0.52, 0.2], [-0.5, 0.57, -0.1], [-0.3, 0.6, -0.35], [-0.7, 0.62, -0.3], [-0.8, 0.58, 0.1], [-0.55, 0.63, 0.25], [-0.95, 0.62, 0.25], [-1.0, 0.57, -0.05], [-1.25, 0.52, 0], [-1.45, 0.47, 0]], 0.06, K.mat(0xf0c8b8)); gut.add(intest);
      const panc = K.sph(1, K.mat(0xf3e3b8), [-0.15, 0.58, 0.27], [0.2, 0.04, 0.08]); gut.add(panc);
      L.push(api.part(stom, 'Stomach', 'A wide, curved part of the gut on the left side where food is digested.', { off: [0, 0.15, 0], hidden: true }));
      L.push(api.part(intest, 'Intestine', 'A long coiled tube. Digested food is absorbed here. It ends in the rectum, which opens into the cloaca.', { off: [-0.6, 0.15, 0], hidden: true }));
      L.push(api.part(panc, 'Pancreas', 'A pale gland between the stomach and intestine that makes digestive juice.', { off: [0, 0.1, 0], hidden: true }));
      const fat = K.group(); for (let i = 0; i < 6; i++) [1, -1].forEach((s) => fat.add(K.tube([[-0.15, 0.35, 0.3 * s], [-0.2 + 0.05 * i, 0.42, (0.35 + 0.04 * i) * s], [0.05 + 0.04 * i, 0.4, (0.42 + 0.02 * i) * s]], 0.025, K.mat(0xf7c548)))); body.add(fat);
      L.push(api.part(fat, 'Fat bodies', 'Yellow finger-like bodies that store food.', { off: [0, 0.1, 0.4], hidden: true }));
      const kid = K.group(K.sph(1, K.mat(0x6e1f24, { roughness: 0.35 }), [-0.5, 0.22, 0.18], [0.45, 0.08, 0.13]), K.sph(1, K.mat(0x6e1f24, { roughness: 0.35 }), [-0.5, 0.22, -0.18], [0.45, 0.08, 0.13])); body.add(kid);
      const kidL = api.part(kid, 'Kidneys', 'A pair of elongated, dark red kidneys against the back wall. They filter blood and make urine.', { off: [0, 0.1, 0], hidden: true });
      const blad = K.group(K.sph(0.13, K.glass(0xd8f0ff, 0.5), [-1.2, 0.6, 0.15]), K.sph(0.13, K.glass(0xd8f0ff, 0.5), [-1.2, 0.6, -0.15])); body.add(blad);
      const bladL = api.part(blad, 'Urinary bladder', 'A thin-walled bag that stores urine before it leaves through the cloaca.', { off: [0, 0.15, 0], hidden: true });
      const pins = pinSpots(api, [[1.95, 1.62], [1.95, -1.62], [-2.75, 1.3], [-2.75, -1.3]], 0.12, () => api.done(0, 'The frog is pinned belly-up by its hands and feet.'));
      const pts = []; for (let x = -1.3; x <= 1.31; x += 0.2) { const k = 1 - Math.pow(x / 1.45, 2); pts.push([x, 0.45 + 0.45 * Math.sqrt(Math.max(0, k)) + 0.01, 0]); }
      const cut1 = cutLine(api, pts, () => api.done(1, 'The skin is cut along the middle of the belly from the cloaca to the lower jaw.'));
      const pts2 = pts.map((p) => [p[0], 0.45 + (p[1] - 0.45) * 0.94 + 0.01, 0]);
      let cut2 = null; cut1.show(false);
      let skinOpen = 0, musOpen = 0, gutAside = false; const found = new Set(), found2 = new Set();
      const syncTool = (id) => { const c = api.cur() === 1 ? cut1 : api.cur() === 3 ? cut2 : null; E.tool = id === 'scalpel' && c ? c.tool : null; if (id === 'scalpel' && !c && api.cur() === 0) api.say('First pin the frog: click the 4 glowing points at the hands and feet.'); cut1.show(api.cur() === 1); if (cut2) cut2.show(api.cur() === 3); };
      api.tools([TOOLS.forceps, TOOLS.scalpel, TOOLS.lens, { id: 'guide', label: 'Guide my hand', icon: '✋', action: () => { if (api.cur() === 0) { pins.all(); return; } const c = api.cur() === 1 ? cut1 : api.cur() === 3 ? cut2 : null; if (c) { api.setTool('scalpel'); c.auto(); } else api.say('Guide my hand helps with pinning (step 1) and the scalpel cuts (steps 2 and 4).'); } }], syncTool);
      const openFlap = (g, s, onBoth) => { if (g.userData.open) return; g.userData.open = true; A(0.9, (k) => { g.rotation.x = 2.1 * k * s; }, onBoth); };
      return {
        click(obj, hit) {
          if (api.tool === 'lens' && hit) { E.flyTo(hit.point, 2.2); return true; }
          if (pins.click(obj, hit)) return true;
          const step = api.cur();
          if (step === 2 && (obj === skinL || obj === skinR) && api.tool === 'forceps') { const fin = () => { if (++skinOpen === 2) { musLab.show = true; api.done(2, 'Under the skin is a layer of muscle.'); cut2 = cutLine(api, pts2, () => api.done(3, 'The muscle wall is cut carefully so the organs underneath are not damaged.')); syncTool(api.tool); } }; openFlap(skinR, 1, fin); openFlap(skinL, -1, fin); return true; }
          if (step === 4 && (obj === musL || obj === musR) && api.tool === 'forceps') { const fin = () => { if (++musOpen === 2) { L.forEach((x) => { x.show = true; }); api.done(4, 'The organs are now visible: heart at the front, liver over the gut, coiled intestine behind.'); } }; openFlap(musR, 1, fin); openFlap(musL, -1, fin); return true; }
          const organs = [heart, lungs, liver, stom, intest];
          if (step === 5 && organs.includes(obj)) { found.add(obj); api.info(obj.userData.click.name, obj.userData.click.info); if (found.size === 5) api.done(5, 'Heart (3 chambers), lungs, liver with gall bladder, stomach and intestine identified.'); else api.say('Correct: ' + obj.userData.click.name + '. ' + (5 - found.size) + ' more.'); return true; }
          if (step === 6 && !gutAside && api.tool === 'forceps' && (obj === intest || obj === stom || obj === gut)) { gutAside = true; A(1, (k) => { gut.position.set(0.2 * k, 0.5 * k, -1.1 * k); liver.position.set(0.5 * k, 0.35 * k, 0); fat.position.set(0, 0.2 * k, 0); }); kidL.show = true; bladL.show = true; api.say('The gut is moved aside. Now click the kidneys and the urinary bladder.'); return true; }
          if (step === 6 && gutAside && (obj === kid || obj === blad)) { found2.add(obj); api.info(obj.userData.click.name, obj.userData.click.info); if (found2.size === 2) api.done(6, 'Kidneys make urine; it is stored in the urinary bladder and leaves through the cloaca.'); return true; }
          return false;
        },
      };
    },
  });

  /* ================= BIOLOGY: HIBISCUS FLOWER ================= */
  defineLab({
    id: 'flower', subject: 'Biology', cls: 'Class 6 / 1st PUC', icon: '🌺', title: 'Study a typical flower (China rose)',
    intro: 'Take apart a China rose (hibiscus) whorl by whorl: epicalyx, sepals, petals, stamens and pistil. Then cut the ovary across to see inside.',
    notes: ['Hibiscus (China rose) has an epicalyx: a ring of small green bracts below the calyx.', 'Calyx: 5 green sepals joined at the base (gamosepalous).', 'Corolla: 5 large free petals (polypetalous) with twisted arrangement.', 'Stamens: many, with their filaments joined into one tube (monadelphous) around the style.', 'Pistil: 5 carpels joined (syncarpous); superior ovary with 5 chambers and ovules attached at the centre (axile placentation); 5 stigmas.', 'Pollen grains are made in the anthers. After fertilisation the ovules become seeds and the ovary becomes the fruit.'],
    view: { dist: 6.5, th: 0.6, ph: 1.15, target: [0, 1.9, 0] },
    steps: [
      { t: 'Remove the epicalyx and sepals', hint: 'With the forceps, click the small green parts under the petals.', tool: 'forceps' },
      { t: 'Remove all 5 petals', hint: 'With the forceps, click each red petal.', tool: 'forceps' },
      { t: 'Look at the anthers with the hand lens', hint: 'Choose the hand lens and click the yellow anthers on the long tube.', tool: 'lens' },
      { t: 'Find the stigma', hint: 'Click the red knobs at the very top.' },
      { t: 'Cut the ovary across', hint: 'With the scalpel, drag across the white dotted line at the base.', tool: 'scalpel' },
      { t: 'Count the chambers of the ovary', hint: 'Type the number of chambers you see and press Check.' },
    ],
    build(api) {
      const { K, E } = api, A = anims(E), T = K.T;
      E.scene.add(K.box(6, 0.2, 4, K.mat(0xeceff4, { roughness: 0.8 }), [0, -0.1, 0]), K.cyl(0.5, 0.6, 0.12, K.mat(0x30363f), [0, 0.06, 0]));
      const green = K.mat(0x3f8f3a, { roughness: 0.5 }), red = K.mat(0xd81b3a, { roughness: 0.45, side: 2 }), pink = K.mat(0xf06a8a, { roughness: 0.4 });
      const fl = K.group(); E.scene.add(fl);
      const stalk = K.cyl(0.05, 0.06, 1.5, green, [0, 0.85, 0]); fl.add(stalk); api.part(stalk, 'Pedicel (flower stalk)', 'The stalk that holds the flower.', { off: [0.15, 0, 0] });
      const thal = K.sph(0.13, green, [0, 1.6, 0]); fl.add(thal); api.part(thal, 'Thalamus', 'The swollen tip of the stalk on which all the flower parts are attached.', { off: [0.25, -0.05, 0], hidden: true });
      const epi = K.group(); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, b = K.cyl(0.012, 0.02, 0.32, green, [Math.cos(a) * 0.18, 1.55, Math.sin(a) * 0.18]); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); epi.add(b); } fl.add(epi);
      api.part(epi, 'Epicalyx', 'A ring of small green bracts just below the calyx. It is an extra whorl found in hibiscus.', { off: [0.3, -0.1, 0] });
      const cal = K.group(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3, s = K.sph(1, green, [Math.cos(a) * 0.14, 1.78, Math.sin(a) * 0.14], [0.11, 0.3, 0.05]); s.rotation.y = -a; s.rotation.z = -0.35; s.rotateOnAxis(new T.Vector3(1, 0, 0), 0); cal.add(s); } fl.add(cal);
      api.part(cal, 'Calyx (5 sepals)', 'Five green sepals joined at the base. They protect the flower in the bud.', { off: [0.3, 0.1, 0] });
      const petals = []; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, g = K.group(), p = K.sph(1, red, [0.62, 0, 0], [0.62, 0.035, 0.45]); g.add(p); g.position.set(0, 1.95, 0); g.rotation.set(0, -a, 0.42); fl.add(g); petals.push(g); }
      const corolla = K.group(); petals.forEach((p) => { p.userData.petal = true; }); api.part(petals[0], 'Corolla (5 petals)', 'Five large, free, brightly coloured petals that attract insects for pollination.', { off: [0.6, 0.15, 0] }); petals.slice(1).forEach((p) => { p.userData.click = petals[0].userData.click; E.clickables.push(p); });
      const col = K.cyl(0.035, 0.045, 1.4, pink, [0, 2.3, 0]); fl.add(col); api.part(col, 'Staminal tube', 'The filaments of many stamens are joined into one tube around the style (monadelphous stamens).', { off: [0.2, -0.3, 0] });
      const anth = K.group(); for (let i = 0; i < 46; i++) { const y = 2.3 + (i / 46) * 0.65, a = i * 2.4; anth.add(K.sph(0.032, K.mat(0xffd23f, { roughness: 0.6 }), [Math.cos(a) * 0.08, y, Math.sin(a) * 0.08])); } fl.add(anth);
      api.part(anth, 'Anthers', 'The tips of the stamens. Pollen grains (male gametes) are made inside the anthers.', { off: [0.25, 0.1, 0] });
      const stig = K.group(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; stig.add(K.tube([[0, 3.0, 0], [Math.cos(a) * 0.08, 3.12, Math.sin(a) * 0.08], [Math.cos(a) * 0.12, 3.22, Math.sin(a) * 0.12]], 0.012, pink), K.sph(0.045, K.mat(0xb3124d, { roughness: 0.7 }), [Math.cos(a) * 0.12, 3.24, Math.sin(a) * 0.12])); } fl.add(stig);
      api.part(stig, 'Stigma (5 lobes)', 'The sticky tips of the pistil that receive pollen. Hibiscus has 5 stigmas, one for each carpel.', { off: [0, 0.15, 0] });
      const ovary = K.sph(0.15, K.mat(0x9ccc65, { roughness: 0.4 }), [0, 1.66, 0], [1, 0.85, 1]); fl.add(ovary);
      const ovL = api.part(ovary, 'Ovary', 'The swollen base of the pistil. It contains the ovules, which become seeds after fertilisation.', { off: [0.3, 0, 0], hidden: true });
      const ts = K.cyl(0.32, 0.32, 0.02, K.mat(0xffffff, { map: K.tex(512, 512, (g, w) => { g.fillStyle = '#b5d98a'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.48, 0, TAU); g.fill(); g.strokeStyle = '#6a9a3a'; g.lineWidth = 8; g.stroke(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.save(); g.translate(w / 2, w / 2); g.rotate(a); g.fillStyle = '#e8f5d0'; g.beginPath(); g.ellipse(w * 0.22, 0, w * 0.17, w * 0.11, 0, 0, TAU); g.fill(); g.strokeStyle = '#6a9a3a'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#f2e3a0'; [0.13, 0.2, 0.27].forEach((r, j) => { g.beginPath(); g.arc(w * r, (j % 2 ? 1 : -1) * w * 0.035, w * 0.03, 0, TAU); g.fill(); g.strokeStyle = '#b8a45a'; g.lineWidth = 2; g.stroke(); }); g.restore(); } g.fillStyle = '#6a9a3a'; g.beginPath(); g.arc(w / 2, w / 2, w * 0.04, 0, TAU); g.fill(); }) }), [1.6, 0.25, 0], [Math.PI / 2, 0, 0]);
      ts.rotation.set(0, 0, 0); ts.position.set(1.4, 0.24, 0.6); ts.visible = false; E.scene.add(ts);
      api.part(ts, 'Ovary cut across (T.S.)', 'Five chambers (locules) with ovules attached to the central axis: axile placentation.', { off: [0, 0.15, 0] });
      const pollen = K.group(); pollen.visible = false; for (let i = 0; i < 6; i++) { const g = K.group(K.sph(0.05, K.mat(0xffc93c, { roughness: 0.7 }))); for (let j = 0; j < 12; j++) { const a = j * 2.4, b = Math.acos(1 - 2 * (j + 0.5) / 12); const c = K.cone(0.008, 0.03, K.mat(0xf2b01e), [0.055 * Math.sin(b) * Math.cos(a), 0.055 * Math.cos(b), 0.055 * Math.sin(b) * Math.sin(a)]); c.lookAt(c.position.clone().multiplyScalar(3)); c.rotateX(Math.PI / 2); g.add(c); } g.position.set(0.18 + (i % 3) * 0.13, 2.55 + Math.floor(i / 3) * 0.13, 0.15); pollen.add(g); } fl.add(pollen);
      api.part(pollen, 'Pollen grains (magnified)', 'Spiky pollen grains of hibiscus, seen through the hand lens. Each carries male gametes.', { off: [0.15, 0.12, 0], hidden: true });
      let petalsOff = 0; const pts = []; for (let z = -0.3; z <= 0.31; z += 0.06) pts.push([0.0, 1.66, z]);
      let cut = null; let tray = 0;
      const toTray = (o, x, z) => { const p0 = o.position.clone(), r0 = o.rotation.clone(); const wp = new T.Vector3(); o.getWorldPosition(wp); E.scene.attach(o); const s0 = o.position.clone(); A(0.9, (k) => { o.position.set(lerp(s0.x, x, k), lerp(s0.y, 0.12, k) + Math.sin(k * Math.PI) * 0.6, lerp(s0.z, z, k)); o.rotation.x = lerp(r0.x, 0, k); }); };
      api.tools([TOOLS.forceps, TOOLS.scalpel, TOOLS.lens, { id: 'guide', label: 'Guide my hand', icon: '✋', action: () => { if (cut && !cut.done) { api.setTool('scalpel'); cut.auto(); } else api.say('Guide my hand helps with cutting the ovary (step 5).'); } }], (id) => { E.tool = id === 'scalpel' && cut && !cut.done ? cut.tool : null; if (cut) cut.show(!cut.done && api.cur() === 4); });
      return {
        click(obj, hit) {
          const step = api.cur();
          if (step === 2 && api.tool === 'lens' && obj === anth) { pollen.visible = true; pollen.userData.label.show = true; E.flyTo(new T.Vector3(0.2, 2.6, 0.1), 1.6); api.done(2, 'Under the hand lens the anthers are full of round, spiky pollen grains.'); return true; }
          if (api.tool === 'lens' && hit) { E.flyTo(hit.point, 1.8); return true; }
          if (step === 0 && api.tool === 'forceps' && (obj === epi || obj === cal)) { toTray(epi, -2, -1.2); toTray(cal, -2, 1.2); api.done(0, 'Epicalyx: 7 small green bracts. Calyx: 5 green sepals joined at the base.'); return true; }
          if (step === 1 && api.tool === 'forceps' && obj && obj.userData.petal && !obj.userData.off) { obj.userData.off = true; toTray(obj, 1.2 + (tray % 3) * 0.9, -1.4 + Math.floor(tray / 3) * 0.9); tray++; if (++petalsOff === 5) api.done(1, 'Corolla: 5 free, red petals, twisted in the bud.'); else api.say(petalsOff + ' petals removed, ' + (5 - petalsOff) + ' to go.'); return true; }
          if (step === 3 && obj === stig) { api.info('Stigma (5 lobes)', stig.userData.click.info); api.done(3, 'The style passes through the staminal tube and ends in 5 stigmas: the pistil has 5 joined carpels.'); ovL.show = true; cut = cutLine(api, pts, () => { ovary.visible = false; ts.visible = true; E.flyTo(ts.position, 2.2, 0.6, 0.5); api.done(4, 'The cut ovary shows separate chambers with ovules attached at the centre.'); }); api.setTool('scalpel'); return true; }
          return false;
        },
        _ctrl: api.controls(h('div', { class: 'cx-row' }, h('input', { id: 'cx-flower-n', type: 'number', min: '1', max: '10', placeholder: 'Chambers', style: 'width:110px' }), h('button', { class: 'cx-btn', type: 'button', text: 'Check', onclick: () => { const v = +($('#cx-flower-n') || {}).value; if (api.cur() !== 5) { api.say('First finish the steps above, then count the chambers.'); return; } if (v === 5) api.done(5, 'The ovary has 5 chambers (pentacarpellary, syncarpous) with axile placentation.'); else api.say('Not quite. Look at the cut ovary again and count the separate chambers around the centre.'); } }))),
      };
    },
  });

  function arrow(K, color) {
    const m = K.glow(color, 0.8), g = K.group(), shaft = K.cyl(0.035, 0.035, 1, m, [0.5, 0, 0], [0, 0, Math.PI / 2], 10), head = K.cone(0.09, 0.22, m, [1.1, 0, 0], [0, 0, -Math.PI / 2], 14);
    g.add(shaft, head);
    g.setLen = (L) => { const l = Math.max(0.001, L); g.visible = L > 0.02; shaft.scale.set(1, l, 1); shaft.position.x = l / 2; head.position.x = l + 0.1; };
    return g;
  }
  function pathLen(pts) { let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); seg.push(d); L += d; } return { L, seg }; }
  function pathAt(pts, P, s) { s = ((s % P.L) + P.L) % P.L; for (let i = 0; i < P.seg.length; i++) { if (s <= P.seg[i]) { const t = s / P.seg[i], a = pts[i], b = pts[i + 1]; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; } s -= P.seg[i]; } return pts[pts.length - 1]; }

  /* ================= PHYSICS: MAGNETIC OR NOT ================= */
  defineLab({
    id: 'magnets', subject: 'Physics', cls: 'Class 6', icon: '🧲', title: 'Magnetic and non-magnetic materials',
    intro: 'Drag the bar magnet over each object to test it. Then sort every object into the right box, and watch how a compass needle reacts to the magnet.',
    notes: ['Materials attracted by a magnet are magnetic: iron, steel, nickel and cobalt.', 'Plastic, wood, rubber, glass, paper, aluminium and copper are non-magnetic.', 'A magnet has a north pole and a south pole. Like poles repel and unlike poles attract.', 'A freely suspended magnet or compass needle points north–south. Near a magnet, the compass needle turns towards it.'],
    view: { dist: 9, th: 0.25, ph: 0.85, target: [0, 0, 0] },
    steps: [
      { t: 'Test all 10 objects with the magnet', hint: 'Drag the red-blue bar magnet close to each object.' },
      { t: 'Sort all 10 objects into the right box', hint: 'Drag each object into "Magnetic" or "Non-magnetic". Drag stuck objects off the magnet first.' },
      { t: 'Bring the magnet near the compass', hint: 'Drag the magnet close to the round compass and watch the needle.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, metal = (c) => K.mat(c, { metalness: 0.85, roughness: 0.3 });
      E.scene.add(K.box(8.4, 0.3, 5.6, K.mat(0xa77b52, { roughness: 0.7 }), [0, -0.15, 0]));
      const bin = (x, colr, name, info) => { const g = K.group(), m = K.mat(colr, { roughness: 0.6 }); g.add(K.box(1.6, 0.06, 1.1, m, [0, 0.03, 0]), K.box(1.6, 0.35, 0.06, m, [0, 0.18, 0.55]), K.box(1.6, 0.35, 0.06, m, [0, 0.18, -0.55]), K.box(0.06, 0.35, 1.1, m, [0.8, 0.18, 0]), K.box(0.06, 0.35, 1.1, m, [-0.8, 0.18, 0])); g.position.set(x, 0, -1.9); E.scene.add(g); api.part(g, name, info, { off: [0, 0.6, 0], cls: 'big' }); return g; };
      bin(-2.2, 0xd94a4a, 'Magnetic', 'Put objects that the magnet attracts here.'); bin(2.2, 0x4a78d9, 'Non-magnetic', 'Put objects that the magnet does not attract here.');
      const mag = K.group(K.box(0.6, 0.22, 0.3, K.mat(0xd8343e, { roughness: 0.4 }), [0.3, 0, 0]), K.box(0.6, 0.22, 0.3, K.mat(0x2f5fd0, { roughness: 0.4 }), [-0.3, 0, 0]));
      mag.position.set(0, 0.13, -0.5); E.scene.add(mag);
      api.part(mag, 'Bar magnet (N red, S blue)', 'Drag me. The red end is the north pole and the blue end is the south pole.', { off: [0, 0.3, 0] });
      mag.userData.drag = { y: 0.13, bounds: [-3.7, 3.7, -2.5, 2.5] };
      const OBJ = [
        ['Iron nail', true, () => K.group(K.cyl(0.03, 0.02, 0.7, metal(0x8c939c), [0, 0, 0], [0, 0, Math.PI / 2]), K.cyl(0.07, 0.07, 0.03, metal(0x8c939c), [-0.36, 0, 0], [0, 0, Math.PI / 2])), 'Iron is magnetic.'],
        ['Steel paper clip', true, () => K.group(K.torus(0.1, 0.012, metal(0xc8ced6), [0, 0, 0], [Math.PI / 2, 0, 0]), K.torus(0.07, 0.012, metal(0xc8ced6), [0.05, 0, 0], [Math.PI / 2, 0, 0])), 'Steel is mostly iron, so it is magnetic.'],
        ['Iron bolt', true, () => K.group(K.cyl(0.05, 0.05, 0.35, metal(0x6e747c), [0, 0, 0], [0, 0, Math.PI / 2], 12), K.cyl(0.1, 0.1, 0.09, metal(0x6e747c), [-0.2, 0, 0], [0, 0, Math.PI / 2], 6)), 'Iron is magnetic.'],
        ['Sewing needle', true, () => K.cyl(0.012, 0.004, 0.55, metal(0xd5dbe2), [0, 0, 0], [0, 0, Math.PI / 2], 8), 'Steel needles are magnetic.'],
        ['Plastic comb', false, () => { const g = K.group(K.box(0.6, 0.05, 0.08, K.mat(0x2d7ff9), [0, 0, -0.06])); for (let i = 0; i < 12; i++) g.add(K.box(0.02, 0.04, 0.14, K.mat(0x2d7ff9), [-0.27 + i * 0.05, 0, 0.04])); return g; }, 'Plastic is non-magnetic.'],
        ['Wooden pencil', false, () => K.group(K.cyl(0.05, 0.05, 0.75, K.mat(0xf2c12e), [0, 0, 0], [0, 0, Math.PI / 2], 6), K.cone(0.05, 0.12, K.mat(0xe8c9a0), [0.43, 0, 0], [0, 0, -Math.PI / 2], 6)), 'Wood is non-magnetic.'],
        ['Rubber eraser', false, () => K.box(0.3, 0.1, 0.17, K.mat(0xf08bb0, { roughness: 0.9 })), 'Rubber is non-magnetic.'],
        ['Aluminium foil ball', false, () => K.sph(0.14, metal(0xd8dde3), null, null, 8), 'Aluminium is a metal but it is not magnetic.'],
        ['Copper wire', false, () => K.torus(0.13, 0.02, metal(0xc8733a), [0, 0, 0], [Math.PI / 2, 0, 0]), 'Copper is a metal but it is not magnetic.'],
        ['Glass marble', false, () => K.sph(0.1, K.glass(0x7fd4ff, 0.6)), 'Glass is non-magnetic.'],
      ];
      const items = OBJ.map(([name, m, make, why], i) => { const o = make(); const home = [-3.2 + (i % 5) * 1.6, 0.1, 0.9 + Math.floor(i / 5) * 1.1]; o.position.set(...home); E.scene.add(o); const it = { o, name, m, why, home, tested: false, sorted: false, stuck: false, armed: true }; o.userData.item = it; api.part(o, name, why.split('.')[0] + '.', { off: [0, 0.32, 0] }); o.userData.click = { name, info: 'Test me with the magnet, then sort me.' }; return it; });
      const comp = K.group(K.cyl(0.5, 0.5, 0.08, K.mat(0xf3f4f6, { roughness: 0.4 }), [0, 0.04, 0]), K.torus(0.5, 0.03, metal(0x9aa1ab), [0, 0.08, 0], [Math.PI / 2, 0, 0]));
      const needle = K.group(K.cone(0.05, 0.4, K.mat(0xd8343e), [0.2, 0, 0], [0, 0, -Math.PI / 2], 4), K.cone(0.05, 0.4, K.mat(0xeeeeee), [-0.2, 0, 0], [0, 0, Math.PI / 2], 4)); needle.position.y = 0.13; comp.add(needle, K.sph(0.04, metal(0x333333), [0, 0.14, 0]));
      comp.position.set(3.2, 0, -0.3); E.scene.add(comp); api.part(comp, 'Compass', 'A small magnet that can turn freely. Its red north end points north, and turns towards the south pole of a nearby magnet.', { off: [0, 0.4, 0] });
      const binOf = (p) => (Math.abs(p.z + 1.9) < 0.7 ? (Math.abs(p.x + 2.2) < 0.9 ? 'mag' : Math.abs(p.x - 2.2) < 0.9 ? 'non' : null) : null);
      let sortedN = 0, compassDone = false;
      const poles = () => { const a = mag.rotation.y, c = mag.position; return { N: [c.x + 0.55 * Math.cos(a), c.z - 0.55 * Math.sin(a)], S: [c.x - 0.55 * Math.cos(a), c.z + 0.55 * Math.sin(a)] }; };
      const unstick = (it, drop) => { if (!it.stuck) return; it.stuck = false; it.armed = false; E.scene.attach(it.o); it.o.rotation.set(0, it.o.rotation.y, 0); if (drop) it.o.position.y = 0.1; };
      items.forEach((it) => { it.o.userData.drag = { y: 0.1, bounds: [-3.9, 3.9, -2.6, 2.6], start: () => { if (it.stuck) unstick(it); }, drop: () => {
        const b = binOf(it.o.position); if (!b) return;
        if ((b === 'mag') === it.m) { it.sorted = true; delete it.o.userData.drag; it.o.position.y = 0.12; sortedN++; api.obs(it.name + ' → ' + (it.m ? 'magnetic' : 'non-magnetic') + '. ' + it.why); if (sortedN === items.length) api.done(1, 'Magnetic: iron and steel objects. Non-magnetic: plastic, wood, rubber, aluminium, copper and glass. Not every metal is magnetic.'); }
        else { api.say(it.name + ' is in the wrong box. ' + (it.tested ? 'Remember what happened when you tested it.' : 'Test it with the magnet first.')); it.o.position.set(...it.home); }
      } }; });
      const readout = () => api.readout([['Tested', items.filter((i) => i.tested).length + ' / 10'], ['Sorted', sortedN + ' / 10'], ['Stuck to magnet', String(items.filter((i) => i.stuck).length)]]);
      api.controls(api.buttons([['Turn the magnet', () => { mag.rotation.y += Math.PI / 2; }], ['Shake objects off', () => { items.forEach((it) => unstick(it, true)); }]]));
      readout();
      let lastR = 0;
      return {
        update(dt, t) {
          const P = poles();
          items.forEach((it) => {
            if (it.sorted) return; const p = it.o.position, wp = new T.Vector3(); it.o.getWorldPosition(wp);
            const d = Math.min(Math.hypot(wp.x - P.N[0], wp.z - P.N[1]), Math.hypot(wp.x - P.S[0], wp.z - P.S[1]));
            if (!it.armed && d > 1.3 && !it.stuck) it.armed = true;
            if (d < 0.95 && !it.tested) { it.tested = true; api.obs(it.name + ': ' + (it.m ? 'attracted by the magnet.' : 'not attracted.')); if (items.every((x) => x.tested)) api.done(0, 'Only some objects were attracted. Those are made of magnetic materials.'); }
            if (it.m && !it.stuck && it.armed && d < 0.85 && E.dragObj !== it.o) {
              it.stuck = true; const pole = Math.hypot(wp.x - P.N[0], wp.z - P.N[1]) < Math.hypot(wp.x - P.S[0], wp.z - P.S[1]) ? 1 : -1;
              mag.attach(it.o); it.o.position.set(pole * (0.68 + 0.05 * (items.indexOf(it) % 3)), 0.02, -0.12 + 0.08 * (items.indexOf(it) % 4));
            }
          });
          const cp = comp.position, src = (q, s) => { const dx = cp.x - q[0], dz = cp.z - q[1], r = Math.max(0.3, Math.hypot(dx, dz)); return [s * dx / (r * r * r), s * dz / (r * r * r)]; };
          const a = src(P.N, 1), b = src(P.S, -1), Bx = a[0] + b[0], Bz = a[1] + b[1] - 0.12;
          const target = -Math.atan2(Bz, Bx); let cur = needle.rotation.y; let dlt = target - cur; while (dlt > Math.PI) dlt -= TAU; while (dlt < -Math.PI) dlt += TAU; needle.rotation.y = cur + dlt * Math.min(1, dt * 6);
          if (!compassDone && api.isDone(1) && Math.hypot(mag.position.x - cp.x, mag.position.z - cp.z) < 1.5) { compassDone = true; api.done(2, 'The compass needle swung round: its north end turns towards the magnet\'s south pole. Unlike poles attract.'); }
          if (t - lastR > 0.4) { lastR = t; readout(); }
        },
      };
    },
  });

  /* ================= PHYSICS: HOW A BATTERY WORKS ================= */
  defineLab({
    id: 'battery', subject: 'Physics', cls: 'Class 6–10', icon: '🔋', title: 'How a battery lights a bulb',
    intro: 'Look inside a dry cell, then close the switch and watch electrons flow round the circuit. Add cells and break the wire to see what changes.',
    notes: ['A cell changes chemical energy into electrical energy. A battery is two or more cells joined together.', 'In a dry cell the zinc case is the negative terminal and the carbon rod with a brass cap is the positive terminal. The paste in between is the electrolyte.', 'Electrons flow from the negative terminal, through the wire and bulb, to the positive terminal. Conventional current is shown flowing the other way, from + to −.', 'A circuit must be closed (complete) for current to flow. Cells joined in series add their voltages: 1.5 V + 1.5 V = 3 V.', 'Ohm\'s law: current I = V ÷ R. More voltage across the same bulb gives more current and a brighter bulb.'],
    view: { dist: 9, th: 0.2, ph: 0.75, target: [0, 0.2, 0.2] },
    steps: [
      { t: 'Look inside the cell', hint: 'Press "See inside the cell", then click the zinc case, the carbon rod and the paste.' },
      { t: 'Close the switch', hint: 'Click the switch lever to close the circuit.' },
      { t: 'Add a second cell', hint: 'Use the Cells slider and watch the bulb.' },
      { t: 'Break the circuit', hint: 'Click the wire next to the bulb to cut it.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      E.scene.add(K.box(7.6, 0.2, 5, K.mat(0x23303f, { roughness: 0.8 }), [0, -0.1, 0.2]));
      let n = 1, closed = false, broken = false, cut = false, arrows = false;
      const cellsG = K.group(); E.scene.add(cellsG);
      const brass = K.mat(0xd4a64a, { metalness: 0.8, roughness: 0.3 }), jacketM = K.mat(0x1f8a4a, { roughness: 0.4 }), zincM = K.mat(0x9aa3ad, { metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.35, side: 2, depthWrite: false });
      const inner = K.group(); const parts = {};
      function buildCells() {
        while (cellsG.children.length) cellsG.remove(cellsG.children[0]);
        for (let i = 0; i < n; i++) { const x = -1.6 + i * 1.15; const g = K.group(K.cyl(0.28, 0.28, 1, i === 0 && cut ? zincM : jacketM, [0, 0, 0], [0, 0, Math.PI / 2]), K.cyl(0.08, 0.08, 0.12, brass, [0.56, 0, 0], [0, 0, Math.PI / 2])); g.position.set(x, 0.3, -0.9); cellsG.add(g); if (i === 0) g.add(inner); }
      }
      parts.zinc = K.cyl(0.275, 0.275, 0.98, K.mat(0xa9b1ba, { metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.4, side: 2, depthWrite: false }), [0, 0, 0], [0, 0, Math.PI / 2], 32, true);
      parts.paste = K.cyl(0.22, 0.22, 0.9, K.mat(0x8a7350, { roughness: 0.9, transparent: true, opacity: 0.75 }), [0, 0, 0], [0, 0, Math.PI / 2]);
      parts.mix = K.cyl(0.14, 0.14, 0.86, K.mat(0x2b2b2b, { roughness: 0.9, transparent: true, opacity: 0.85 }), [0, 0, 0], [0, 0, Math.PI / 2]);
      parts.rod = K.cyl(0.04, 0.04, 1.06, K.mat(0x101010, { roughness: 0.6 }), [0.03, 0, 0], [0, 0, Math.PI / 2]);
      inner.add(parts.zinc, parts.paste, parts.mix, parts.rod); inner.visible = false;
      buildCells();
      const ins = [api.part(parts.zinc, 'Zinc case (−)', 'The zinc can is the negative terminal. Zinc atoms give up electrons in a chemical reaction, so the zinc is slowly used up.', { off: [-0.3, 0.35, 0], hidden: true }),
        api.part(parts.paste, 'Electrolyte paste', 'Moist paste of ammonium chloride. It lets charged particles (ions) move inside the cell so the reaction can continue.', { off: [-0.1, 0.25, 0.1], hidden: true }),
        api.part(parts.mix, 'Manganese dioxide and carbon', 'Black powder around the rod that takes part in the reaction at the positive side.', { off: [0.15, 0.2, 0], hidden: true }),
        api.part(parts.rod, 'Carbon rod (+)', 'The carbon rod with its brass cap is the positive terminal. Electrons return to the cell here.', { off: [0.45, 0.12, 0], hidden: true })];
      const wireM = K.mat(0xd63b3b, { roughness: 0.5 }), wireB = K.mat(0x222222, { roughness: 0.5 });
      const negEnd = () => [-1.6 - 0.55, 0.3, -0.9], posEnd = () => [-1.6 + (n - 1) * 1.15 + 0.62, 0.3, -0.9];
      const wiresG = K.group(); E.scene.add(wiresG); let cutPiece = null;
      const switchG = K.group(K.box(0.6, 0.08, 0.4, K.mat(0x8b5e34), [0, 0.04, 0])); const lever = K.group(K.box(0.55, 0.04, 0.06, brass, [0.27, 0, 0])); lever.position.set(-0.27, 0.16, 0); switchG.add(lever, K.box(0.06, 0.12, 0.08, brass, [-0.27, 0.12, 0]), K.box(0.06, 0.12, 0.08, brass, [0.27, 0.12, 0])); switchG.position.set(2.7, 0, 0.2); switchG.rotation.y = Math.PI / 2; E.scene.add(switchG);
      api.part(switchG, 'Switch', 'Click to open or close the circuit. Current flows only when the switch is closed.', { off: [0, 0.4, 0] });
      lever.rotation.z = 0.9;
      const bulb = K.group(K.cyl(0.18, 0.2, 0.25, brass, [0, 0.12, 0]), K.sph(0.36, K.glass(0xfff6d5, 0.35), [0, 0.55, 0]));
      const fil = K.torus(0.08, 0.012, K.glow(0xffb347, 0), [0, 0.55, 0], [Math.PI / 2, 0, 0]); bulb.add(fil); bulb.position.set(0, 0, 1.6); E.scene.add(bulb);
      const light = new T.PointLight(0xffd27a, 0, 8); light.position.set(0, 0.6, 1.6); E.scene.add(light);
      api.part(bulb, 'Bulb', 'A thin filament inside gets hot and glows when current flows through it.', { off: [0, 1.05, 0] });
      let pathPts = [], P = null;
      function buildWires() {
        while (wiresG.children.length) wiresG.remove(wiresG.children[0]);
        const ne = negEnd(), pe = posEnd();
        const left = [ne, [-2.9, 0.3, -0.9], [-2.9, 0.3, 1.6], [-0.35, 0.3, 1.6]], right = [[0.35, 0.3, 1.6], [2.7, 0.3, 1.6], [2.7, 0.3, 0.5]], right2 = [[2.7, 0.3, -0.1], [2.7, 0.3, -0.9], pe];
        [[left, wireB], [right, wireM], [right2, wireM]].forEach(([pts, m]) => { for (let i = 1; i < pts.length; i++) { if (pts === left && i === 3) { cutPiece = K.tube([pts[i - 1], pts[i]], 0.035, m, 8); cutPiece.visible = !broken; wiresG.add(cutPiece); api.clickable(cutPiece); cutPiece.userData.click = { name: 'Wire', info: 'Copper wire covered with plastic. Click to cut it.' }; continue; } wiresG.add(K.tube([pts[i - 1], pts[i]], 0.035, m, 8)); } });
        pathPts = [ne, [-2.9, 0.3, -0.9], [-2.9, 0.3, 1.6], [0, 0.55, 1.6], [2.7, 0.3, 1.6], [2.7, 0.3, -0.9], pe]; P = pathLen(pathPts);
      }
      buildWires();
      const NE = 46, eM = K.glow(0x5aa9ff, 1.6), electrons = new T.InstancedMesh(new T.SphereGeometry(0.05, 10, 8), eM, NE); E.scene.add(electrons);
      const conv = K.group(); for (let i = 0; i < 6; i++) { const c = K.cone(0.08, 0.2, K.glow(0xffa53a, 1)); conv.add(c); } E.scene.add(conv); conv.visible = false;
      const dummy = new T.Object3D(); let s0 = 0;
      const state = () => { const V = 1.5 * n, R = 5, on = closed && !broken, I = on ? V / R : 0; return { V, R, I, on, Pw: V * I }; };
      const refresh = () => { const st = state(); fil.material.emissiveIntensity = st.on ? 1.2 + st.I * 6 : 0; light.intensity = st.on ? st.I * 12 : 0; api.readout([['Cells in series', n + ' × 1.5 V'], ['Voltage', st.V.toFixed(1) + ' V'], ['Bulb resistance', st.R + ' Ω'], ['Current I = V ÷ R', st.I.toFixed(2) + ' A'], ['Bulb', st.on ? (st.I > 0.75 ? 'very bright' : st.I > 0.45 ? 'brighter' : 'glowing') : 'off'], ['Circuit', broken ? 'broken wire' : closed ? 'closed' : 'open']]); };
      const insideBtn = h('button', { class: 'cx-btn', type: 'button', text: 'See inside the cell', onclick: () => { cut = !cut; inner.visible = cut; ins.forEach((L) => { L.show = cut; }); insideBtn.textContent = cut ? 'Close the cell' : 'See inside the cell'; buildCells(); } });
      const arrBtn = h('button', { class: 'cx-btn', type: 'button', text: 'Show conventional current', onclick: () => { arrows = !arrows; arrBtn.classList.toggle('on', arrows); } });
      api.controls(api.slider('cells', 'Cells', 1, 3, 1, 1, '', (v) => { n = v; buildCells(); buildWires(); refresh(); if (n >= 2 && state().on && api.cur() === 2) api.done(2, 'Two cells in series give 3 V, so twice the current flows and the bulb is brighter.'); }), h('div', { class: 'cx-row' }, insideBtn, arrBtn));
      const seen = new Set(); refresh();
      return {
        click(obj) {
          if (obj === switchG) { closed = !closed; const a0 = lever.rotation.z, a1 = closed ? 0 : 0.9; A(0.3, (k) => { lever.rotation.z = lerp(a0, a1, k); }); refresh(); if (closed && !broken && api.cur() === 1) api.done(1, 'With the switch closed the circuit is complete: electrons flow from the zinc (−) through the bulb to the carbon rod (+) and the bulb glows.'); return true; }
          if (obj === cutPiece) { broken = !broken; cutPiece.visible = !broken; refresh(); if (broken && api.cur() === 3) api.done(3, 'A break anywhere stops the current in the whole circuit, so the bulb goes out. This is an open circuit.'); return true; }
          if (cut && [parts.zinc, parts.paste, parts.rod].includes(obj)) { seen.add(obj); api.info(obj.userData.click.name, obj.userData.click.info); if (seen.size === 3 && api.cur() === 0) api.done(0, 'A dry cell: zinc case (−), electrolyte paste, and a carbon rod (+) in manganese dioxide.'); return true; }
          return false;
        },
        update(dt) {
          const st = state(); electrons.visible = st.on; if (st.on) { s0 += dt * (0.5 + st.I * 2.2); for (let i = 0; i < NE; i++) { const q = pathAt(pathPts, P, s0 + i * P.L / NE); dummy.position.set(q[0], q[1] + 0.05, q[2]); dummy.updateMatrix(); electrons.setMatrixAt(i, dummy.matrix); } electrons.instanceMatrix.needsUpdate = true; }
          conv.visible = arrows && st.on; if (conv.visible) conv.children.forEach((c, i) => { const s = P.L - ((s0 * 0.6 + i * P.L / 6) % P.L), q = pathAt(pathPts, P, s), q2 = pathAt(pathPts, P, s - 0.05); c.position.set(q[0], q[1] + 0.25, q[2]); c.lookAt(q2[0], q2[1] + 0.25, q2[2]); c.rotateX(Math.PI / 2); });
          parts.zinc.material.emissive && (parts.zinc.material.emissiveIntensity = 0);
        },
      };
    },
  });

  /* ================= PHYSICS: FORCE AND FRICTION ================= */
  defineLab({
    id: 'force', subject: 'Physics', cls: 'Class 8–9', icon: '🧱', title: 'Force, friction and motion',
    intro: 'Pull a wooden block with a spring balance on glass, wood and sandpaper. Find the smallest force that starts it moving, and see how mass changes friction.',
    notes: ['Friction is a force that opposes motion between two surfaces in contact. Rough surfaces give more friction than smooth ones.', 'Static friction stops an object starting to move. Once it moves, kinetic (sliding) friction is a little smaller.', 'Friction depends on the surfaces and on how hard they press together (the normal force, which is about the weight).', 'Newton\'s second law: net force = mass × acceleration, F = m × a.', 'The friction values here are typical classroom values; real ones vary.'],
    view: { dist: 10, th: 0.35, ph: 0.95, target: [0, 0.3, 0] },
    steps: [
      { t: 'Start the 2 kg block moving on glass', hint: 'Choose Glass, keep mass at 2 kg, raise the force slowly and press Pull.' },
      { t: 'Do the same on wood', hint: 'Choose Wood and find the force that starts it.' },
      { t: 'Do the same on sandpaper', hint: 'Choose Sandpaper.' },
      { t: 'Double the mass on wood', hint: 'Choose Wood, set mass to 4 kg and start it moving.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, g = 9.8;
      const LANES = [['Glass', 0.2, 0.15, -1.3, K.mat(0xbfe3ff, { roughness: 0.05, metalness: 0.1 })], ['Wood', 0.45, 0.35, 0, K.mat(0xb07a45, { roughness: 0.6 })], ['Sandpaper', 0.8, 0.65, 1.3, K.mat(0x8a7f70, { roughness: 1, map: K.tex(256, 256, (c, w) => { c.fillStyle = '#8a7f70'; c.fillRect(0, 0, w, w); for (let i = 0; i < 4000; i++) { c.fillStyle = Math.random() > 0.5 ? '#6c6255' : '#a69a88'; c.fillRect(Math.random() * w, Math.random() * w, 2, 2); } }) })]];
      E.scene.add(K.box(12.4, 0.3, 4.6, K.mat(0x3a3f4a), [0, -0.16, 0]));
      LANES.forEach(([name, , , z, m]) => { const s = K.box(12, 0.04, 1.1, m, [0, 0.02, z]); E.scene.add(s); api.part(s, name, name + ' surface. ' + (name === 'Glass' ? 'Smooth: little friction.' : name === 'Wood' ? 'Medium roughness.' : 'Very rough: a lot of friction.'), { off: [-5.2, 0.3, 0] }); });
      for (let x = -5; x <= 5; x++) E.scene.add(K.box(0.02, 0.01, 4.4, K.mat(0x9aa3ad), [x, 0.045, 0]));
      const block = K.group(K.box(0.9, 0.5, 0.7, K.mat(0xc8935a, { roughness: 0.55 }), [0, 0.25, 0]), K.torus(0.07, 0.015, K.mat(0xcccccc, { metalness: 0.8 }), [0.48, 0.25, 0], [0, Math.PI / 2, 0]));
      E.scene.add(block); api.part(block, 'Wooden block', 'The block being pulled. Change its mass with the slider.', { off: [0, 0.75, 0] });
      const spring = K.group(K.cyl(0.07, 0.07, 0.8, K.mat(0xe8e8e8, { metalness: 0.4 }), [0.95, 0.25, 0], [0, 0, Math.PI / 2]), K.cyl(0.075, 0.075, 0.25, K.mat(0xd8343e), [1.25, 0.25, 0], [0, 0, Math.PI / 2])); block.add(spring);
      const fA = arrow(K, 0x3ddc97), fF = arrow(K, 0xff5c7a), fW = arrow(K, 0xffd54a), fN = arrow(K, 0x6ad0ff); E.scene.add(fA, fF, fW, fN);
      fW.rotation.z = -Math.PI / 2; fN.rotation.z = Math.PI / 2; fF.rotation.y = Math.PI;
      const lbl = { A: E.addLabel(fA, 'Pull', [0.6, 0.2, 0]), F: E.addLabel(fF, 'Friction', [-0.5, 0.2, 0]), W: E.addLabel(fW, 'Weight', [0, -0.7, 0]), N: E.addLabel(fN, 'Normal force', [0, 0.9, 0]) };
      let lane = 0, m = 2, F = 0, pulling = false, x = -4.5, v = 0, moved = false; const rec = {};
      const reset = () => { x = -4.5; v = 0; moved = false; pulling = false; pullBtn.textContent = 'Pull'; pullBtn.classList.remove('on'); };
      const laneBtns = LANES.map((L, i) => h('button', { class: 'cx-btn' + (i === lane ? ' on' : ''), type: 'button', text: L[0], onclick: () => { lane = i; laneBtns.forEach((b, j) => b.classList.toggle('on', j === i)); reset(); } }));
      const pullBtn = h('button', { class: 'cx-btn pri', type: 'button', text: 'Pull', onclick: () => { pulling = !pulling; pullBtn.textContent = pulling ? 'Stop pulling' : 'Pull'; pullBtn.classList.toggle('on', pulling); } });
      const tbl = h('div', { class: 'cx-note' });
      const drawTbl = () => { tbl.replaceChildren(h('b', { text: 'Force needed to start moving' }), ...Object.entries(rec).map(([k, f]) => h('div', { text: k + ': ' + f + ' N' }))); };
      api.controls(h('div', { class: 'cx-row' }, laneBtns), api.slider('mass', 'Mass', 1, 5, 1, 2, ' kg', (val) => { m = val; reset(); }), api.slider('force', 'Pulling force', 0, 60, 1, 0, ' N', (val) => { F = val; }), h('div', { class: 'cx-row' }, pullBtn, h('button', { class: 'cx-btn', type: 'button', text: 'Put block back', onclick: reset })), tbl);
      let lastR = 0;
      return {
        update(dt, t) {
          const [name, us, uk, z] = LANES[lane], N = m * g, Fs = us * N, Fk = uk * N, Fa = pulling ? F : 0;
          let fr = 0;
          if (v === 0) { if (Fa > Fs) { v = 1e-3; if (!moved) { moved = true; const key = name + ', ' + m + ' kg'; if (!rec[key]) { rec[key] = Fa; drawTbl(); const need = Math.ceil(Fs);
                if (m === 2 && lane === 0 && api.cur() === 0) api.done(0, 'Glass, 2 kg: about ' + need + ' N was enough. Smooth glass has little friction.');
                if (m === 2 && lane === 1 && api.cur() === 1) api.done(1, 'Wood, 2 kg: about ' + need + ' N. Wood is rougher than glass.');
                if (m === 2 && lane === 2 && api.cur() === 2) api.done(2, 'Sandpaper, 2 kg: about ' + need + ' N. The roughest surface needs the most force.');
                if (m === 4 && lane === 1 && api.cur() === 3) api.done(3, 'Wood, 4 kg: about ' + need + ' N, roughly double. Heavier objects press harder, so friction is larger.'); } } } else fr = Fa; }
          if (v > 0) { fr = Fk; const a = (Fa - Fk) / m; v = Math.max(0, v + a * dt); x += v * dt; if (x > 4.8) { x = 4.8; v = 0; pulling = false; pullBtn.textContent = 'Pull'; pullBtn.classList.remove('on'); } }
          block.position.set(x, 0.04, z);
          const s = 0.035; fA.setLen(Fa * s); fA.position.set(x + 1.4, 0.3, z); fF.setLen(fr * s); fF.position.set(x - 0.45, 0.1, z); fW.setLen(N * s * 0.5); fW.position.set(x, 0.0, z + 0.45); fN.setLen(N * s * 0.5); fN.position.set(x, 0.55, z + 0.45);
          lbl.A.el.textContent = 'Pull ' + Fa + ' N'; lbl.F.el.textContent = 'Friction ' + fr.toFixed(1) + ' N'; lbl.W.el.textContent = 'Weight ' + N.toFixed(1) + ' N'; lbl.N.el.textContent = 'Normal ' + N.toFixed(1) + ' N';
          if (t - lastR > 0.2) { lastR = t; api.readout([['Surface', name], ['Mass', m + ' kg'], ['Pull', Fa + ' N'], ['Friction', fr.toFixed(1) + ' N'], ['Net force', (v > 0 ? (Fa - Fk) : 0).toFixed(1) + ' N'], ['Acceleration', (v > 0 ? ((Fa - Fk) / m) : 0).toFixed(2) + ' m/s²'], ['Speed', v.toFixed(2) + ' m/s'], ['Distance', (x + 4.5).toFixed(2) + ' m']]); }
        },
      };
    },
  });

  /* ================= CHEMISTRY: REACTIONS BENCH ================= */
  let audioCtx = null;
  function popSound() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const c = audioCtx, len = c.sampleRate * 0.25, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); const s = c.createBufferSource(), g = c.createGain(); g.gain.value = 0.6; s.buffer = b; s.connect(g).connect(c.destination); s.start(); } catch (e) {} }
  defineLab({
    id: 'chemistry', subject: 'Chemistry', cls: 'Class 7–10', icon: '⚗️', title: 'Chemical reactions bench',
    intro: 'Choose an experiment, then add the chemicals step by step and watch what happens: colour changes, gas bubbles, a precipitate, or a pop.',
    safety: 'Real labs: wear goggles and a lab coat, never taste or smell chemicals directly, add acid slowly, and only work with a teacher present.',
    notes: ['Neutralisation: an acid and a base react to form a salt and water, giving out heat. Phenolphthalein is pink in a base and colourless in an acid or neutral solution.', 'Metals such as zinc react with dilute hydrochloric acid to give hydrogen gas, which burns with a pop sound.', 'Displacement: a more reactive metal (iron) pushes a less reactive metal (copper) out of its salt solution. The blue copper sulphate turns pale green and the nail gets a reddish-brown coat of copper.', 'Baking soda and vinegar react to give carbon dioxide gas. Carbon dioxide turns lime water milky.', 'Precipitation: copper sulphate and sodium hydroxide form an insoluble pale blue solid, copper hydroxide.'],
    view: { dist: 7.5, th: 0.15, ph: 1.15, target: [0, 1.3, 0.3] },
    steps: [
      { t: 'Neutralise a base with an acid', hint: 'Choose "Acid + base" and follow the buttons.' },
      { t: 'Make hydrogen gas', hint: 'Choose "Zinc + acid".' },
      { t: 'Displace copper with iron', hint: 'Choose "Iron + copper sulphate".' },
      { t: 'Make carbon dioxide', hint: 'Choose "Baking soda + vinegar".' },
      { t: 'Make a precipitate', hint: 'Choose "Make a precipitate".' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      E.scene.add(K.box(8, 0.3, 3.6, K.mat(0x2a2f38, { roughness: 0.5 }), [0, -0.15, 0]), K.box(8, 0.1, 1, K.mat(0x4a3424), [0, 2.4, -1.3]), K.box(8, 2.6, 0.1, K.mat(0x1c212a), [0, 1.2, -1.8]));
      const glassM = K.glass(0xdfefff, 0.22);
      const bottle = (name, color, x, info, solid) => {
        const g = K.group(K.cyl(0.22, 0.22, 0.7, glassM, [0, 0.35, 0], null, 24, false), solid ? K.group(...Array.from({ length: 12 }, (_, i) => K.sph(0.05, K.mat(color, { roughness: 0.7, metalness: solid === 'metal' ? 0.6 : 0 }), [Math.cos(i) * 0.1, 0.08 + (i % 3) * 0.06, Math.sin(i * 1.7) * 0.1]))) : K.cyl(0.19, 0.19, 0.48, K.mat(color, { transparent: true, opacity: color === 0xeef6ff ? 0.35 : 0.85, roughness: 0.2 }), [0, 0.26, 0]), K.cyl(0.1, 0.12, 0.16, K.mat(0x222222), [0, 0.78, 0]));
        g.position.set(x, 2.45, -1.3); g.userData.col = color; g.userData.home = g.position.clone(); E.scene.add(g); api.part(g, name, info, { off: [0, 1.05, 0] }); return g;
      };
      const B = {
        hcl: bottle('Dilute HCl (acid)', 0xeef6ff, -3.4, 'Dilute hydrochloric acid. Colourless. An acid.'),
        naoh: bottle('NaOH solution (base)', 0xeef6ff, -2.5, 'Sodium hydroxide solution. Colourless. A base (alkali).'),
        phth: bottle('Phenolphthalein', 0xeef6ff, -1.6, 'An indicator: pink in a base, colourless in an acid or neutral solution.'),
        cuso4: bottle('Copper sulphate solution', 0x2f7fe0, -0.7, 'Blue solution of copper sulphate.'),
        vin: bottle('Vinegar', 0xf3e9c4, 0.2, 'Vinegar contains acetic acid (ethanoic acid).'),
        zn: bottle('Zinc granules', 0x8f979f, 1.1, 'Small pieces of zinc metal.', 'metal'),
        soda: bottle('Baking soda', 0xfafafa, 2.0, 'Sodium hydrogen carbonate (sodium bicarbonate), a white powder.', 'powder'),
        nail: bottle('Iron nails', 0x6e747c, 2.9, 'Clean iron nails.', 'metal'),
      };
      const stand = K.group(K.box(0.9, 0.08, 0.7, K.mat(0x30363f), [0, 0.04, 0]), K.cyl(0.03, 0.03, 2.4, K.mat(0x9aa3ad, { metalness: 0.7 }), [-0.35, 1.2, 0]), K.box(0.45, 0.06, 0.08, K.mat(0x9aa3ad, { metalness: 0.7 }), [-0.12, 1.9, 0]));
      stand.position.set(0, 0, 0.6); E.scene.add(stand);
      const TUBE = { x: 0, y0: 0.55, z: 0.6, r: 0.27, h: 2.0 };
      const tube = K.group(K.cyl(0.3, 0.3, TUBE.h, K.glass(0xe8f4ff, 0.18), [0, TUBE.y0 + TUBE.h / 2, 0], null, 32, true), K.sph(0.3, K.glass(0xe8f4ff, 0.18), [0, TUBE.y0, 0]));
      tube.position.set(TUBE.x, 0, TUBE.z); E.scene.add(tube); api.part(tube, 'Test tube', 'Where the chemicals are mixed. Watch for colour change, bubbles, heat or a solid forming.', { off: [0.55, 2.4, 0] });
      const liqM = K.mat(0xeef6ff, { transparent: true, opacity: 0.3, roughness: 0.15 }), liq = K.cyl(TUBE.r, TUBE.r, 1, liqM, [0, 0, 0]); liq.scale.y = 0.001; tube.add(liq);
      let level = 0; const setLevel = (L) => { level = L; liq.scale.y = Math.max(0.001, L); liq.position.y = TUBE.y0 + L / 2; liq.visible = L > 0.01; };
      const setColor = (c, op) => { liqM.color.set(c); liqM.opacity = op; };
      const stream = K.cyl(0.03, 0.03, 1, K.mat(0xdfefff, { transparent: true, opacity: 0.7 })); stream.visible = false; E.scene.add(stream);
      const NB = 60, bub = new T.InstancedMesh(new T.SphereGeometry(0.03, 8, 6), K.glass(0xffffff, 0.6), NB); bub.visible = false; tube.add(bub); const bd = Array.from({ length: NB }, () => [Math.random() * TUBE.r * 0.8, Math.random() * TAU, Math.random()]);
      const NP = 70, prec = new T.InstancedMesh(new T.SphereGeometry(0.025, 6, 5), K.mat(0x7fc8ff, { roughness: 0.9 }), NP); prec.visible = false; tube.add(prec); const pd = Array.from({ length: NP }, () => [Math.random() * TUBE.r * 0.85, Math.random() * TAU, Math.random()]);
      const solids = K.group(); tube.add(solids);
      const lime = K.group(K.cyl(0.22, 0.22, 1.4, K.glass(0xe8f4ff, 0.18), [0, 1.0, 0], null, 24, true), K.sph(0.22, K.glass(0xe8f4ff, 0.18), [0, 0.3, 0])); const limeLiq = K.cyl(0.2, 0.2, 0.7, K.mat(0xeef6ff, { transparent: true, opacity: 0.3 }), [0, 0.65, 0]); lime.add(limeLiq);
      const deliv = K.tube([[0, 2.55, 0.6], [0.3, 3.0, 0.6], [1.3, 3.0, 0.6], [1.6, 2.4, 0.6], [1.6, 0.6, 0.6]], 0.03, K.glass(0xffffff, 0.5)); lime.position.set(1.6, 0, 0.6);
      E.scene.add(lime, deliv); lime.visible = deliv.visible = false; api.part(lime, 'Lime water', 'Calcium hydroxide solution. It turns milky when carbon dioxide passes through it.', { off: [0, 1.9, 0], hidden: true });
      const splint = K.group(K.cyl(0.02, 0.02, 1.2, K.mat(0xc8935a), [0, 0, 0], [0, 0, 1.2]), K.cone(0.06, 0.2, K.glow(0xff8a1f, 2.2), [0.57, 0.3, 0], [0, 0, -0.4])); splint.position.set(2.5, 3.0, 0.6); splint.visible = false; E.scene.add(splint);
      const flash = K.sph(0.35, K.glow(0xfff2a0, 3)); flash.visible = false; E.scene.add(flash);
      const tempLbl = E.addLabel(tube, '', [-0.6, 2.2, 0]); tempLbl.show = false;
      let exp = null, stepI = 0, busy = false, temp = 25, acid = 0, fizz = 0, precK = 0;
      const pour = (b, add, color, op, done) => {
        busy = true; const home = b.userData.home.clone(), top = new T.Vector3(TUBE.x - 0.55, TUBE.y0 + TUBE.h + 0.75, TUBE.z);
        A(0.5, (k) => { b.position.lerpVectors(home, top, k); }, () => {
          A(0.35, (k) => { b.rotation.z = -2.0 * k; }, () => {
            stream.visible = true; stream.material.color.set(b.userData.col === 0xeef6ff ? 0xcfe3ff : b.userData.col); const l0 = level;
            A(0.7, (k) => { setLevel(l0 + add * k); const y1 = TUBE.y0 + level, y2 = top.y + 0.25; stream.scale.y = y2 - y1; stream.position.set(TUBE.x + 0.02, (y1 + y2) / 2, TUBE.z); if (color !== 'solid' && k > 0.2) setColor(color, op); }, () => {
              stream.visible = false; A(0.35, (k) => { b.rotation.z = -2.0 * (1 - k); }, () => A(0.5, (k) => { b.position.lerpVectors(top, home, k); }, () => { busy = false; done && done(); }));
            });
          });
        });
      };
      const dropSolid = (kind, done) => { busy = true; const g = K.group(); if (kind === 'zn') for (let i = 0; i < 6; i++) g.add(K.sph(0.06, K.mat(0x8f979f, { metalness: 0.6, roughness: 0.4 }), [Math.cos(i) * 0.12, 0, Math.sin(i * 1.3) * 0.12])); if (kind === 'nail') g.add(K.cyl(0.03, 0.02, 1.0, K.mat(0x7a8088, { metalness: 0.7, roughness: 0.35 }), [0, 0.5, 0], [0.12, 0, 0.08])); if (kind === 'soda') for (let i = 0; i < 20; i++) g.add(K.sph(0.03, K.mat(0xffffff, { roughness: 1 }), [Math.cos(i) * 0.15, 0, Math.sin(i * 2.1) * 0.15])); solids.add(g); A(0.8, (k) => { g.position.y = lerp(TUBE.h + 0.6, TUBE.y0 + 0.05, k); }, () => { busy = false; done && done(g); }); return g; };
      const EXP = {
        neut: { name: 'Acid + base', step: 0, eq: 'NaOH + HCl → NaCl + H₂O', acts: [
          ['Add 5 mL sodium hydroxide', (n) => pour(B.naoh, 0.5, 0xeef6ff, 0.3, n)],
          ['Add 2 drops of phenolphthalein', (n) => pour(B.phth, 0.03, 0xff3fa0, 0.75, () => { api.say('Pink! Phenolphthalein turns pink because the solution is basic.'); n(); })],
          ['Add 1 mL dilute HCl (repeat)', (n) => pour(B.hcl, 0.1, 0xff3fa0, 0.75, () => { acid++; temp += 0.7; tempLbl.el.textContent = temp.toFixed(1) + ' °C'; tempLbl.show = true; const k = Math.max(0, 1 - acid / 5); setColor(k > 0 ? 0xff3fa0 : 0xeef6ff, k > 0 ? 0.25 + 0.5 * k : 0.3); if (acid >= 5) { api.say('The pink colour disappeared: the base has been neutralised. The tube also got a little warmer.'); n(); } else api.say(acid + ' mL added. The pink is getting lighter.'); }), true],
        ] },
        zinc: { name: 'Zinc + acid', step: 1, eq: 'Zn + 2HCl → ZnCl₂ + H₂↑', acts: [
          ['Add dilute hydrochloric acid', (n) => pour(B.hcl, 0.6, 0xeef6ff, 0.3, n)],
          ['Drop in zinc granules', (n) => dropSolid('zn', () => { fizz = 0.6; api.say('Bubbles! A gas is being given off as the zinc reacts.'); n(); })],
          ['Bring a burning splint to the mouth', (n) => { busy = true; splint.visible = true; A(1, (k) => { splint.position.set(lerp(2.5, 0.45, k), lerp(3.0, TUBE.y0 + TUBE.h + 0.25, k), TUBE.z); }, () => { flash.position.set(0, TUBE.y0 + TUBE.h + 0.2, TUBE.z); flash.visible = true; popSound(); A(0.35, (k) => { flash.scale.setScalar(1 + k * 1.5); flash.material.opacity = 1 - k; }, () => { flash.visible = false; flash.scale.setScalar(1); A(0.6, (k) => { splint.position.x = lerp(0.45, 2.5, k); }, () => { splint.visible = false; busy = false; api.say('POP! Hydrogen gas burns with a pop sound.'); n(); }); }); }); }],
        ] },
        iron: { name: 'Iron + copper sulphate', step: 2, eq: 'Fe + CuSO₄ → FeSO₄ + Cu', acts: [
          ['Add copper sulphate solution', (n) => pour(B.cuso4, 0.7, 0x2f7fe0, 0.75, n)],
          ['Put an iron nail in', (n) => dropSolid('nail', (g) => { EXP.iron.nail = g; n(); })],
          ['Wait 20 minutes (fast-forward)', (n) => { busy = true; const c0 = new T.Color(0x2f7fe0), c1 = new T.Color(0xa8d49a), nm = EXP.iron.nail.children[0].material, n0 = new T.Color(0x7a8088), n1 = new T.Color(0x9a4a2a); A(3.5, (k) => { liqM.color.copy(c0).lerp(c1, k); liqM.opacity = 0.75 - 0.3 * k; nm.color.copy(n0).lerp(n1, k); nm.metalness = 0.7 - 0.5 * k; }, () => { busy = false; api.say('The blue faded to pale green and the nail is coated with reddish-brown copper.'); n(); }); }],
        ] },
        soda: { name: 'Baking soda + vinegar', step: 3, eq: 'NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂↑  ·  Ca(OH)₂ + CO₂ → CaCO₃ + H₂O', acts: [
          ['Add vinegar', (n) => pour(B.vin, 0.6, 0xf3e9c4, 0.55, n)],
          ['Add a spoon of baking soda', (n) => dropSolid('soda', () => { fizz = 1.5; A(1.2, (k) => setLevel(0.6 + 0.5 * Math.sin(k * Math.PI))); api.say('Lots of fizzing: carbon dioxide gas is forming.'); n(); })],
          ['Pass the gas into lime water', (n) => { lime.visible = deliv.visible = true; lime.userData.label.show = true; busy = true; const c0 = new T.Color(0xeef6ff); A(3, (k) => { limeLiq.material.color.copy(c0).lerp(new T.Color(0xffffff), k); limeLiq.material.opacity = 0.3 + 0.6 * k; }, () => { busy = false; api.say('The lime water turned milky: this proves the gas is carbon dioxide.'); n(); }); }],
        ] },
        precip: { name: 'Make a precipitate', step: 4, eq: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄', acts: [
          ['Add copper sulphate solution', (n) => pour(B.cuso4, 0.6, 0x2f7fe0, 0.75, n)],
          ['Add sodium hydroxide solution', (n) => pour(B.naoh, 0.4, 0x2f7fe0, 0.6, () => { prec.visible = true; precK = 0.01; A(3, (k) => { precK = k; setColor(new T.Color(0x2f7fe0).lerp(new T.Color(0xcfe6ff), k).getHex(), 0.6 - 0.3 * k); }, () => { api.say('A pale blue solid formed and settled: a precipitate of copper hydroxide.'); n(); }); })],
        ] },
      };
      const box = h('div', { class: 'cx-lab-acts' });
      const resetTube = () => { setLevel(0); setColor(0xeef6ff, 0.3); while (solids.children.length) solids.remove(solids.children[0]); fizz = 0; precK = 0; prec.visible = false; lime.visible = deliv.visible = false; limeLiq.material.color.set(0xeef6ff); limeLiq.material.opacity = 0.3; temp = 25; acid = 0; tempLbl.show = false; };
      const drawActs = () => {
        box.replaceChildren(h('div', { class: 'cx-row' }, Object.entries(EXP).map(([k, x]) => h('button', { class: 'cx-btn' + (exp === k ? ' on' : '') + (api.isDone(x.step) ? ' done' : ''), type: 'button', text: (api.isDone(x.step) ? '✓ ' : '') + x.name, onclick: () => { if (busy) return; exp = k; stepI = 0; resetTube(); drawActs(); } }))));
        if (!exp) { box.append(h('p', { class: 'cx-note', text: 'Choose an experiment.' })); return; }
        const X = EXP[exp];
        X.acts.forEach(([t, fn, rep], i) => box.append(h('button', { class: 'cx-btn' + (i === stepI ? ' pri' : ''), type: 'button', disabled: i !== stepI || busy, text: (i + 1) + '. ' + t, onclick: () => { if (busy) return; fn(() => { stepI = i + 1; if (stepI >= X.acts.length) api.done(X.step, X.name + ': ' + X.eq); drawActs(); }); drawActs(); } })));
        if (stepI >= X.acts.length) box.append(h('p', { class: 'cx-eq', text: X.eq }));
      };
      api.controls(box); drawActs();
      const d = new T.Object3D();
      let wasBusy = false;
      return {
        update(dt, t) {
          if (wasBusy && !busy) drawActs(); wasBusy = busy;
          bub.visible = fizz > 0 && level > 0.05; if (bub.visible) { bd.forEach((b, i) => { b[2] = (b[2] + dt * (0.3 + fizz * 0.8)) % 1; d.position.set(b[0] * Math.cos(b[1] + t), TUBE.y0 + b[2] * level, b[0] * Math.sin(b[1] + t)); d.scale.setScalar(0.7 + fizz * 0.4); d.updateMatrix(); bub.setMatrixAt(i, d.matrix); }); bub.instanceMatrix.needsUpdate = true; if (fizz > 0.6 && exp === 'soda') fizz = Math.max(0.6, fizz - dt * 0.15); }
          if (prec.visible) { pd.forEach((p, i) => { const fall = Math.min(1, precK * 1.4 + p[2] * 0.3), y = lerp(TUBE.y0 + level * (0.3 + 0.7 * p[2]), TUBE.y0 - 0.12 + p[2] * 0.12, fall); d.position.set(p[0] * Math.cos(p[1]), y, p[0] * Math.sin(p[1])); d.scale.setScalar(1); d.updateMatrix(); prec.setMatrixAt(i, d.matrix); }); prec.instanceMatrix.needsUpdate = true; }
        },
      };
    },
  });

  /* ================= MATHS: SOLIDS AND THEIR NETS ================= */
  defineLab({
    id: 'solids', subject: 'Maths', cls: 'Class 7–10', icon: '🧊', title: 'Solids, nets, area and volume',
    intro: 'Choose a solid, change its size, and unfold it into its net. Count faces, edges and vertices and see how surface area and volume are worked out.',
    notes: ['A net is a flat shape that folds up to make a solid.', 'Cube: 6 faces, 12 edges, 8 vertices. Surface area 6a², volume a³.', 'Cuboid: surface area 2(lb + bh + hl), volume l × b × h.', 'Square pyramid: 5 faces, 8 edges, 5 vertices. Volume ⅓ × base area × height.', 'Cylinder: curved surface area 2πrh, total surface area 2πr(r + h), volume πr²h. Its curved surface unrolls into a rectangle 2πr long and h high.', 'Euler\'s formula for polyhedra: F + V − E = 2.'],
    view: { dist: 9, th: 0.6, ph: 0.9, target: [0, 0.8, 0] },
    steps: [
      { t: 'Unfold the cube completely', hint: 'Choose Cube and drag the Unfold slider to the end.' },
      { t: 'Unfold the square pyramid', hint: 'Choose Pyramid and unfold it.' },
      { t: 'Unroll the cylinder', hint: 'Choose Cylinder and unfold it. See the curved surface become a rectangle.' },
      { t: 'Find the volume of a 4 × 3 × 2 cuboid', hint: 'Type your answer in cubic units and press Check.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T;
      E.scene.add(K.box(10, 0.1, 10, K.mat(0x1b2333, { roughness: 0.9 }), [0, -0.06, 0]));
      for (let i = -5; i <= 5; i++) { E.scene.add(K.box(10, 0.005, 0.01, K.mat(0x2b3a55), [0, 0.001, i]), K.box(0.01, 0.005, 10, K.mat(0x2b3a55), [i, 0.001, 0])); }
      const COLS = [0x5ee6c8, 0x7c8cff, 0xffd54a, 0xff6f91, 0xb27cff, 0x6ad0ff];
      const fm = (i) => K.mat(COLS[i % 6], { side: 2, roughness: 0.5, transparent: true, opacity: 0.88 });
      let shape = 'cube', u = 0, dims = { a: 2, b: 2, c: 2, r: 1, h: 2 }; let root = null, upd = null;
      const tri = (a, s, m) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array([-a / 2, 0, 0, a / 2, 0, 0, 0, s, 0]), 3)); g.computeVertexNormals(); return new T.Mesh(g, m); };
      function build() {
        if (root) E.scene.remove(root); root = K.group(); E.scene.add(root);
        if (shape === 'cube' || shape === 'cuboid') {
          const a = shape === 'cube' ? dims.a : dims.a, b = shape === 'cube' ? dims.a : dims.b, c = shape === 'cube' ? dims.a : dims.c;
          root.add(K.plane(a, b, fm(0), [0, 0.01, 0], [-Math.PI / 2, 0, 0]));
          const side = (px, pz, w, axis, sign, i) => { const p = K.group(); p.position.set(px, 0.01, pz); const f = K.plane(w, c, fm(i), [0, c / 2, 0], [0, axis === 'x' ? Math.PI / 2 : 0, 0]); p.add(f); root.add(p); return p; };
          const F = side(0, b / 2, a, 'z', 1, 1), Bk = side(0, -b / 2, a, 'z', -1, 2), R = side(a / 2, 0, b, 'x', 1, 3), L = side(-a / 2, 0, b, 'x', -1, 4);
          const topP = K.group(); topP.position.set(0, c, 0); topP.add(K.plane(a, b, fm(5), [0, 0, b / 2], [-Math.PI / 2, 0, 0])); Bk.add(topP);
          upd = (k) => { F.rotation.x = k * Math.PI / 2; Bk.rotation.x = -k * Math.PI / 2; R.rotation.z = -k * Math.PI / 2; L.rotation.z = k * Math.PI / 2; topP.rotation.x = -k * Math.PI / 2; };
          const SA = 2 * (a * b + b * c + c * a), V = a * b * c;
          api.readout([['Faces · Edges · Vertices', '6 · 12 · 8'], ['F + V − E', '6 + 8 − 12 = 2'], ['Surface area', shape === 'cube' ? '6a² = ' + SA : '2(lb+bh+hl) = ' + SA], ['Volume', shape === 'cube' ? 'a³ = ' + V : 'l×b×h = ' + V], ['Units', 'square / cubic units']]);
        }
        if (shape === 'pyramid') {
          const a = dims.a, hh = dims.h, s = Math.sqrt(hh * hh + (a / 2) * (a / 2)), alpha = Math.atan2(a / 2, hh);
          root.add(K.plane(a, a, fm(0), [0, 0.01, 0], [-Math.PI / 2, 0, 0]));
          const ps = []; for (let i = 0; i < 4; i++) { const sr = K.group(); sr.rotation.y = i * Math.PI / 2; const p = K.group(); p.position.set(0, 0.01, a / 2); p.add(tri(a, s, fm(i + 1))); sr.add(p); root.add(sr); ps.push(p); }
          upd = (k) => { ps.forEach((p) => { p.rotation.x = lerp(-alpha, Math.PI / 2, k); }); };
          const SA = a * a + 2 * a * s, V = a * a * hh / 3;
          api.readout([['Faces · Edges · Vertices', '5 · 8 · 5'], ['F + V − E', '5 + 5 − 8 = 2'], ['Slant height', s.toFixed(2)], ['Surface area', 'a² + 2a·l = ' + SA.toFixed(2)], ['Volume', '⅓ a² h = ' + V.toFixed(2)]]);
        }
        if (shape === 'cylinder') {
          const r = dims.r, hh = dims.h, N = 36, w = TAU * r / N, strips = [];
          for (let i = 0; i < N; i++) { const m = K.plane(w * 1.02, hh, fm(1)); root.add(m); strips.push(m); }
          const top = K.cyl(r, r, 0.02, fm(2)), bot = K.cyl(r, r, 0.02, fm(3)); root.add(top, bot);
          upd = (k) => { strips.forEach((m, i) => { const ang = (i + 0.5) / N * TAU - Math.PI, cx = r * Math.sin(ang), cz = r * Math.cos(ang), fx = (i + 0.5 - N / 2) * w, fz = r; m.position.set(lerp(cx, fx, k), hh / 2, lerp(cz, fz, k)); m.rotation.y = lerp(ang, 0, k); });
            top.position.set(0, lerp(hh, hh + r, k), lerp(0, r + 0.001, k)); top.rotation.x = k * Math.PI / 2; bot.position.set(0, lerp(0.01, -r + 0.01, k) + (k > 0 ? 0 : 0), lerp(0, r + 0.001, k)); bot.rotation.x = k * Math.PI / 2; root.position.y = k * 2 * r; };
          const pi = 22 / 7;
          api.readout([['Curved surface', '2πrh = ' + (2 * pi * r * hh).toFixed(2)], ['Total surface', '2πr(r + h) = ' + (2 * pi * r * (r + hh)).toFixed(2)], ['Volume', 'πr²h = ' + (pi * r * r * hh).toFixed(2)], ['Rectangle size', (2 * pi * r).toFixed(2) + ' × ' + hh], ['π used', '22/7']]);
        }
        upd(u);
      }
      const shapeBtns = [['cube', 'Cube'], ['cuboid', 'Cuboid'], ['pyramid', 'Pyramid'], ['cylinder', 'Cylinder']].map(([k, l]) => h('button', { class: 'cx-btn' + (shape === k ? ' on' : ''), type: 'button', text: l, onclick: () => { shape = k; shapeBtns.forEach((b) => b.classList.toggle('on', b.textContent === l)); u = 0; $('#cx-ls-unfold').value = 0; $('#cx-ls-unfold').dispatchEvent(new Event('input')); build(); } }));
      const ans = h('input', { id: 'cx-vol-ans', type: 'number', placeholder: 'Volume', style: 'width:110px' });
      api.controls(h('div', { class: 'cx-row' }, shapeBtns),
        api.slider('unfold', 'Unfold', 0, 1, 0.01, 0, '', (v) => { u = v; upd && upd(v); if (v >= 0.99) { if (shape === 'cube') api.done(0, 'The cube\'s net is 6 squares: F = 6, E = 12, V = 8, and 6 + 8 − 12 = 2.'); if (shape === 'pyramid') api.done(1, 'The pyramid\'s net is a square with 4 triangles: F = 5, E = 8, V = 5.'); if (shape === 'cylinder') api.done(2, 'The curved surface unrolls into a rectangle of length 2πr and height h, plus two circles.'); } }),
        api.slider('a', 'Side / length', 1, 4, 0.5, 2, '', (v) => { dims.a = v; build(); }), api.slider('b', 'Breadth', 1, 4, 0.5, 2, '', (v) => { dims.b = v; build(); }), api.slider('c', 'Height (cuboid)', 1, 4, 0.5, 2, '', (v) => { dims.c = v; build(); }),
        api.slider('r', 'Radius (cylinder)', 0.5, 2, 0.25, 1, '', (v) => { dims.r = v; build(); }), api.slider('h', 'Height (pyramid, cylinder)', 1, 4, 0.5, 2, '', (v) => { dims.h = v; build(); }),
        h('div', { class: 'cx-row' }, ans, h('button', { class: 'cx-btn', type: 'button', text: 'Check', onclick: () => { if (+ans.value === 24) api.done(3, 'Volume of a 4 × 3 × 2 cuboid = 4 × 3 × 2 = 24 cubic units.'); else api.say('Not yet. Volume of a cuboid = length × breadth × height. Try multiplying 4, 3 and 2.'); } })));
      build();
      return {};
    },
  });

  /* ================= SOCIAL SCIENCE: GLOBE, LATITUDE, TIME AND SEASONS ================= */
  const LAND = {
    'North America': [[-168, 66], [-156, 71], [-125, 70], [-95, 72], [-80, 68], [-62, 60], [-56, 52], [-66, 45], [-76, 38], [-81, 31], [-80, 25], [-84, 30], [-97, 27], [-97, 21], [-87, 21], [-83, 10], [-78, 8], [-86, 13], [-92, 15], [-105, 20], [-112, 30], [-117, 33], [-124, 42], [-125, 49], [-135, 58], [-152, 58], [-165, 60]],
    Greenland: [[-55, 60], [-43, 60], [-22, 70], [-18, 80], [-35, 83], [-60, 82], [-70, 77], [-58, 70]],
    'South America': [[-80, 9], [-72, 12], [-62, 11], [-50, 3], [-35, -6], [-39, -14], [-41, -22], [-48, -26], [-58, -35], [-65, -41], [-66, -48], [-69, -55], [-74, -51], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 1]],
    Europe: [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [5, 58], [5, 62], [14, 67], [22, 70], [30, 70], [40, 67], [40, 46], [28, 41], [24, 38], [20, 40], [16, 38], [12, 44], [8, 44], [3, 43], [-1, 37]],
    Africa: [[-17, 21], [-16, 28], [-10, 32], [-6, 36], [10, 37], [11, 33], [20, 31], [32, 31], [35, 28], [43, 12], [51, 12], [42, -1], [40, -11], [35, -24], [32, -29], [20, -35], [18, -30], [12, -17], [13, -6], [9, 4], [-4, 5], [-13, 8], [-17, 14]],
    Asia: [[40, 67], [60, 70], [80, 73], [100, 77], [130, 72], [160, 70], [180, 66], [180, 62], [163, 60], [156, 51], [141, 53], [135, 44], [129, 35], [122, 40], [121, 31], [117, 24], [109, 21], [106, 10], [100, 13], [103, 1], [98, 8], [97, 17], [92, 22], [87, 21], [80, 15], [77, 8], [73, 20], [67, 25], [57, 25], [56, 27], [50, 30], [48, 29], [55, 22], [52, 16], [43, 13], [35, 28], [35, 33], [36, 36], [28, 41], [40, 46]],
    Australia: [[114, -22], [122, -17], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [151, -34], [146, -39], [140, -38], [135, -34], [128, -32], [116, -35], [114, -27]],
    Antarctica: [[-180, -72], [-120, -73], [-60, -64], [-30, -77], [0, -70], [60, -67], [120, -66], [180, -72], [180, -90], [-180, -90]],
    'Sri Lanka': [[80, 6], [82, 7.5], [80.5, 9.8], [79.7, 8]], Japan: [[130, 31], [135, 34], [141, 38], [142, 45], [139, 40], [133, 35]], 'Great Britain': [[-5, 50], [1, 51], [0, 54], [-3, 58], [-6, 57], [-4, 53]], Madagascar: [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  };
  const INDIA = [[68.5, 23.5], [70, 21], [72.8, 19], [73.5, 16], [74.8, 12.8], [76.3, 9.5], [77.5, 8.1], [78.2, 9], [80.2, 13], [80.3, 15.8], [82.3, 17], [85, 19.3], [87, 21.5], [89, 21.8], [89.5, 26], [92, 25], [94.5, 27], [97, 28], [95, 29.5], [92, 27.8], [88, 27.5], [84, 27.5], [80, 29], [78.5, 31], [79, 34], [77, 35.5], [74, 34.5], [74.5, 32], [71, 28], [70, 27]];
  function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  defineLab({
    id: 'globe', subject: 'Social Science', cls: 'Class 6–9', icon: '🌍', title: 'Globe: latitudes, time and seasons',
    intro: 'Spin the Earth, click anywhere to read its latitude and longitude, and move the Sun with the month and time sliders to see day, night and the seasons.',
    notes: ['Latitudes are imaginary lines parallel to the Equator (0°). They go up to 90°N (North Pole) and 90°S (South Pole).', 'Important latitudes: Tropic of Cancer 23½°N, Tropic of Capricorn 23½°S, Arctic Circle 66½°N, Antarctic Circle 66½°S.', 'Longitudes (meridians) run from pole to pole. The Prime Meridian (0°) passes through Greenwich, London. They go to 180° East and West.', 'The Earth turns 360° in 24 hours, so 15° of longitude = 1 hour and 1° = 4 minutes.', 'Indian Standard Time (IST) is based on 82½°E (near Mirzapur) and is 5 hours 30 minutes ahead of Greenwich (UTC). The Tropic of Cancer passes through the middle of India.', 'Because the Earth\'s axis is tilted 23½°, the Sun is overhead at the Tropic of Cancer around 21 June (summer solstice in the north) and at the Tropic of Capricorn around 22 December. On 21 March and 23 September (equinoxes) it is overhead at the Equator and day and night are equal everywhere.'],
    view: { dist: 7.2, th: 1.35, ph: 1.25, target: [0, 0, 0], minR: 3 },
    steps: [
      { t: 'Click on the Equator', hint: 'The gold ring around the middle of the Earth. Click close to it.' },
      { t: 'Find and click India', hint: 'Spin the globe. India is north of the Equator, in Asia, with the Tropic of Cancer passing through it.' },
      { t: 'Make it 12 noon in India', hint: 'IST is 5 h 30 min ahead of UTC. Set the UTC slider to the right time.' },
      { t: 'Show the June solstice', hint: 'Set the month to June and see where the Sun is overhead.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, R = 2;
      E.scene.children.forEach((o) => { if (o.isLight && o !== E.key) o.intensity = o.isHemisphereLight ? 0.18 : 0; }); E.key.intensity = 3;
      const stars = new T.InstancedMesh(new T.SphereGeometry(0.06, 4, 3), new T.MeshBasicMaterial({ color: 0xffffff }), 300), d = new T.Object3D();
      for (let i = 0; i < 300; i++) { const v = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(60 + Math.random() * 30); d.position.copy(v); d.updateMatrix(); stars.setMatrixAt(i, d.matrix); } E.scene.add(stars);
      const map = K.tex(2048, 1024, (g, W, H) => {
        const X = (lon) => (lon + 180) / 360 * W, Y = (lat) => (90 - lat) / 180 * H;
        const sea = g.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#1b4f8a'); sea.addColorStop(0.5, '#2468b0'); sea.addColorStop(1, '#1b4f8a'); g.fillStyle = sea; g.fillRect(0, 0, W, H);
        const poly = (p, fill, stroke) => { g.beginPath(); p.forEach(([a, b], i) => (i ? g.lineTo(X(a), Y(b)) : g.moveTo(X(a), Y(b)))); g.closePath(); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
        Object.entries(LAND).forEach(([n, p]) => poly(p, n === 'Antarctica' || n === 'Greenland' ? '#e9f1f5' : n === 'Africa' || n === 'Australia' ? '#c9a55a' : '#5f9e4f', 'rgba(0,0,0,.25)'));
        poly(INDIA, '#ff9a3c', '#ffffff');
        g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 1.2; for (let l = -75; l <= 75; l += 15) { g.beginPath(); g.moveTo(0, Y(l)); g.lineTo(W, Y(l)); g.stroke(); } for (let l = -180; l <= 180; l += 15) { g.beginPath(); g.moveTo(X(l), 0); g.lineTo(X(l), H); g.stroke(); }
        const line = (lat, c, w, dash) => { g.setLineDash(dash || []); g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); g.stroke(); g.setLineDash([]); };
        line(23.44, '#ff5c7a', 3, [14, 8]); line(-23.44, '#ff5c7a', 3, [14, 8]); line(66.56, '#9fe8ff', 3, [14, 8]); line(-66.56, '#9fe8ff', 3, [14, 8]);
        g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), 0); g.lineTo(X(0), H); g.stroke();
        g.strokeStyle = '#ffd54a'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(X(82.5), Y(37)); g.lineTo(X(82.5), Y(8)); g.stroke(); g.setLineDash([]);
        g.font = '600 22px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
        [['NORTH AMERICA', -110, 45], ['SOUTH AMERICA', -68, -15], ['EUROPE', 10, 52], ['AFRICA', 12, 8], ['ASIA', 95, 55], ['AUSTRALIA', 122, -26], ['ANTARCTICA', -10, -80], ['PACIFIC OCEAN', -150, 5], ['ATLANTIC OCEAN', -38, 20], ['INDIAN OCEAN', 75, -20], ['INDIA', 76, 22], ['ARCTIC OCEAN', -10, 84]].forEach(([t, a, b]) => g.fillText(t, X(a) - g.measureText(t).width / 2, Y(b)));
      });
      const globe = K.sph(R, K.mat(0xffffff, { map, roughness: 0.75 }), [0, 0, 0], null, 96); E.scene.add(globe);
      const atm = K.sph(R * 1.04, K.glass(0x6fb8ff, 0.12, { side: 1 })); E.scene.add(atm);
      const P = (lat, lon, r = R) => { const la = lat * Math.PI / 180, ph = (lon + 180) * Math.PI / 180; return new T.Vector3(-Math.cos(ph) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(ph) * Math.cos(la) * r); };
      const ring = (lat, col, name, info) => { const la = lat * Math.PI / 180, m = K.torus(R * Math.cos(la) * 1.003, lat === 0 ? 0.018 : 0.011, K.glow(col, 1.4), [0, R * Math.sin(la), 0], [Math.PI / 2, 0, 0]); E.scene.add(m); const lbl = K.group(); lbl.position.copy(P(lat, -20, R * 1.02)); E.scene.add(lbl); api.part(lbl, name, info, { off: [0, 0.08, 0] }); return m; };
      ring(0, 0xffd54a, 'Equator 0°', 'The Equator divides the Earth into the Northern and Southern Hemispheres. It is the longest latitude, about 40,000 km around.');
      ring(23.44, 0xff5c7a, 'Tropic of Cancer 23½°N', 'The Sun is overhead here around 21 June. It passes through 8 Indian states including Gujarat, Rajasthan, Madhya Pradesh, Jharkhand and West Bengal.');
      ring(-23.44, 0xff5c7a, 'Tropic of Capricorn 23½°S', 'The Sun is overhead here around 22 December.');
      ring(66.56, 0x9fe8ff, 'Arctic Circle 66½°N', 'North of this, there is at least one day of 24-hour daylight in summer and 24-hour night in winter.');
      ring(-66.56, 0x9fe8ff, 'Antarctic Circle 66½°S', 'The southern polar circle.');
      const axis = K.cyl(0.02, 0.02, R * 2.6, K.mat(0xdddddd)); E.scene.add(axis);
      const np = K.group(); np.position.set(0, R * 1.3, 0); E.scene.add(np); api.part(np, 'North Pole 90°N', 'The northern end of the Earth\'s axis. The Earth spins around this axis once every 24 hours, from west to east.');
      const pm = K.group(); pm.position.copy(P(51.5, 0, R * 1.02)); E.scene.add(pm); api.part(pm, 'Greenwich · Prime Meridian 0°', 'Longitude 0° passes through Greenwich, London. World time (UTC/GMT) is counted from here.');
      const sm = K.group(); sm.position.copy(P(25, 82.5, R * 1.02)); E.scene.add(sm); api.part(sm, '82½°E · IST meridian', 'Indian Standard Time is the local time at 82½°E, which is 5 h 30 min ahead of Greenwich.', { off: [0, 0.05, 0] });
      const marker = K.group(K.cyl(0.012, 0.012, 0.3, K.mat(0xffffff), [0, 0.15, 0]), K.sph(0.05, K.glow(0xff4d6a, 2), [0, 0.32, 0])); marker.visible = false; E.scene.add(marker);
      const mLbl = E.addLabel(marker, '', [0, 0.45, 0], 'pin');
      const sun = K.sph(0.6, K.glow(0xffe08a, 3)); E.scene.add(sun);
      const sunPt = K.sph(0.06, K.glow(0xffe08a, 3)); E.scene.add(sunPt); api.part(sunPt, 'Sun overhead here', 'At this point the Sun is directly overhead at this moment. Its latitude changes with the season, between 23½°N and 23½°S.', { off: [0, 0.12, 0] });
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MID = [15, 46, 80, 111, 141, 172, 202, 233, 266, 296, 326, 356];
      let month = 3, utc = 12, picked = null;
      const fmtT = (hrs) => { hrs = ((hrs % 24) + 24) % 24; const H = Math.floor(hrs), M = Math.round((hrs - H) * 60) % 60; return (H % 12 || 12) + ':' + String(M).padStart(2, '0') + (H < 12 ? ' AM' : ' PM'); };
      const decl = () => 23.44 * Math.sin(TAU * (MID[month - 1] - 80) / 365);
      function place() {
        const dl = decl(), lon = (12 - utc) * 15, dir = P(dl, lon, 1);
        E.key.position.copy(dir.clone().multiplyScalar(30)); sun.position.copy(dir.clone().multiplyScalar(14)); sunPt.position.copy(P(dl, lon, R * 1.01));
        const rows = [['Month · UTC', MONTHS[month - 1] + ' · ' + fmtT(utc)], ['Time in India (IST)', fmtT(utc + 5.5)], ['Sun overhead at', Math.abs(dl).toFixed(1) + '°' + (dl >= 0 ? 'N' : 'S')], ['Season in India', month >= 3 && month <= 5 ? 'Summer' : month >= 6 && month <= 9 ? 'Monsoon' : month <= 2 || month === 12 ? 'Winter' : 'Retreating monsoon']];
        if (picked) { const [la, lo] = picked, local = utc + lo / 15, cosz = Math.sin(la * Math.PI / 180) * Math.sin(dl * Math.PI / 180) + Math.cos(la * Math.PI / 180) * Math.cos(dl * Math.PI / 180) * Math.cos((lo - lon) * Math.PI / 180);
          rows.unshift(['You clicked', Math.abs(la).toFixed(1) + '°' + (la >= 0 ? 'N' : 'S') + ', ' + Math.abs(lo).toFixed(1) + '°' + (lo >= 0 ? 'E' : 'W')], ['Sun time there', fmtT(local) + (cosz > 0 ? ' · day' : ' · night')]); }
        api.readout(rows);
      }
      api.controls(
        api.slider('month', 'Month (1 = Jan … 12 = Dec)', 1, 12, 1, month, '', (v) => { month = v; place(); if (v === 6) api.done(3, 'In June the Sun is overhead at the Tropic of Cancer (23½°N). The Northern Hemisphere has long days (summer); the Arctic has 24-hour daylight and Antarctica 24-hour night.'); if (v === 3 || v === 9) api.say('Equinox month: the Sun is overhead at the Equator, so day and night are about equal everywhere.'); if (v === 12) api.say('December: the Sun is overhead at the Tropic of Capricorn. It is summer in Australia and winter in India.'); }),
        api.slider('utc', 'Greenwich time (UTC, hours)', 0, 23.5, 0.5, utc, ' h', (v) => { utc = v; place(); if (v === 6.5) api.done(2, '12:00 noon IST = 6:30 UTC, because India is 5 h 30 min ahead of Greenwich (82½° ÷ 15° = 5.5 hours).'); }),
        api.buttons([['Spin to India', () => E.flyTo([0, 0, 0], 6, Math.atan2(P(22, 80).x, P(22, 80).z), 1.2)], ['Spin to Greenwich', () => E.flyTo([0, 0, 0], 6, Math.atan2(P(51, 0).x, P(51, 0).z), 1.0)], ['Pause spin', (e) => { spin = !spin; e.target.textContent = spin ? 'Pause spin' : 'Resume spin'; }]]));
      let spin = false;
      place();
      return {
        click(obj, hit, e) {
          const x = e ? E.hit(e, [globe]) : null; if (!x || !x.uv) return false;
          const lat = (x.uv.y - 0.5) * 180, lon = x.uv.x * 360 - 180; picked = [lat, lon];
          marker.visible = true; marker.position.copy(P(lat, lon)); marker.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), P(lat, lon, 1));
          mLbl.el.textContent = Math.abs(lat).toFixed(1) + '°' + (lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(lon).toFixed(1) + '°' + (lon >= 0 ? 'E' : 'W');
          place();
          if (Math.abs(lat) < 4) api.done(0, 'The Equator is 0° latitude. Places on it have about 12 hours of day all year and a hot, wet climate.');
          if (inPoly(lon, lat, INDIA)) api.done(1, 'India lies between about 8°N and 37°N, and 68°E and 97°E. The Tropic of Cancer divides it almost in half.');
          else if (api.cur() === 1) api.say('That point is ' + mLbl.el.textContent + '. India is around 8–37°N and 68–97°E. Try again.');
          return true;
        },
        update(dt) { if (spin) E.orb.th += dt * 0.15; },
      };
    },
  });

  /* ================= COMPUTERS: INSIDE A COMPUTER ================= */
  defineLab({
    id: 'computer', subject: 'Computers', cls: 'Class 6–10', icon: '🖥️', title: 'Inside a computer',
    intro: 'Switch the computer on, open the case, follow how data moves when you open a file, and identify each part.',
    notes: ['Input devices (keyboard, mouse) send data in; output devices (monitor, speaker, printer) show results.', 'The CPU (Central Processing Unit) is the "brain": it carries out instructions. Its parts are the ALU (does arithmetic and logic), the Control Unit, and registers.', 'RAM is primary memory: fast, but volatile (it forgets everything when power goes off). ROM holds start-up instructions and is non-volatile.', 'Storage (SSD or hard disk) is secondary memory: slower but keeps data permanently.', 'The motherboard connects every part. The PSU (power supply unit) converts mains AC to the low-voltage DC the parts need. The GPU draws pictures for the monitor.', 'When you open a file: storage → RAM → CPU processes it → GPU → monitor.', '1 byte = 8 bits; 1 KB = 1024 bytes; 1 MB = 1024 KB; 1 GB = 1024 MB.'],
    view: { dist: 9, th: 0.75, ph: 1.15, target: [0, 1.3, 0] },
    steps: [
      { t: 'Switch the computer on', hint: 'Click the glowing power button on the front of the case.' },
      { t: 'Open the case', hint: 'Drag the "Open the case" slider to the end.' },
      { t: 'Open a file and follow the data', hint: 'Press "Open a file" and watch the data travel.' },
      { t: 'Identify the parts', hint: 'Answer the 4 questions by clicking the right part.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      E.scene.add(K.box(12, 0.2, 7, K.mat(0x3a2c22, { roughness: 0.8 }), [0, -0.1, 0]));
      const caseG = K.group(), side = K.box(0.05, 3.6, 3.4, K.glass(0x8fb4d8, 0.2), [1.0, 1.8, 0]);
      caseG.add(K.box(2, 0.06, 3.4, K.mat(0x1d2128), [0, 0.03, 0]), K.box(2, 0.06, 3.4, K.mat(0x1d2128), [0, 3.57, 0]), K.box(0.06, 3.6, 3.4, K.mat(0x22272f), [-1, 1.8, 0]), K.box(2, 3.6, 0.06, K.mat(0x1d2128), [0, 1.8, -1.7]), K.box(2, 3.6, 0.06, K.mat(0x262c35), [0, 1.8, 1.7]), side);
      caseG.position.set(-2, 0, 0); E.scene.add(caseG);
      const power = K.cyl(0.12, 0.12, 0.05, K.glow(0x5ee6c8, 1.2), [0.5, 3.2, 1.74], [Math.PI / 2, 0, 0]); caseG.add(power); api.part(power, 'Power button', 'Press to start. The PSU sends power, the CPU runs start-up instructions from ROM (BIOS/UEFI) and loads the operating system from storage into RAM.', { off: [0, 0.25, 0] });
      const P = {}, base = {}, dirs = {};
      const mk = (id, name, info, obj, pos, dir) => { obj.position.set(...pos); caseG.add(obj); P[id] = obj; base[id] = obj.position.clone(); dirs[id] = new T.Vector3(...dir); api.part(obj, name, info, { id }); return obj; };
      const board = K.group(K.box(0.06, 3.0, 2.8, K.mat(0x1e5a3a, { roughness: 0.6 })), ...Array.from({ length: 14 }, (_, i) => K.box(0.07, 0.02, 1.2 + (i % 3) * 0.3, K.mat(0xd4af37, { metalness: 0.8 }), [0, -1.3 + i * 0.2, 0.2])));
      mk('board', 'Motherboard', 'The main circuit board. It connects the CPU, RAM, storage, GPU and all ports so they can talk to each other.', board, [-0.9, 1.9, 0], [-1.4, 0, 0]);
      const fan = K.group(...Array.from({ length: 7 }, (_, i) => K.box(0.04, 0.42, 0.12, K.mat(0x9aa3ad), [0, 0, 0], [i * TAU / 7, 0, 0.3]))), cpu = K.group(K.box(0.12, 0.6, 0.6, K.mat(0x9aa3ad, { metalness: 0.8, roughness: 0.3 })), K.box(0.4, 0.7, 0.7, K.mat(0x5d6670, { metalness: 0.6 }), [0.26, 0, 0]), K.torus(0.33, 0.03, K.mat(0x30363f), [0.48, 0, 0], [0, Math.PI / 2, 0]));
      fan.position.set(0.5, 0, 0); cpu.add(fan);
      mk('cpu', 'CPU (processor)', 'The brain of the computer. It fetches, decodes and executes billions of instructions per second. The fan and heat sink on top keep it cool.', cpu, [-0.6, 2.5, 0.3], [0.6, 0.8, 0.6]);
      const ram = K.group(...[0, 1].map((i) => K.group(K.box(0.04, 0.35, 1.3, K.mat(0x2a6b2f)), ...Array.from({ length: 6 }, (_, j) => K.box(0.05, 0.16, 0.14, K.mat(0x111111), [0.02, 0.04, -0.5 + j * 0.2]))).translateX(i * 0.12)));
      mk('ram', 'RAM (main memory)', 'Random Access Memory holds the programs and files you are using right now. It is very fast but volatile: everything in it is lost when power goes off.', ram, [-0.7, 2.6, -0.95], [0.6, 1.2, -0.9]);
      const gpu = K.group(K.box(0.3, 0.45, 2.2, K.mat(0x262626)), K.torus(0.17, 0.02, K.mat(0x555555), [0.16, 0, -0.5], [0, Math.PI / 2, 0]), K.torus(0.17, 0.02, K.mat(0x555555), [0.16, 0, 0.5], [0, Math.PI / 2, 0]), K.box(0.04, 0.4, 2.2, K.glow(0x5ee6c8, 0.6), [-0.16, 0, 0]));
      mk('gpu', 'Graphics card (GPU)', 'Draws images, video and games and sends them to the monitor. It has its own processor and memory.', gpu, [-0.5, 1.5, 0.1], [1.2, -0.1, 0.9]);
      mk('ssd', 'SSD (storage)', 'A Solid State Drive stores files and programs permanently using flash memory chips. Much faster than a hard disk, with no moving parts.', K.group(K.box(0.08, 0.06, 0.8, K.mat(0x1c1c1c)), K.box(0.09, 0.04, 0.25, K.mat(0xd8d8d8), [0, 0.02, 0.1])), [-0.8, 1.0, 0.4], [0.5, -0.4, 1.4]);
      const hdd = K.group(K.box(0.6, 0.15, 0.9, K.mat(0x8a9099, { metalness: 0.7 })), K.cyl(0.32, 0.32, 0.02, K.mat(0xd0d6de, { metalness: 0.95, roughness: 0.1 }), [0, 0.085, 0.05]));
      mk('hdd', 'Hard disk (HDD)', 'A hard disk stores data magnetically on spinning metal platters. It holds a lot for little cost but is slower than an SSD.', hdd, [0.3, 0.9, -1.0], [1.4, -0.2, -1.1]);
      mk('psu', 'Power supply (PSU)', 'Converts 230 V AC from the wall socket into the low DC voltages (12 V, 5 V, 3.3 V) the parts need.', K.group(K.box(1.4, 0.8, 1.2, K.mat(0x2b2f36)), K.torus(0.3, 0.03, K.mat(0x888888), [0, 0.41, 0], [Math.PI / 2, 0, 0])), [0.1, 0.5, 0.9], [0.4, -0.6, 1.6]);
      const mon = K.group(K.box(3.2, 2.0, 0.12, K.mat(0x111317), [0, 1.0, 0]), K.box(0.25, 0.9, 0.2, K.mat(0x30363f), [0, -0.3, -0.1]), K.box(1.2, 0.06, 0.7, K.mat(0x30363f), [0, -0.75, 0])), screenM = new T.MeshStandardMaterial({ color: 0x050608, emissive: 0x000000, roughness: 0.3 }), screen = K.plane(3.0, 1.8, screenM, [0, 1.0, 0.065]); mon.add(screen);
      mon.position.set(2.4, 0.78, -0.4); mon.rotation.y = -0.35; E.scene.add(mon); api.part(mon, 'Monitor (output)', 'An output device. It shows the picture the GPU sends it, made of millions of tiny dots called pixels.', { id: 'mon', off: [0, 2.2, 0] });
      const kb = K.group(K.box(2.4, 0.08, 0.8, K.mat(0x22262c)), ...Array.from({ length: 36 }, (_, i) => K.box(0.16, 0.05, 0.16, K.mat(0x3a4049), [-1.05 + (i % 12) * 0.19, 0.06, -0.25 + Math.floor(i / 12) * 0.22])));
      kb.position.set(2.2, 0.06, 1.8); E.scene.add(kb); api.part(kb, 'Keyboard (input)', 'An input device. Each key press sends a code to the computer.', { id: 'kb', off: [0, 0.3, 0] });
      const mouse = K.sph(0.18, K.mat(0x22262c), [3.8, 0.1, 1.8], [1, 0.5, 1.4]); E.scene.add(mouse); api.part(mouse, 'Mouse (input)', 'An input device that moves the pointer and clicks.', { id: 'mouse', off: [0, 0.3, 0] });
      const scr = K.tex(512, 300, (g, W, H) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#0b1a3a'); gr.addColorStop(1, '#2a145a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = '#5ee6c8'; g.font = '700 34px system-ui'; g.fillText('INSTITUTION OS', 30, 60); g.fillStyle = '#fff'; g.font = '20px system-ui'; ['📄 notes.txt', '🧪 lab-report.doc', '🖼️ heart.png'].forEach((t, i) => g.fillText(t, 40, 120 + i * 44)); });
      const scrOpen = K.tex(512, 300, (g, W, H) => { g.fillStyle = '#f4f6fb'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2a4a'; g.fillRect(0, 0, W, 36); g.fillStyle = '#fff'; g.font = '600 18px system-ui'; g.fillText('notes.txt', 14, 24); g.fillStyle = '#222'; g.font = '18px system-ui'; ['The CPU is the brain of the computer.', 'RAM is fast but volatile.', 'Storage keeps data permanently.'].forEach((t, i) => g.fillText(t, 20, 80 + i * 34)); });
      let on = false, ex = 0, flow = null;
      const lightUp = () => { on = true; power.material.emissiveIntensity = 3; screenM.color.set(0xffffff); screenM.emissive.set(0xffffff); screenM.emissiveIntensity = 0.9; screenM.map = scr; screenM.emissiveMap = scr; screenM.needsUpdate = true; };
      const NPk = 10, pk = new T.InstancedMesh(new T.SphereGeometry(0.07, 10, 8), K.glow(0xffd54a, 2.5), NPk); pk.visible = false; E.scene.add(pk); const dd = new T.Object3D();
      const wp = (id) => { const v = new T.Vector3(); P[id].getWorldPosition(v); return v; };
      function runFlow() {
        if (!on) { api.say('Switch the computer on first.'); return; }
        const sw = new T.Vector3(); screen.getWorldPosition(sw);
        const pts = [wp('ssd'), wp('board'), wp('ram'), wp('cpu'), wp('ram'), wp('gpu'), sw], curve = new T.CatmullRomCurve3(pts);
        const stops = [['SSD', 'The file is read from storage…'], ['Motherboard', 'It travels along the motherboard\'s wires (the bus)…'], ['RAM', 'It is copied into RAM so the CPU can reach it quickly…'], ['CPU', 'The CPU processes it (runs the program that opens it)…'], ['RAM', 'Results go back to RAM…'], ['GPU', 'The GPU turns them into a picture…'], ['Monitor', '…and the monitor shows it. Output!']];
        let last = -1; pk.visible = true; screenM.map = scr; screenM.emissiveMap = scr; screenM.needsUpdate = true;
        flow = { t: 0, curve, stops, on: (k) => { const s = Math.min(stops.length - 1, Math.floor(k * (stops.length - 1) + 0.15)); if (s !== last) { last = s; api.say(stops[s][1]); } } };
      }
      api.controls(
        api.slider('open', 'Open the case', 0, 1, 0.01, 0, '', (v) => { ex = v; side.position.z = 0; side.visible = v < 0.05; Object.keys(P).forEach((id) => P[id].position.copy(base[id]).addScaledVector(dirs[id], v)); if (v >= 0.99) api.done(1, 'Inside: motherboard, CPU with cooler, RAM, graphics card, SSD, hard disk and power supply.'); }),
        api.buttons([['Open a file', runFlow, 'pri'], ['Names on / off', () => { E.labelsOn = !E.labelsOn; }]]),
        h('div', { id: 'cx-pcq', class: 'cx-q' }));
      const QS = [['Which part is the "brain" that carries out instructions?', 'cpu'], ['Which part forgets everything when the power goes off?', 'ram'], ['Which part keeps your files permanently with no moving parts?', 'ssd'], ['Which part changes AC from the wall into DC?', 'psu']];
      let qi = 0; const qEl = () => $('#cx-pcq');
      const drawQ = () => { const el = qEl(); if (!el) return; if (!api.isDone(2)) { el.textContent = ''; return; } el.replaceChildren(h('b', { text: qi < QS.length ? 'Question ' + (qi + 1) + ' of 4' : 'All parts identified!' }), h('p', { text: qi < QS.length ? QS[qi][0] + ' Click it in 3D.' : 'Great work.' })); };
      return {
        click(obj) {
          if (obj === power) { if (!on) { lightUp(); api.done(0, 'Power on: the PSU supplies power, the CPU fan spins and the operating system starts.'); } return false; }
          if (api.isDone(2) && qi < QS.length && obj && obj.userData.click) {
            const id = obj.userData.click.id; if (id === QS[qi][1]) { api.say('Correct: ' + obj.userData.click.name + '.'); qi++; if (qi === QS.length) api.done(3, 'Identified: CPU (brain), RAM (volatile memory), SSD (permanent storage), PSU (power).'); } else api.say('Not that one, that is the ' + obj.userData.click.name + '. Try again.');
            drawQ(); return false;
          }
          return false;
        },
        update(dt) {
          if (on) fan.rotation.x += dt * 18;
          if (flow) { flow.t += dt / 7; const k = Math.min(1, flow.t); for (let i = 0; i < NPk; i++) { const u = Math.max(0, Math.min(1, k - i * 0.012)); dd.position.copy(flow.curve.getPointAt(u)); dd.updateMatrix(); pk.setMatrixAt(i, dd.matrix); } pk.instanceMatrix.needsUpdate = true; flow.on(k);
            if (k >= 1) { flow = null; pk.visible = false; screenM.map = scrOpen; screenM.emissiveMap = scrOpen; screenM.needsUpdate = true; api.done(2, 'Opening a file: storage → RAM → CPU → RAM → GPU → monitor.'); drawQ(); } }
        },
      };
    },
  });

  /* ================= COMPUTERS: LOGIC GATES ================= */
  defineLab({
    id: 'logic', subject: 'Computers', cls: 'Class 9–12', icon: '🔌', title: 'Logic gates board',
    intro: 'Choose a gate, flip the input switches A and B, and watch the LED. Try every combination to complete the truth table.',
    notes: ['Computers work with two states: 1 (ON, true, high voltage) and 0 (OFF, false, low voltage).', 'AND: output is 1 only when both inputs are 1. Y = A·B.', 'OR: output is 1 when at least one input is 1. Y = A + B.', 'NOT: output is the opposite of the input. Y = A̅.', 'NAND = NOT AND, NOR = NOT OR. NAND and NOR are "universal gates": any circuit can be built from just one of them.', 'XOR: output is 1 when the inputs are different. Used in adders.'],
    view: { dist: 8, th: 0, ph: 0.85, target: [0, 0, 0.3] },
    steps: [
      { t: 'Complete the AND truth table', hint: 'Choose AND and try all four combinations of A and B.' },
      { t: 'Complete the OR truth table', hint: 'Choose OR and try all four combinations.' },
      { t: 'Complete the NOT truth table', hint: 'Choose NOT and try A = 0 and A = 1.' },
      { t: 'Complete the XOR truth table', hint: 'Choose XOR and try all four combinations.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T;
      E.scene.add(K.box(7, 0.2, 4.4, K.mat(0x14442c, { roughness: 0.7 }), [0, -0.1, 0.3]));
      const F = { AND: (a, b) => a & b, OR: (a, b) => a | b, NOT: (a) => 1 - a, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), XOR: (a, b) => a ^ b };
      const STEP = { AND: 0, OR: 1, NOT: 2, XOR: 3 };
      const seen = {}; Object.keys(F).forEach((g) => (seen[g] = new Set()));
      let gate = 'AND', A = 0, B = 0;
      const offM = () => K.mat(0x3a3f47, { metalness: 0.4 }), onC = 0x5ee6c8;
      const wire = (pts) => { const m = K.tube(pts, 0.04, new T.MeshStandardMaterial({ color: 0x3a3f47, emissive: onC, emissiveIntensity: 0 })); E.scene.add(m); return m; };
      const sw = (z, name) => { const g = K.group(K.box(0.7, 0.2, 0.5, K.mat(0x22262c)), K.box(0.12, 0.35, 0.12, K.mat(0xdddddd), [0, 0.2, 0])); g.position.set(-2.6, 0.1, z); E.scene.add(g); api.part(g, 'Switch ' + name, 'Click to flip input ' + name + ' between 0 (off) and 1 (on).', { id: 'sw' + name, off: [0, 0.6, 0] }); return g; };
      const sA = sw(-0.4, 'A'), sB = sw(1.0, 'B');
      const wA = wire([[-2.25, 0.1, -0.4], [-1, 0.1, -0.4], [-0.6, 0.1, 0.05]]), wB = wire([[-2.25, 0.1, 1.0], [-1, 0.1, 1.0], [-0.6, 0.1, 0.55]]), wY = wire([[0.6, 0.1, 0.3], [2.0, 0.1, 0.3]]);
      const chip = K.box(1.3, 0.35, 1.1, K.mat(0x111317), [0, 0.18, 0.3]); E.scene.add(chip); api.part(chip, 'Logic gate', 'Takes one or two binary inputs and gives one output according to its rule.', { id: 'gate', off: [0, 0.6, 0] });
      const gTex = {}; const gLabel = K.plane(1.1, 0.9, new T.MeshBasicMaterial({ transparent: true }), [0, 0.36, 0.3], [-Math.PI / 2, 0, 0]); E.scene.add(gLabel);
      const ledM = new T.MeshStandardMaterial({ color: 0x441111, emissive: 0xff2a2a, emissiveIntensity: 0, transparent: true, opacity: 0.95 }), led = K.group(K.sph(0.28, ledM, [0, 0.35, 0]), K.cyl(0.28, 0.28, 0.25, ledM, [0, 0.12, 0])); led.position.set(2.3, 0, 0.3); E.scene.add(led); api.part(led, 'LED (output Y)', 'Lights up when the output Y is 1.', { id: 'led', off: [0, 0.9, 0] });
      const glowL = new T.PointLight(0xff3a3a, 0, 3); glowL.position.set(2.3, 0.6, 0.3); E.scene.add(glowL);
      const lblA = E.addLabel(sA, 'A = 0', [0, -0.05, 0.5], 'pin'), lblB = E.addLabel(sB, 'B = 0', [0, -0.05, 0.5], 'pin'), lblY = E.addLabel(led, 'Y = 0', [0, -0.05, 0.6], 'pin');
      const table = h('div', { class: 'cx-tt' });
      const drawTex = (g) => gTex[g] || (gTex[g] = K.tex(256, 210, (c, W, H) => { c.fillStyle = '#111317'; c.fillRect(0, 0, W, H); c.fillStyle = '#5ee6c8'; c.font = '700 54px "JetBrains Mono", monospace'; c.textAlign = 'center'; c.fillText(g, W / 2, 95); c.fillStyle = '#9aa7c0'; c.font = '26px system-ui'; c.fillText({ AND: 'Y = A·B', OR: 'Y = A + B', NOT: 'Y = A̅', NAND: 'Y = (A·B)̅', NOR: 'Y = (A+B)̅', XOR: 'Y = A ⊕ B' }[g], W / 2, 160); }));
      function update() {
        const one = gate === 'NOT', Y = F[gate](A, B);
        sB.visible = wB.visible = !one;
        sA.children[1].rotation.z = A ? -0.5 : 0.5; sB.children[1].rotation.z = B ? -0.5 : 0.5;
        wA.material.emissiveIntensity = A ? 1.6 : 0; wB.material.emissiveIntensity = B ? 1.6 : 0; wY.material.emissiveIntensity = Y ? 1.6 : 0;
        ledM.emissiveIntensity = Y ? 3 : 0; ledM.color.set(Y ? 0xff5555 : 0x441111); glowL.intensity = Y ? 4 : 0;
        lblA.el.textContent = 'A = ' + A; lblB.el.textContent = 'B = ' + B; lblY.el.textContent = 'Y = ' + Y;
        gLabel.material.map = drawTex(gate); gLabel.material.needsUpdate = true;
        seen[gate].add(one ? String(A) : A + '' + B);
        const rows = one ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
        table.replaceChildren(h('table', {}, h('tr', {}, h('th', { text: 'A' }), one ? null : h('th', { text: 'B' }), h('th', { text: 'Y = ' + gate })), ...rows.map((r) => { const k = r.join(''), cur = one ? k === String(A) : k === A + '' + B, s = seen[gate].has(k); return h('tr', { class: (cur ? 'now ' : '') + (s ? 'seen' : '') }, h('td', { text: r[0] }), one ? null : h('td', { text: r[1] }), h('td', { text: s ? String(F[gate](r[0], r[1] || 0)) : '?' })); })));
        if (seen[gate].size === rows.length && STEP[gate] !== undefined) api.done(STEP[gate], gate + ' truth table: ' + rows.map((r) => r.join('') + '→' + F[gate](r[0], r[1] || 0)).join(', ') + '.');
      }
      const gBtns = Object.keys(F).map((g) => h('button', { class: 'cx-btn' + (g === gate ? ' on' : ''), type: 'button', text: g, onclick: () => { gate = g; A = 0; B = 0; gBtns.forEach((b) => b.classList.toggle('on', b.textContent === g)); update(); } }));
      api.controls(h('div', { class: 'cx-row' }, gBtns), api.buttons([['Flip A', () => { A ^= 1; update(); }], ['Flip B', () => { B ^= 1; update(); }]]), table);
      update();
      return { click(obj) { if (obj === sA) { A ^= 1; update(); return true; } if (obj === sB) { B ^= 1; update(); return true; } return false; } };
    },
  });

  /* ================= SUBJECTS (Physics, Chemistry, Maths, Social Science, Computers) ================= */
  // [id, title, class, lab id or null, summary, [key points], [[question, [options], correct index] x4]]
  const SUBJECTS = {
    Physics: { icon: '⚡', blurb: 'Force, motion, electricity, magnetism and light.', topics: [
      ['ph-force', 'Force and Pressure', 8, 'force', 'A force is a push or a pull. It can change the speed, direction or shape of an object. Pressure is force acting on unit area.', ['Force is measured in newtons (N).', 'Pressure = Force ÷ Area, measured in pascals (Pa). A sharp knife cuts easily because its small area gives high pressure.', 'Contact forces: muscular force and friction. Non-contact forces: magnetic, electrostatic and gravitational force.'],
        [['What is the SI unit of force?', ['Joule', 'Newton', 'Pascal', 'Watt'], 1], ['Pressure = ?', ['Force × Area', 'Force ÷ Area', 'Area ÷ Force', 'Mass × Area'], 1], ['Which is a non-contact force?', ['Friction', 'Muscular force', 'Magnetic force', 'Tension in a rope'], 2], ['Why do camels walk easily on sand?', ['Their feet are hard', 'Their wide feet spread weight over a large area, giving low pressure', 'Sand is soft', 'They walk slowly'], 1]]],
      ['ph-friction', 'Friction', 8, 'force', 'Friction is the force that opposes motion between two surfaces in contact. It depends on how rough the surfaces are and how hard they press together.', ['Static friction (before moving) is more than sliding friction; rolling friction is the smallest.', 'Friction causes wear and produces heat, but without it we could not walk or write.', 'Friction is reduced by lubricants, ball bearings, wheels and streamlined shapes.'],
        [['Friction always acts…', ['in the direction of motion', 'opposite to the motion', 'upwards', 'only on rough surfaces'], 1], ['Which friction is the smallest?', ['Static', 'Sliding', 'Rolling', 'They are equal'], 2], ['Why is oil put on machine parts?', ['To increase friction', 'To reduce friction', 'To make them shine', 'To cool them only'], 1], ['On which surface does a box need the biggest push to start moving?', ['Glass', 'Polished wood', 'Sandpaper', 'Ice'], 2]]],
      ['ph-current', 'Electric Current and Circuits', 10, 'battery', 'Electric current is the flow of charge. A cell pushes charge around a closed circuit. Ohm\'s law links voltage, current and resistance.', ['Current I = Q ÷ t, measured in amperes (A) with an ammeter connected in series.', 'Potential difference V is measured in volts (V) with a voltmeter connected in parallel.', 'Ohm\'s law: V = I × R. Resistance is measured in ohms (Ω).', 'Conventional current flows from + to −; electrons flow from − to +.'],
        [['Ohm\'s law is…', ['V = I ÷ R', 'V = I × R', 'I = V × R', 'R = V × I'], 1], ['An ammeter is connected…', ['in parallel', 'in series', 'across the cell only', 'anywhere'], 1], ['If V = 6 V and R = 3 Ω, the current is…', ['18 A', '0.5 A', '2 A', '3 A'], 2], ['Electrons in a wire flow from…', ['+ to −', '− to +', 'both ways', 'they don\'t move'], 1]]],
      ['ph-magnets', 'Fun with Magnets', 6, 'magnets', 'Magnets attract iron, nickel and cobalt. Every magnet has a north and a south pole. Like poles repel and unlike poles attract.', ['Magnetic materials: iron, steel, nickel, cobalt. Non-magnetic: wood, plastic, glass, copper, aluminium.', 'A freely hanging magnet always points north–south. A compass uses this.', 'Like poles repel; unlike poles attract. Magnetic force is strongest at the poles.'],
        [['Which is attracted by a magnet?', ['Copper wire', 'Iron nail', 'Aluminium foil', 'Plastic pen'], 1], ['Two north poles placed near each other will…', ['attract', 'repel', 'do nothing', 'stick'], 1], ['A freely suspended magnet points…', ['east–west', 'north–south', 'up–down', 'anywhere'], 1], ['Where is a bar magnet\'s attraction strongest?', ['At the middle', 'At the poles', 'Equal everywhere', 'Nowhere'], 1]]],
      ['ph-motion', 'Motion and Speed', 9, null, 'Motion is a change of position with time. Speed tells how fast; velocity is speed in a given direction; acceleration is the rate of change of velocity.', ['Speed = distance ÷ time (m/s). Velocity also has direction.', 'Acceleration a = (v − u) ÷ t.', 'Equations of motion: v = u + at; s = ut + ½at²; v² = u² + 2as.'],
        [['A car goes 100 m in 20 s. Its speed is…', ['2000 m/s', '5 m/s', '0.2 m/s', '120 m/s'], 1], ['Velocity is speed with…', ['mass', 'direction', 'time', 'force'], 1], ['A body starts from rest and reaches 10 m/s in 5 s. Its acceleration is…', ['50 m/s²', '2 m/s²', '0.5 m/s²', '15 m/s²'], 1], ['The SI unit of acceleration is…', ['m/s', 'm/s²', 'm²/s', 'N'], 1]]],
    ] },
    Chemistry: { icon: '⚗️', blurb: 'Matter, reactions, acids, bases and metals.', topics: [
      ['ch-acids', 'Acids, Bases and Salts', 10, 'chemistry', 'Acids taste sour and turn blue litmus red. Bases taste bitter, feel soapy and turn red litmus blue. An acid and a base neutralise each other to form a salt and water.', ['Indicators: litmus, phenolphthalein (pink in base), methyl orange, turmeric.', 'pH below 7 is acidic, 7 is neutral, above 7 is basic.', 'Neutralisation: acid + base → salt + water, e.g. HCl + NaOH → NaCl + H₂O.'],
        [['Phenolphthalein in a base turns…', ['colourless', 'pink', 'blue', 'yellow'], 1], ['pH of pure water is…', ['0', '7', '14', '1'], 1], ['Acid + base → ?', ['Salt + water', 'Gas only', 'Metal + water', 'Oxygen'], 0], ['An acid turns blue litmus…', ['red', 'green', 'stays blue', 'black'], 0]]],
      ['ch-reactions', 'Chemical Reactions and Equations', 10, 'chemistry', 'In a chemical reaction new substances form. Signs: colour change, gas, precipitate, temperature change or light.', ['Combination: A + B → AB. Decomposition: AB → A + B.', 'Displacement: a more reactive metal displaces a less reactive one: Fe + CuSO₄ → FeSO₄ + Cu.', 'Double displacement often gives a precipitate. Equations must be balanced (atoms are conserved).'],
        [['Iron in copper sulphate solution is a … reaction.', ['combination', 'decomposition', 'displacement', 'neutralisation'], 2], ['A precipitate is…', ['a gas', 'an insoluble solid formed in a solution', 'a colour', 'a metal'], 1], ['Lime water turns milky with…', ['oxygen', 'hydrogen', 'carbon dioxide', 'nitrogen'], 2], ['Why must equations be balanced?', ['To look neat', 'Because mass (atoms) is conserved', 'To add heat', 'To make gas'], 1]]],
      ['ch-metals', 'Metals and Non-metals', 10, 'chemistry', 'Metals are lustrous, malleable, ductile and good conductors. Non-metals are usually dull, brittle and poor conductors.', ['Reactive metals react with dilute acids to give hydrogen gas, which burns with a pop.', 'Reactivity series (part): K > Na > Ca > Mg > Al > Zn > Fe > Pb > H > Cu > Hg > Ag > Au.', 'Metal oxides are basic; non-metal oxides are usually acidic.'],
        [['Zinc + dilute HCl gives…', ['oxygen', 'hydrogen', 'chlorine', 'carbon dioxide'], 1], ['The pop test identifies…', ['O₂', 'CO₂', 'H₂', 'N₂'], 2], ['Which is more reactive?', ['Copper', 'Gold', 'Iron', 'Silver'], 2], ['Metals can be drawn into wires. This is called…', ['malleability', 'ductility', 'sonority', 'lustre'], 1]]],
      ['ch-changes', 'Physical and Chemical Changes', 7, 'chemistry', 'A physical change alters shape, size or state, but no new substance forms and it is often reversible. A chemical change makes new substances.', ['Physical: melting ice, cutting paper, dissolving sugar.', 'Chemical: rusting, burning, cooking, baking soda with vinegar.', 'Rusting of iron needs both oxygen and water; galvanising and painting prevent it.'],
        [['Which is a chemical change?', ['Melting wax', 'Tearing paper', 'Rusting of iron', 'Boiling water'], 2], ['Baking soda + vinegar produces…', ['oxygen', 'carbon dioxide', 'hydrogen', 'nothing'], 1], ['Rusting needs…', ['oxygen only', 'water only', 'oxygen and water', 'heat only'], 2], ['Dissolving salt in water is…', ['a physical change', 'a chemical change', 'combustion', 'rusting'], 0]]],
      ['ch-atoms', 'Atoms and Molecules', 9, null, 'Matter is made of tiny particles called atoms. Atoms join to form molecules. Each element has a symbol and each compound a formula.', ['Law of conservation of mass: mass is neither created nor destroyed in a reaction.', 'Valency is the combining capacity of an atom.', 'Molar mass of H₂O = 2 × 1 + 16 = 18 g/mol. 1 mole = 6.022 × 10²³ particles.'],
        [['Formula of water is…', ['HO', 'H₂O', 'H₂O₂', 'OH₂'], 1], ['Molar mass of CO₂ (C = 12, O = 16) is…', ['28', '44', '32', '40'], 1], ['1 mole contains … particles.', ['6.022 × 10²³', '1000', '3.14 × 10⁸', '12'], 0], ['Symbol of sodium is…', ['So', 'S', 'Na', 'Sd'], 2]]],
    ] },
    Maths: { icon: '📐', blurb: 'Shapes, measurement, algebra and data.', topics: [
      ['ma-mensuration', 'Surface Area and Volume', 9, 'solids', 'Surface area is the total area of all faces of a solid. Volume is the space it fills.', ['Cube: SA = 6a², V = a³. Cuboid: SA = 2(lb + bh + hl), V = lbh.', 'Cylinder: CSA = 2πrh, TSA = 2πr(r + h), V = πr²h.', 'Cone: V = ⅓πr²h. Sphere: SA = 4πr², V = ⁴⁄₃πr³.'],
        [['Volume of a cube of side 3 cm is…', ['9 cm³', '27 cm³', '18 cm³', '54 cm³'], 1], ['Surface area of a cube of side 2 cm is…', ['8 cm²', '12 cm²', '24 cm²', '16 cm²'], 2], ['Volume of a cylinder is…', ['2πrh', 'πr²h', '⅓πr²h', '4πr²'], 1], ['A cuboid 5 × 4 × 2 has volume…', ['11', '40', '20', '76'], 1]]],
      ['ma-solids', 'Visualising Solid Shapes', 8, 'solids', 'Solids have faces, edges and vertices. A net is a flat pattern that folds into a solid.', ['Euler\'s formula: F + V − E = 2 for polyhedra.', 'Cube: F 6, V 8, E 12. Square pyramid: F 5, V 5, E 8. Triangular prism: F 5, V 6, E 9.', 'A cylinder\'s net is a rectangle and two circles.'],
        [['Euler\'s formula is…', ['F + E − V = 2', 'F + V − E = 2', 'V + E − F = 2', 'F + V + E = 2'], 1], ['How many edges does a cube have?', ['6', '8', '12', '10'], 2], ['A square pyramid has how many faces?', ['4', '5', '6', '8'], 1], ['The net of a cylinder has…', ['6 squares', 'a rectangle and two circles', 'triangles', 'one circle'], 1]]],
      ['ma-pythagoras', 'Pythagoras Theorem', 10, null, 'In a right-angled triangle, the square of the hypotenuse equals the sum of the squares of the other two sides.', ['Hypotenuse² = Base² + Perpendicular², i.e. c² = a² + b².', 'Pythagorean triples: (3, 4, 5), (5, 12, 13), (8, 15, 17).', 'The hypotenuse is the longest side, opposite the right angle.'],
        [['If the sides are 3 and 4, the hypotenuse is…', ['5', '7', '6', '12'], 0], ['Which is a Pythagorean triple?', ['(2, 3, 4)', '(5, 12, 13)', '(4, 5, 6)', '(1, 2, 3)'], 1], ['The hypotenuse is opposite the…', ['smallest angle', 'right angle', 'acute angle', 'base'], 1], ['Sides 6 and 8 give hypotenuse…', ['10', '14', '12', '48'], 0]]],
      ['ma-linear', 'Linear Equations in One Variable', 8, null, 'A linear equation has a variable with power 1, like 2x + 3 = 11. Solve it by doing the same thing to both sides.', ['Transposing: a term moved to the other side changes its sign.', '2x + 3 = 11 → 2x = 8 → x = 4.', 'Always check the answer by putting it back into the equation.'],
        [['Solve: x + 7 = 12', ['5', '19', '7', '−5'], 0], ['Solve: 3x = 21', ['18', '7', '24', '63'], 1], ['Solve: 2x − 4 = 10', ['3', '7', '6', '14'], 1], ['Which is a linear equation?', ['x² = 4', '2x + 1 = 5', 'x³ = 8', '1/x = 2'], 1]]],
      ['ma-probability', 'Probability', 10, 'dice', 'Probability measures how likely an event is, from 0 (impossible) to 1 (certain).', ['P(E) = number of favourable outcomes ÷ total number of outcomes.', 'P(E) + P(not E) = 1.', 'A coin has 2 outcomes; a die has 6; a pack of cards has 52.'],
        [['Probability of a head on a coin is…', ['1', '½', '¼', '0'], 1], ['Probability of 6 on a die is…', ['1/6', '1/2', '6', '1/3'], 0], ['If P(E) = 0.3, P(not E) is…', ['0.3', '0.7', '1.3', '0'], 1], ['An impossible event has probability…', ['1', '0.5', '0', '−1'], 2]]],
    ] },
    'Social Science': { icon: '🌍', blurb: 'Geography, history, civics and economics.', topics: [
      ['ss-globe', 'Globe: Latitudes and Longitudes', 6, 'globe', 'A globe is a model of the Earth. Latitudes and longitudes form a grid to locate any place.', ['Equator 0°; Tropic of Cancer 23½°N; Tropic of Capricorn 23½°S; Arctic Circle 66½°N; Antarctic Circle 66½°S.', 'Prime Meridian 0° through Greenwich; 180° meridian is opposite it.', '15° of longitude = 1 hour. IST (82½°E) = GMT + 5 h 30 min.'],
        [['The Equator is at…', ['0°', '23½°N', '90°N', '66½°S'], 0], ['The Prime Meridian passes through…', ['Delhi', 'Greenwich', 'Paris', 'New York'], 1], ['1 hour difference in time = … of longitude.', ['1°', '15°', '30°', '4°'], 1], ['IST is based on which meridian?', ['0°', '82½°E', '90°E', '68°E'], 1]]],
      ['ss-motions', 'Motions of the Earth', 6, 'solar', 'The Earth rotates on its tilted axis (day and night) and revolves around the Sun (seasons and the year).', ['Rotation takes about 24 hours; revolution about 365¼ days (hence a leap year every 4 years).', 'The axis is tilted 23½° from the vertical, which causes seasons.', 'Solstices: 21 June and 22 December. Equinoxes: 21 March and 23 September.'],
        [['Day and night are caused by…', ['revolution', 'rotation', 'the Moon', 'clouds'], 1], ['On 21 June the Sun is overhead at…', ['the Equator', 'the Tropic of Cancer', 'the Tropic of Capricorn', 'the North Pole'], 1], ['On an equinox, day and night are…', ['equal', 'longer days', 'longer nights', 'no day'], 0], ['A leap year has how many days?', ['365', '366', '364', '360'], 1]]],
      ['ss-india', 'India: Size and Location', 9, 'globe', 'India lies entirely in the Northern Hemisphere, between 8°4′N–37°6′N and 68°7′E–97°25′E.', ['The Tropic of Cancer (23½°N) divides India into almost two equal parts.', 'India is the 7th largest country by area (about 3.28 million km²).', 'From Gujarat to Arunachal Pradesh there is a 2-hour difference in sunrise, so one standard time (IST) is used.'],
        [['Which line divides India almost in half?', ['Equator', 'Tropic of Cancer', 'Tropic of Capricorn', 'Prime Meridian'], 1], ['India lies in which hemisphere (north–south)?', ['Southern', 'Northern', 'Both', 'Neither'], 1], ['India is the … largest country by area.', ['2nd', '7th', '10th', '1st'], 1], ['India\'s standard meridian is…', ['82½°E', '0°', '68°E', '97°E'], 0]]],
      ['ss-constitution', 'The Indian Constitution', 8, null, 'The Constitution is the supreme law of India. It came into force on 26 January 1950.', ['Dr B. R. Ambedkar chaired the Drafting Committee.', 'Key features: federalism, parliamentary government, separation of powers, Fundamental Rights, secularism.', 'Fundamental Rights include equality, freedom, against exploitation, freedom of religion, cultural and educational rights, and constitutional remedies.'],
        [['The Constitution came into force on…', ['15 August 1947', '26 January 1950', '2 October 1950', '26 November 1949'], 1], ['Who chaired the Drafting Committee?', ['Jawaharlal Nehru', 'Dr B. R. Ambedkar', 'Mahatma Gandhi', 'Sardar Patel'], 1], ['Separation of powers divides power among…', ['states only', 'legislature, executive and judiciary', 'army and police', 'parties'], 1], ['Right to Equality is a…', ['Directive Principle', 'Fundamental Right', 'Fundamental Duty', 'law of Parliament only'], 1]]],
      ['ss-resources', 'Resources and Development', 10, null, 'Anything that can satisfy our needs, is technologically possible and culturally acceptable is a resource.', ['Renewable resources can be replenished (solar, wind, forests); non-renewable cannot (coal, petroleum).', 'Sustainable development meets today\'s needs without harming future generations.', 'Soil types of India: alluvial (most widespread), black (cotton), red, laterite, arid, forest.'],
        [['Which is a renewable resource?', ['Coal', 'Petroleum', 'Solar energy', 'Natural gas'], 2], ['Black soil is best for growing…', ['tea', 'cotton', 'rice', 'apples'], 1], ['The most widespread soil in India is…', ['laterite', 'alluvial', 'arid', 'red'], 1], ['Sustainable development means…', ['using everything now', 'meeting present needs without harming the future', 'no development', 'only industry'], 1]]],
    ] },
    Computers: { icon: '💻', blurb: 'Hardware, memory, binary, logic and safe internet use.', topics: [
      ['co-parts', 'Parts of a Computer', 6, 'computer', 'A computer takes input, processes it, stores it and gives output (IPO cycle).', ['Input devices: keyboard, mouse, scanner, microphone. Output: monitor, printer, speaker.', 'CPU = ALU + Control Unit + registers.', 'The motherboard connects all parts; the PSU gives them power.'],
        [['The brain of the computer is the…', ['monitor', 'CPU', 'keyboard', 'printer'], 1], ['Which is an output device?', ['Mouse', 'Scanner', 'Printer', 'Keyboard'], 2], ['ALU stands for…', ['Arithmetic Logic Unit', 'All Logic Unit', 'Array Link Unit', 'Arithmetic Line Unit'], 0], ['Which part connects all the others?', ['Motherboard', 'Mouse', 'Speaker', 'Pen drive'], 0]]],
      ['co-memory', 'Memory and Storage', 7, 'computer', 'Primary memory (RAM, ROM) works directly with the CPU. Secondary storage (SSD, HDD, pen drive) keeps data permanently.', ['RAM is volatile (loses data without power). ROM is non-volatile and holds start-up instructions.', '8 bits = 1 byte; 1024 bytes = 1 KB; 1024 KB = 1 MB; 1024 MB = 1 GB; 1024 GB = 1 TB.', 'Cache memory is very fast memory close to the CPU.'],
        [['Which memory is volatile?', ['ROM', 'RAM', 'SSD', 'DVD'], 1], ['1 byte = … bits', ['4', '8', '16', '1024'], 1], ['1 KB = … bytes', ['1000', '1024', '100', '512'], 1], ['Start-up instructions are stored in…', ['RAM', 'ROM', 'Cache', 'Printer'], 1]]],
      ['co-binary', 'Number Systems: Binary', 8, 'binary', 'Computers use the binary system (base 2) with only 0 and 1.', ['Place values in binary: 1, 2, 4, 8, 16, 32…', '(1011)₂ = 8 + 0 + 2 + 1 = 11.', 'To convert decimal to binary, divide by 2 repeatedly and read the remainders from bottom to top.'],
        [['Binary uses the digits…', ['0–9', '0 and 1', '1 and 2', '0–7'], 1], ['(101)₂ in decimal is…', ['3', '5', '6', '101'], 1], ['Decimal 6 in binary is…', ['110', '101', '111', '011'], 0], ['The base of binary is…', ['10', '8', '2', '16'], 2]]],
      ['co-logic', 'Logic Gates', 11, 'logic', 'Logic gates are electronic circuits that make decisions with 0s and 1s. They are the building blocks of processors.', ['AND: 1 only if all inputs are 1. OR: 1 if any input is 1. NOT: reverses the input.', 'NAND and NOR are universal gates.', 'XOR: 1 when inputs differ. A half adder uses XOR (sum) and AND (carry).'],
        [['AND gives 1 when…', ['any input is 1', 'all inputs are 1', 'inputs differ', 'all inputs are 0'], 1], ['NOT 1 = ?', ['1', '0', '2', '−1'], 1], ['Which is a universal gate?', ['AND', 'OR', 'NAND', 'XOR'], 2], ['XOR with A = 1, B = 1 gives…', ['1', '0', '2', '11'], 1]]],
      ['co-safety', 'Internet and Cyber Safety', 7, null, 'The internet connects computers around the world. Staying safe online protects you and your data.', ['Never share passwords, OTPs or personal details with strangers.', 'Use strong passwords with letters, numbers and symbols; lock your device.', 'Cyberbullying: don\'t reply, save proof, block, and tell a parent or teacher. Report at cybercrime.gov.in or call 1930 in India.'],
        [['Which is a strong password?', ['123456', 'password', 'T!ger#2024rain', 'yourname'], 2], ['Someone online asks for your OTP. You should…', ['share it', 'never share it and tell an adult', 'post it', 'email it'], 1], ['If you are cyberbullied you should…', ['reply angrily', 'save proof, block and tell a trusted adult', 'delete your account only', 'ignore forever'], 1], ['India\'s cybercrime helpline number is…', ['100', '1930', '108', '112'], 1]]],
    ] },
  };
  const SUBJ_LIST = Object.keys(SUBJECTS);
  const STOPIC = {}; SUBJ_LIST.forEach((s) => SUBJECTS[s].topics.forEach(([id, title, cls, lab, summary, points, quiz]) => { STOPIC[id] = { id, title, cls, lab, summary, points, quiz, subject: s }; }));
  const subjState = (id) => (S.subj[id] = S.subj[id] || { best: 0, done: false, tries: 0 });

  function renderSubjects(main) {
    const sel = S.subjSel && STOPIC[S.subjSel] ? STOPIC[S.subjSel] : null;
    if (sel) return renderSubjTopic(main, sel);
    const cur = S.subjPick || 'Physics';
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'All subjects' }), h('h1', { html: 'Learn every <em>subject</em>' })),
      h('p', { class: 'cx-lead', text: 'Biology lives in the 3D library. Physics, Chemistry, Maths, Social Science and Computers are here, each with notes, a quick quiz, a 3D lab and an AI teacher.' })));
    const app = appState(), bioDone = Object.keys(app.done || {}).length;
    const cards = h('div', { class: 'cx-subj-cards' },
      h('button', { class: 'cx-subj', type: 'button', style: '--c:' + SUBJ_COL.Biology, onclick: () => { location.hash = '#/library'; } }, h('span', { class: 'ic', text: '🧬' }), h('b', { text: 'Biology' }), h('small', { text: bioDone + ' of ' + C.TOPICS.length + ' 3D topics done · open library' })),
      SUBJ_LIST.map((s) => { const ts = SUBJECTS[s].topics, d = ts.filter((t) => S.subj[t[0]] && S.subj[t[0]].done).length; return h('button', { class: 'cx-subj' + (s === cur ? ' on' : ''), type: 'button', style: '--c:' + SUBJ_COL[s], onclick: () => { S.subjPick = s; save(); C.render(); } }, h('span', { class: 'ic', text: SUBJECTS[s].icon }), h('b', { text: s }), h('small', { text: d + ' of ' + ts.length + ' topics done' }), h('div', { class: 'cx-pbar' }, h('i', { style: 'width:' + Math.round(d / ts.length * 100) + '%' }))); }));
    main.append(cards);
    const sub = SUBJECTS[cur], my = +S.child.cls || 10;
    const list = h('div', { class: 'cx-card glass' }, h('h3', { text: sub.icon + ' ' + cur }), h('p', { class: 'cx-note', text: sub.blurb }),
      ...sub.topics.slice().sort((a, b) => (Math.abs(a[2] - my) - Math.abs(b[2] - my))).map(([id, title, cls, lab]) => { const st = S.subj[id]; return h('div', { class: 'cx-vrow', style: '--h:' + SUBJ_COL[cur] },
        h('span', { class: 'ic', text: st && st.done ? '✓' : SUBJECTS[cur].icon }), h('span', {}, h('b', { text: title }), h('small', { text: clsLabel(cls) + (lab ? ' · 3D lab: ' + LABS[lab].title : '') + (st && st.tries ? ' · best ' + st.best + '/4' : '') })),
        h('span', { class: 'cx-row' }, lab ? h('button', { class: 'cx-btn', type: 'button', text: '3D lab', onclick: () => goLab(lab) }) : null, h('button', { class: 'cx-btn pri', type: 'button', text: st && st.done ? 'Revise' : 'Learn', onclick: () => { S.subjSel = id; save(); C.render(); } }))); }));
    main.append(list);
  }
  function renderSubjTopic(main, t) {
    S.last = { kind: 'subj', id: t.id, title: t.title, at: Date.now() }; save();
    const st = subjState(t.id);
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('button', { class: 'cx-back', type: 'button', text: '← ' + t.subject, onclick: () => { S.subjSel = null; S.subjPick = t.subject; save(); C.render(); } }),
      h('span', { class: 'eyebrow', style: 'display:block;margin-top:10px;color:' + SUBJ_COL[t.subject], text: t.subject + ' · ' + clsLabel(t.cls) }), h('h1', { text: t.title })), st.done ? h('span', { class: 'cx-chip ok', text: 'Completed · ' + st.best + '/4' }) : null));
    const quizBox = h('div', { class: 'cx-quiz' });
    let qi = 0, score = 0;
    const drawQ = () => {
      if (qi >= t.quiz.length) {
        const pass = score >= 3; st.tries++; st.best = Math.max(st.best, score); st.at = Date.now();
        if (pass && !st.done) { st.done = true; notify('parent', S.child.name + ' completed "' + t.title + '" (' + t.subject + ') with ' + score + '/4.', 'learning'); notify('teacher', S.child.name + ' passed the ' + t.subject + ' quiz "' + t.title + '": ' + score + '/4.', 'learning'); }
        save(); checkAssign();
        quizBox.replaceChildren(h('p', { html: '<b>' + score + ' / 4</b> ' + (pass ? '· Passed! Topic complete.' : '· You need 3 to pass. Read the notes again and retry.') }),
          h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Try again', onclick: () => { qi = 0; score = 0; drawQ(); } }), t.lab ? h('button', { class: 'cx-btn', type: 'button', text: 'Open the 3D lab', onclick: () => goLab(t.lab) }) : null));
        return;
      }
      const [q, opts, ok] = t.quiz[qi];
      quizBox.replaceChildren(h('small', { class: 'cx-note', text: 'Question ' + (qi + 1) + ' of 4' }), h('p', { html: '<b></b>' }), h('div', { class: 'cx-qopts' }, opts.map((o, i) => h('button', { class: 'cx-btn', type: 'button', text: o, onclick: (e) => {
        if (quizBox.dataset.lock) return; quizBox.dataset.lock = '1'; const right = i === ok; if (right) score++;
        e.target.classList.add(right ? 'right' : 'wrong'); if (!right) quizBox.querySelectorAll('.cx-qopts button')[ok].classList.add('right');
        setTimeout(() => { delete quizBox.dataset.lock; qi++; drawQ(); }, right ? 700 : 1500);
      } }))));
      quizBox.querySelector('p b').textContent = q;
    };
    drawQ();
    const teacher = teacherPanel({ name: AI.subjectTeacher, role: t.subject + ' teacher', starters: ['Explain this simply', 'Give me an example from daily life', 'Quiz me', 'What is most important for exams?'],
      hello: 'Hi ' + S.child.name + ', I\'m ' + AI.subjectTeacher + ', your AI ' + t.subject + ' teacher. Read the notes, then ask me anything about "' + t.title + '".',
      getCtx: () => ({ lab: false, subject: t.subject, cls: clsLabel(t.cls), title: t.title, notes: [t.summary, ...t.points], quiz: t.quiz, glossary: [] }) });
    main.append(h('div', { class: 'cx-grid2' },
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Notes' }), h('p', { text: t.summary }), h('ul', { class: 'cx-points' }, t.points.map((p) => h('li', { text: p }))),
        h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn', type: 'button', text: 'Read aloud', onclick: () => speak(t.title + '. ' + t.summary + ' ' + t.points.join(' ')) }), h('button', { class: 'cx-btn', type: 'button', text: 'Stop', onclick: () => stopSpeech() }), t.lab ? h('button', { class: 'cx-btn pri', type: 'button', text: '🧪 3D lab: ' + LABS[t.lab].title, onclick: () => goLab(t.lab) }) : null),
        h('h4', { text: 'Quick quiz · pass with 3 of 4' }), quizBox),
      h('div', { class: 'cx-card glass cx-ai-card' }, teacher.el)));
  }

  /* ================= 3D LABS LIST ================= */
  function renderLabs(main) {
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Real-time 3D labs' }), h('h1', { html: 'Do the <em>experiment</em> yourself' })),
      h('p', { class: 'cx-lead', text: 'Every lab is a live 3D bench: drag to turn it, pinch or scroll to zoom, and use the tools. An AI lab teacher guides each step and your observations are saved for your parent and teacher.' })));
    const by = {}; LAB_ORDER.forEach((id) => { const d = LABS[id]; (by[d.subject] = by[d.subject] || []).push(d); });
    Object.entries(by).forEach(([subj, list]) => main.append(h('div', { class: 'cx-card glass' }, h('h3', { style: 'color:' + SUBJ_COL[subj], text: subj }),
      h('div', { class: 'cx-lab-grid' }, list.map((d) => { const st = S.labs[d.id], n = st ? st.steps.filter(Boolean).length : 0; return h('button', { class: 'cx-labcard', type: 'button', style: '--c:' + SUBJ_COL[subj], onclick: () => goLab(d.id) },
        h('span', { class: 'ic', text: d.icon }), h('b', { text: d.title }), h('small', { text: d.cls + ' · ' + d.steps.length + ' steps' }), h('div', { class: 'cx-pbar' }, h('i', { style: 'width:' + Math.round(n / d.steps.length * 100) + '%' })),
        h('span', { class: 'cx-chip ' + (st && st.done ? 'ok' : n ? 'warn' : ''), text: st && st.done ? 'Completed' : n ? n + ' / ' + d.steps.length + ' done' : 'Not started' })); })))));
  }

  /* ================= ASSIGNMENTS (teacher and parent) ================= */
  const VIDEO_DONE = (id) => { const p = S.vprog && S.vprog[id]; return !!(p && (p.done || (p.tour && p.tour.done) || (p.rec && p.rec.done))); };
  const TYPES = {
    topic: { label: '3D Biology topic', opts: () => C.TOPICS.map((t) => [t.id, t.title + ' (' + clsLabel(t.cls) + ')']), done: (a) => !!(appState().done || {})[a.ref], go: (a) => { location.hash = '#/topic/' + a.ref; } },
    video: { label: 'Video lesson', opts: () => C.TOPICS.map((t) => [t.id, t.title]), done: (a) => VIDEO_DONE(a.ref), go: (a) => { location.hash = '#/topic/' + a.ref; setTimeout(() => C.openVideo(a.ref), 900); } },
    lab: { label: '3D lab', opts: () => LAB_ORDER.map((id) => [id, LABS[id].subject + ': ' + LABS[id].title]), done: (a) => !!(S.labs[a.ref] && S.labs[a.ref].done), go: (a) => goLab(a.ref) },
    subject: { label: 'Subject topic + quiz', opts: () => Object.values(STOPIC).map((t) => [t.id, t.subject + ': ' + t.title]), done: (a) => !!(S.subj[a.ref] && S.subj[a.ref].done), go: (a) => { S.subjSel = a.ref; save(); location.hash = '#/campus/subjects'; C.render(); } },
    custom: { label: 'Other task (tick when done)', opts: () => [], done: (a) => !!a.ticked, go: null },
  };
  const refTitle = (a) => { if (a.type === 'custom') return a.title; const o = TYPES[a.type].opts().find((x) => x[0] === a.ref); return o ? o[1] : a.ref; };
  function checkAssign() {
    let ch = false;
    S.assign.forEach((a) => { if (!a.doneAt && TYPES[a.type] && TYPES[a.type].done(a)) { a.doneAt = Date.now(); ch = true; const by = a.by === 'teacher' ? 'teacher' : 'parent';
      notify(by, S.child.name + ' finished the task you set: "' + refTitle(a) + '".', 'task'); if (by === 'teacher') notify('parent', S.child.name + ' finished a task from the class teacher: "' + refTitle(a) + '".', 'task'); } });
    if (ch) save(); return ch;
  }
  setInterval(() => { if (checkAssign() && !$('#campus-root').hidden && ['today', 'assign'].includes(route().a)) C.render(); }, 15000);
  const dueTxt = (d) => { if (!d) return 'No due date'; const t = new Date(d + 'T23:59'), days = Math.ceil((t - Date.now()) / 864e5); return days < 0 ? 'Overdue · ' + d : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : 'Due ' + d; };
  function taskRow(a, canTick) {
    const done = !!a.doneAt, T0 = TYPES[a.type] || TYPES.custom, overdue = !done && a.due && new Date(a.due + 'T23:59') < Date.now();
    return h('div', { class: 'cx-task' + (done ? ' done' : '') },
      h('span', { class: 'cx-task-ck', text: done ? '✓' : '' }),
      h('span', {}, h('b', { text: refTitle(a) }), h('small', { text: T0.label + ' · from ' + (a.by === 'teacher' ? 'class teacher' : 'parent') + ' · ' + (done ? 'done ' + when(a.doneAt) : dueTxt(a.due)) }), a.note ? h('small', { class: 'cx-task-note', text: '“' + a.note + '”' }) : null),
      h('span', { class: 'cx-row' }, overdue ? h('span', { class: 'cx-chip bad', text: 'Overdue' }) : null,
        !done && T0.go && canTick === true ? h('button', { class: 'cx-btn pri', type: 'button', text: 'Start', onclick: () => T0.go(a) }) : null,
        !done && a.type === 'custom' && canTick === true ? h('button', { class: 'cx-btn', type: 'button', text: 'Mark done', onclick: () => { a.ticked = true; checkAssign(); C.render(); } }) : null,
        canTick === 'manage' ? h('button', { class: 'cx-btn', type: 'button', text: 'Remove', onclick: () => { S.assign = S.assign.filter((x) => x !== a); save(); C.render(); } }) : null));
  }
  function renderAssign(main) {
    const by = S.role === 'teacher' ? 'teacher' : 'parent';
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: by === 'teacher' ? 'Class teacher' : 'Parent' }), h('h1', { html: 'Assign <em>tasks</em> to ' + S.child.name })),
      h('p', { class: 'cx-lead', text: 'Tasks appear on ' + S.child.name + '\'s daily card. Topics, videos, labs and quizzes tick themselves off when finished, and you get a message.' })));
    const type = h('select', { id: 'cx-as-type' }, Object.entries(TYPES).map(([k, v]) => h('option', { value: k, text: v.label })));
    const ref = h('select', { id: 'cx-as-ref' }), title = h('input', { id: 'cx-as-title', placeholder: 'e.g. Read pages 40–45 and write a summary', hidden: true });
    const due = h('input', { id: 'cx-as-due', type: 'date', value: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10) }), note = h('input', { id: 'cx-as-note', placeholder: 'Note (optional)' });
    const fill = () => { const o = TYPES[type.value].opts(); ref.replaceChildren(...o.map(([v, l]) => h('option', { value: v, text: l }))); ref.hidden = !o.length; title.hidden = !!o.length; };
    type.onchange = fill; fill();
    const add = () => {
      const t = type.value; if (t === 'custom' && !title.value.trim()) { toast('Write what the task is.'); return; }
      const a = { id: 'a' + Date.now().toString(36), by, type: t, ref: t === 'custom' ? '' : ref.value, title: title.value.trim(), due: due.value, note: note.value.trim(), at: Date.now() };
      S.assign.unshift(a); save(); checkAssign();
      notify('student', 'New task from your ' + (by === 'teacher' ? 'class teacher' : 'parent') + ': "' + refTitle(a) + '" · ' + dueTxt(a.due) + '.', 'task');
      if (by === 'teacher') notify('parent', 'The class teacher set ' + S.child.name + ' a task: "' + refTitle(a) + '" · ' + dueTxt(a.due) + '.', 'task');
      toast('Task added to ' + S.child.name + '\'s daily card.'); C.render();
    };
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'New task' }), h('div', { class: 'cx-form-grid' },
      h('label', { class: 'cx-field' }, 'Type', type), h('label', { class: 'cx-field' }, 'What', ref, title), h('label', { class: 'cx-field' }, 'Due date', due), h('label', { class: 'cx-field' }, 'Note', note)),
      h('div', { class: 'cx-row', style: 'margin-top:12px' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Assign task', onclick: add }))));
    checkAssign();
    const mine = S.assign.filter((a) => a.by === by), other = S.assign.filter((a) => a.by !== by);
    main.append(h('div', { class: 'cx-grid2' },
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Tasks you set' }), mine.length ? h('div', {}, mine.map((a) => taskRow(a, 'manage'))) : h('p', { class: 'cx-note', text: 'No tasks yet.' })),
      h('div', { class: 'cx-card glass' }, h('h3', { text: by === 'teacher' ? 'Tasks set by the parent' : 'Tasks set by the class teacher' }), other.length ? h('div', {}, other.map((a) => taskRow(a, false))) : h('p', { class: 'cx-note', text: 'None.' }))));
  }

  /* ================= TODAY (daily card) ================= */
  const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  const levelOf = (xp) => { let l = 0; while (l + 1 < LEVELS.length && xp >= LEVELS[l + 1]) l++; return l + 1; };
  function dayStats() {
    const app = appState(), bioDone = Object.keys(app.done || {}).length, bioN = C.TOPICS.length;
    const labDone = LAB_ORDER.filter((id) => S.labs[id] && S.labs[id].done).length, subjN = Object.keys(STOPIC).length, subjDone = Object.keys(STOPIC).filter((id) => S.subj[id] && S.subj[id].done).length;
    const vids = C.TOPICS.filter((t) => VIDEO_DONE(t.id)).length;
    const total = bioN + LAB_ORDER.length + subjN, got = bioDone + labDone + subjDone;
    return { app, bioDone, bioN, labDone, labN: LAB_ORDER.length, subjDone, subjN, vids, pct: Math.round(got / total * 100), xp: app.xp || 0, level: levelOf(app.xp || 0), streak: app.lastDay === new Date().toDateString() || app.lastDay === new Date(Date.now() - 864e5).toDateString() ? app.streak || 0 : 0 };
  }
  function lastItem() {
    const L = S.last; if (!L) return null;
    if (L.kind === 'topic') { const done = !!(appState().done || {})[L.id]; return { text: L.title, sub: '3D Biology topic · ' + (done ? 'completed, revise or take the test' : 'continue the lesson and quiz'), go: () => { location.hash = '#/topic/' + L.id; } }; }
    if (L.kind === 'lab' && LABS[L.id]) { const st = S.labs[L.id], n = st ? st.steps.filter(Boolean).length : 0; return { text: LABS[L.id].title, sub: '3D lab · ' + n + ' of ' + LABS[L.id].steps.length + ' steps done', go: () => goLab(L.id) }; }
    if (L.kind === 'subj' && STOPIC[L.id]) { const t = STOPIC[L.id], st = S.subj[L.id]; return { text: t.title, sub: t.subject + ' · ' + (st && st.done ? 'completed' : 'notes and quiz'), go: () => { S.subjSel = L.id; save(); location.hash = '#/campus/subjects'; C.render(); } }; }
    return null;
  }
  function nextUps() {
    const app = appState(), my = +S.child.cls || 10, out = [];
    const bio = C.TOPICS.filter((t) => t.cls === my), nb = bio.find((t) => !(app.done || {})[t.id]) || C.TOPICS.find((t) => !(app.done || {})[t.id]);
    if (nb) out.push({ ic: nb.icon, text: nb.title, sub: 'Biology · next 3D topic', go: () => { location.hash = '#/topic/' + nb.id; } });
    const ns = Object.values(STOPIC).filter((t) => !(S.subj[t.id] && S.subj[t.id].done)).sort((a, b) => Math.abs(a.cls - my) - Math.abs(b.cls - my))[0];
    if (ns) out.push({ ic: SUBJECTS[ns.subject].icon, text: ns.title, sub: ns.subject + ' · notes + quiz', go: () => { S.subjSel = ns.id; save(); location.hash = '#/campus/subjects'; C.render(); } });
    const nl = LAB_ORDER.find((id) => !(S.labs[id] && S.labs[id].done));
    const nf = FUN.find((f) => !S.funSeen[f.id]); if (nf) out.push({ ic: '🎵', text: nf.title, sub: 'Fun Zone · memory trick', go: () => { S.funSel = nf.id; save(); location.hash = '#/campus/fun'; } });
    if (nl) out.push({ ic: LABS[nl].icon, text: LABS[nl].title, sub: LABS[nl].subject + ' · 3D lab', go: () => goLab(nl) });
    return out;
  }
  function todayCard(compact) {
    checkAssign();
    const st = dayStats(), isParent = S.role === 'parent', name = S.child.name, hr = new Date().getHours();
    const greet = isParent ? name + '\'s day' : (hr < 12 ? 'Good morning, ' : hr < 17 ? 'Good afternoon, ' : 'Good evening, ') + name;
    const pending = S.assign.filter((a) => !a.doneAt).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1), doneToday = S.assign.filter((a) => a.doneAt && new Date(a.doneAt).toDateString() === new Date().toDateString());
    const L = lastItem();
    const stat = (n, l) => h('div', { class: 'cx-stat' }, h('b', { text: n }), h('small', { text: l }));
    const ring = h('div', { class: 'cx-ring', style: '--p:' + st.pct }, h('b', { text: st.pct + '%' }), h('small', { text: 'overall' }));
    const el = h('div', { class: 'cx-today' + (compact ? ' compact' : '') },
      h('div', { class: 'cx-today-top' }, ring, h('div', {}, h('span', { class: 'eyebrow', text: new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) }), h('h2', { text: greet }),
        h('div', { class: 'cx-stats' }, stat('🔥 ' + st.streak, 'day streak'), stat('Lv ' + st.level, st.xp + ' XP'), stat(st.bioDone + '/' + st.bioN, 'Biology 3D'), stat(st.subjDone + '/' + st.subjN, 'other subjects'), stat(st.labDone + '/' + st.labN, '3D labs'), stat(String(st.vids), 'videos watched'), stat('⭐ ' + totalStars(), 'game stars')))),
      L ? h('button', { class: 'cx-continue', type: 'button', onclick: () => { closePop(); L.go(); } }, h('span', { class: 'eyebrow', text: isParent ? 'Last opened' : 'Continue where you stopped' }), h('b', { text: L.text }), h('small', { text: L.sub + ' · ' + when(S.last.at) }), h('span', { class: 'go', text: '→' })) : null,
      h('h4', { text: 'To do · ' + pending.length + (doneToday.length ? ' · ' + doneToday.length + ' finished today' : '') }),
      pending.length ? h('div', {}, pending.slice(0, compact ? 4 : 50).map((a) => taskRow(a, !isParent))) : h('p', { class: 'cx-note', text: isParent ? 'No open tasks. Set one in Assignments.' : 'No tasks from your teacher or parent right now. Try a suggestion below.' }),
      compact && pending.length > 4 ? h('p', { class: 'cx-note', text: '+' + (pending.length - 4) + ' more in Today.' }) : null,
      h('h4', { text: 'Suggested next' }), h('div', { class: 'cx-nexts' }, nextUps().map((n) => h('button', { type: 'button', class: 'cx-next', onclick: () => { closePop(); n.go(); } }, h('span', { class: 'ic', text: n.ic }), h('span', {}, h('b', { text: n.text }), h('small', { text: n.sub }))))));
    return el;
  }
  function renderToday(main) {
    main.append(todayCard(false));
    if (S.role === 'parent') main.append(h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Assign a task', onclick: () => { location.hash = '#/campus/assign'; } }), h('button', { class: 'cx-btn', type: 'button', text: 'Messages', onclick: () => { location.hash = '#/campus/inbox'; } })));
    const done = S.assign.filter((a) => a.doneAt).slice(0, 8);
    if (done.length) main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Recently finished' }), done.map((a) => taskRow(a, false))));
    S.todayPop = new Date().toDateString(); save();
  }
  /* once-a-day popup on entering the learning app */
  let pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  function maybePop() {
    const r = route(), today = new Date().toDateString();
    if (pop || S.todayPop === today || !['student', 'parent'].includes(S.role) || !['home', 'library', 'topic'].includes(r.v) || C.lockOn()) return;
    S.todayPop = today; save();
    pop = h('div', { id: 'cx-today-pop', role: 'dialog', 'aria-label': 'Your day' }, h('div', { class: 'cx-pop-card' }, h('button', { class: 'cx-pop-x', type: 'button', 'aria-label': 'Close', text: '×', onclick: closePop }), todayCard(true),
      h('div', { class: 'cx-row', style: 'margin-top:12px' }, h('button', { class: 'cx-btn pri', type: 'button', text: S.role === 'parent' ? 'Open Today' : 'Open my day', onclick: () => { closePop(); location.hash = '#/campus/today'; } }), h('button', { class: 'cx-btn', type: 'button', text: 'Later', onclick: closePop }))));
    pop.addEventListener('click', (e) => { if (e.target === pop) closePop(); });
    document.body.append(pop);
  }
  addEventListener('hashchange', () => { closePop(); setTimeout(maybePop, 600); });
  setTimeout(maybePop, 1500);

  /* ================= AI TEACHER IN THE 3D VIEWER ================= */
  let aiDrawer = null, aiFor = null;
  function viewerAI() {
    const r = route(), dock = $('.v-dock');
    if (r.v !== 'topic') { if (aiDrawer) { aiDrawer.remove(); aiDrawer = null; aiFor = null; } return; }
    if (dock && !dock.querySelector('#cx-dock-ai')) {
      const b = h('button', { id: 'cx-dock-ai', type: 'button', title: 'Ask the AI teacher' }); b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10H9l-5 4z"/><path d="M9 9h6M9 12h4"/></svg>'; b.append(h('span', { text: 'AI teacher' }));
      b.onclick = () => toggleAI(); dock.append(b);
    }
    if (aiDrawer && aiFor !== r.a) { aiDrawer.remove(); aiDrawer = null; aiFor = null; }
    const b = $('#cx-dock-ai'); if (b) b.classList.toggle('on', !!(aiDrawer && !aiDrawer.hidden));
  }
  function toggleAI() {
    const r = route(), t = C.topicOf(r.a); if (!t) return;
    if (aiDrawer) { aiDrawer.hidden = !aiDrawer.hidden; return; }
    const parts = () => { const s = C.stageNow(); return s && s.model ? s.model.parts.map((p) => ({ name: p.name || p.label || p.id || '', info: p.info || p.desc || '' })).filter((g) => g.name) : []; };
    const teacher = teacherPanel({ name: AI.subjectTeacher, role: 'Biology teacher', starters: ['Explain this model simply', 'What does each part do?', 'Quiz me', 'What is most important for exams?'],
      hello: 'Hi ' + S.child.name + ', I\'m ' + AI.subjectTeacher + '. Click any part of the 3D model, or ask me about "' + t.title + '".',
      getCtx: () => ({ lab: false, subject: 'Biology', cls: clsLabel(t.cls), title: t.title, notes: [t.summary, ...(t.learn || [])], glossary: parts() }) });
    aiDrawer = h('aside', { id: 'cx-aidrawer', 'aria-label': 'AI teacher' }, h('button', { class: 'cx-pop-x', type: 'button', 'aria-label': 'Close', text: '×', onclick: () => { aiDrawer.hidden = true; } }), teacher.el);
    aiFor = r.a; document.body.append(aiDrawer);
  }
  setInterval(viewerAI, 500);


  /* ================= MORE TOPICS: every subject, plus EVS and Physical Education ================= */
  // Each topic: id, t (title), c (class), lab, s (summary), p (key points), q (4-question quiz: [question, options, correct index]),
  // w (writing task: [question, keywords to include, model answer]), iq (important questions: [marks, question, answer]).
  SUBJ_COL.EVS = '#8ee06a'; SUBJ_COL['Physical Education'] = '#ff7a59';
  SUBJECTS.EVS = { icon: '🌱', blurb: 'Our environment: water, air, plants, animals, food and keeping our planet clean.', topics: [] };
  SUBJECTS['Physical Education'] = { icon: '🏃', blurb: 'Fitness, yoga, sports rules, first aid and healthy habits.', topics: [] };
  ['EVS', 'Physical Education'].forEach((k) => { if (!SUBJ_LIST.includes(k)) SUBJ_LIST.push(k); });
  const NEW_TOPICS = {
    Physics: [
      { id: 'ph-light', t: 'Light: Reflection and Refraction', c: 10, lab: 'lens', s: 'Light travels in straight lines. It bounces off mirrors (reflection) and bends when it passes from one medium to another (refraction). Lenses use refraction to form images.', p: ['Laws of reflection: angle of incidence = angle of reflection; incident ray, reflected ray and normal lie in one plane.', 'Refraction: light bends towards the normal when it enters a denser medium (air → glass).', 'Convex lens: converging; forms real, inverted images when the object is beyond F. Concave lens: diverging; always virtual, erect, diminished.', 'Lens formula: 1/v − 1/u = 1/f. Power P = 1/f (f in metres), unit dioptre (D).'],
        q: [['A convex lens is also called a…', ['diverging lens', 'converging lens', 'plane lens', 'prism'], 1], ['The unit of power of a lens is…', ['watt', 'dioptre', 'metre', 'joule'], 1], ['Light going from air into glass bends…', ['away from the normal', 'towards the normal', 'not at all', 'backwards'], 1], ['Angle of incidence is 30°. Angle of reflection is…', ['60°', '30°', '90°', '15°'], 1]],
        w: ['Explain the image formed by a convex lens when the object is placed beyond 2F.', ['real', 'inverted', 'diminished', 'between f and 2f'], 'When the object is beyond 2F, a convex lens forms a real, inverted and diminished image between F and 2F on the other side of the lens.'],
        iq: [[2, 'State the two laws of reflection.', '(1) The angle of incidence equals the angle of reflection. (2) The incident ray, the reflected ray and the normal at the point of incidence all lie in the same plane.'], [3, 'A lens has a focal length of +0.5 m. Find its power and name the lens.', 'P = 1/f = 1/0.5 = +2 D. Positive power means it is a convex (converging) lens.']] },
      { id: 'ph-pendulum', t: 'Motion and Time: the Pendulum', c: 7, lab: 'pendulum', s: 'A simple pendulum swings to and fro in periodic motion. The time for one complete oscillation is its time period, which depends on its length, not on the mass of the bob.', p: ['Time period T = time for one complete to-and-fro swing.', 'A longer pendulum has a longer time period; T = 2π√(L/g).', 'Changing the mass of the bob or a small change in amplitude does not change T.', 'Speed = distance ÷ time; the SI unit of time is the second.'],
        q: [['The time period of a pendulum depends on its…', ['mass', 'length', 'colour', 'material'], 1], ['If the pendulum is made longer, its time period…', ['decreases', 'increases', 'stays the same', 'becomes zero'], 1], ['Swinging to and fro is called… motion.', ['circular', 'oscillatory (periodic)', 'straight', 'random'], 1], ['20 oscillations take 40 s. The time period is…', ['20 s', '2 s', '0.5 s', '800 s'], 1]],
        w: ['How would you find the time period of a simple pendulum in the lab?', ['oscillations', 'stopwatch', 'divide', 'average'], 'Pull the bob slightly to one side and release it. Use a stopwatch to time 20 complete oscillations, then divide the total time by 20. Repeat and take the average to reduce error.'],
        iq: [[1, 'Define the time period of a pendulum.', 'The time taken by the pendulum to complete one oscillation.'], [3, 'Does the time period change if a heavier bob is used? Explain with your lab result.', 'No. The time period depends only on the length (and g), T = 2π√(L/g). In the lab, changing the bob mass left T unchanged while making the string longer increased T.']] },
      { id: 'ph-sound', t: 'Sound', c: 9, lab: null, s: 'Sound is produced by vibrating objects and travels as a longitudinal wave through a medium. It cannot travel through a vacuum.', p: ['Sound needs a medium: solid, liquid or gas. It travels fastest in solids.', 'Speed of sound in air is about 343 m/s at 20 °C.', 'Frequency decides pitch; amplitude decides loudness.', 'Humans hear 20 Hz to 20,000 Hz. Below is infrasound, above is ultrasound (used in sonography and SONAR).', 'An echo is heard if the reflecting surface is at least about 17 m away.'],
        q: [['Sound cannot travel through…', ['water', 'steel', 'vacuum', 'air'], 2], ['Pitch depends on…', ['amplitude', 'frequency', 'speed', 'mass'], 1], ['Ultrasound has frequency above…', ['20 Hz', '2000 Hz', '20,000 Hz', '200 Hz'], 2], ['Sound travels fastest in…', ['air', 'water', 'steel', 'vacuum'], 2]],
        w: ['Why can astronauts on the Moon not hear each other directly?', ['medium', 'vacuum', 'vibrations', 'radio'], 'Sound needs a medium to travel because it moves as vibrations of particles. The Moon has no air (it is almost a vacuum), so sound cannot travel; astronauts talk using radio waves, which do not need a medium.'],
        iq: [[2, 'Distinguish between loudness and pitch.', 'Loudness depends on the amplitude of the wave and is measured in decibels; pitch depends on the frequency and decides how shrill or flat the sound is.'], [3, 'An echo is heard 2 s after shouting. If sound travels at 340 m/s, how far is the cliff?', 'Distance travelled = 340 × 2 = 680 m (there and back). Distance to the cliff = 680 ÷ 2 = 340 m.']] },
    ],
    Chemistry: [
      { id: 'ch-ph', t: 'The pH Scale', c: 10, lab: 'ph', s: 'pH tells how acidic or basic a solution is, on a scale from 0 to 14. Universal indicator shows different colours at different pH values.', p: ['pH < 7 acidic, pH = 7 neutral, pH > 7 basic (alkaline).', 'Lower pH means a stronger acid; higher pH means a stronger base.', 'Our stomach makes hydrochloric acid (pH about 1.5–3.5). Tooth decay starts when mouth pH falls below 5.5.', 'Antacids (bases) relieve acidity; baking soda neutralises bee stings (acidic).'],
        q: [['pH of a neutral solution is…', ['0', '7', '14', '1'], 1], ['Which has the lowest pH?', ['Soap', 'Pure water', 'Lemon juice', 'Baking soda solution'], 2], ['Tooth decay starts below pH…', ['8', '7.5', '5.5', '10'], 2], ['A solution turns universal indicator blue-violet. It is…', ['strongly acidic', 'neutral', 'strongly basic', 'salty only'], 2]],
        w: ['Why do we use toothpaste, which is basic, to prevent tooth decay?', ['acid', 'bacteria', '5.5', 'neutralise'], 'Bacteria in the mouth break down food to make acids. When the mouth pH falls below 5.5, tooth enamel starts to dissolve. Toothpaste is basic, so it neutralises the extra acid and protects the enamel.'],
        iq: [[1, 'What is the pH of pure water?', '7 (neutral).'], [3, 'Arrange in increasing order of pH: NaOH solution, lemon juice, pure water, vinegar.', 'Lemon juice (≈2) < vinegar (≈3) < pure water (7) < NaOH solution (≈13–14).']] },
      { id: 'ch-periodic', t: 'Periodic Classification of Elements', c: 10, lab: null, s: 'Elements are arranged in the modern periodic table in order of increasing atomic number, in 18 groups and 7 periods. Elements in a group have similar properties.', p: ['Modern periodic law (Moseley): properties are a periodic function of atomic number.', 'Groups are vertical columns (1–18); periods are horizontal rows (1–7).', 'Across a period, atomic size decreases and metallic character decreases.', 'Down a group, atomic size increases and metallic character increases.', 'Group 1 alkali metals; group 17 halogens; group 18 noble gases.'],
        q: [['The modern periodic table is based on…', ['atomic mass', 'atomic number', 'density', 'colour'], 1], ['How many groups are there?', ['7', '8', '18', '16'], 2], ['Atomic size across a period…', ['increases', 'decreases', 'stays same', 'doubles'], 1], ['Group 18 elements are called…', ['halogens', 'alkali metals', 'noble gases', 'metalloids'], 2]],
        w: ['Why do elements in the same group show similar chemical properties?', ['valence electrons', 'same number', 'outer shell', 'valency'], 'Elements in the same group have the same number of valence electrons in their outermost shell. Chemical reactions involve these outer electrons, so the elements have the same valency and react in similar ways.'],
        iq: [[2, 'State the modern periodic law.', 'The properties of elements are a periodic function of their atomic numbers.'], [3, 'How do atomic size and metallic character change down a group? Why?', 'Both increase down a group, because a new shell is added at each step. The outer electrons are farther from the nucleus, so they are held less strongly and are lost more easily.']] },
      { id: 'ch-carbon', t: 'Carbon and its Compounds', c: 10, lab: null, s: 'Carbon forms millions of compounds because it shares electrons (covalent bonds), links to other carbon atoms in chains and rings (catenation) and has a valency of 4 (tetravalency).', p: ['Covalent bond: formed by sharing electron pairs.', 'Catenation: carbon atoms join to form long chains, branches and rings.', 'Saturated hydrocarbons (alkanes) have single bonds; unsaturated ones (alkenes, alkynes) have double or triple bonds.', 'Homologous series: members differ by –CH₂–; e.g. methane CH₄, ethane C₂H₆, propane C₃H₈.', 'Soaps work by micelle formation: the hydrophobic tail holds oil and the hydrophilic head faces water.'],
        q: [['Bonds in carbon compounds are mostly…', ['ionic', 'covalent', 'metallic', 'hydrogen'], 1], ['The property of carbon to form chains is…', ['tetravalency', 'catenation', 'isomerism', 'allotropy'], 1], ['Formula of methane is…', ['CH₄', 'C₂H₆', 'CO₂', 'CH₃OH'], 0], ['Ethene (C₂H₄) has a…', ['single bond', 'double bond', 'triple bond', 'ionic bond'], 1]],
        w: ['Explain how soap removes oily dirt.', ['micelle', 'hydrophobic', 'hydrophilic', 'water'], 'A soap molecule has a long hydrophobic (water-hating) tail and an ionic hydrophilic (water-loving) head. In water, the tails dissolve in the oily dirt and the heads stay outside, forming micelles. Rinsing water carries the micelles, and the dirt, away.'],
        iq: [[2, 'What is catenation?', 'The ability of carbon atoms to bond with other carbon atoms to form long chains, branched chains and rings.'], [3, 'Write the next two members of the homologous series of methane and state how they differ.', 'Ethane C₂H₆ and propane C₃H₈. Each member differs from the next by a –CH₂– unit (14 u in mass).']] },
    ],
    Maths: [
      { id: 'ma-graphs', t: 'Linear Graphs: y = mx + c', c: 9, lab: 'graphs', s: 'A linear equation in two variables makes a straight line on a graph. m is the slope (steepness) and c is where the line cuts the y-axis.', p: ['Slope m = rise ÷ run = (y₂ − y₁) ÷ (x₂ − x₁).', 'm > 0: line rises to the right; m < 0: it falls; m = 0: horizontal.', 'c is the y-intercept: the line passes through (0, c).', 'Two lines with the same slope are parallel.'],
        q: [['In y = 3x + 2, the slope is…', ['2', '3', '5', '1'], 1], ['In y = 3x + 2, the line cuts the y-axis at…', ['(0, 3)', '(0, 2)', '(2, 0)', '(3, 0)'], 1], ['A line with slope 0 is…', ['vertical', 'horizontal', 'diagonal', 'curved'], 1], ['Slope through (1, 2) and (3, 6) is…', ['2', '4', '1', '3'], 0]],
        w: ['Find the slope and y-intercept of 2y = 4x − 6 and say whether the line rises or falls.', ['y = 2x − 3', 'slope 2', 'intercept −3', 'rises'], 'Divide by 2: y = 2x − 3. The slope is 2 and the y-intercept is −3, so the line passes through (0, −3). The slope is positive, so the line rises from left to right.'],
        iq: [[2, 'Find the slope of the line joining (2, 3) and (6, 11).', 'm = (11 − 3) ÷ (6 − 2) = 8 ÷ 4 = 2.'], [3, 'Draw y = x + 1 using a table of values and find where it cuts the axes.', 'Points (0, 1), (1, 2), (2, 3). It cuts the y-axis at (0, 1) and the x-axis at (−1, 0).']] },
      { id: 'ma-trig', t: 'Introduction to Trigonometry', c: 10, lab: null, s: 'Trigonometry links the angles of a right-angled triangle to the ratios of its sides.', p: ['sin θ = opposite ÷ hypotenuse; cos θ = adjacent ÷ hypotenuse; tan θ = opposite ÷ adjacent.', 'Memory trick: SOH CAH TOA.', 'sin²θ + cos²θ = 1.', 'Standard values: sin 30° = ½, cos 60° = ½, tan 45° = 1, sin 90° = 1, cos 0° = 1.'],
        q: [['tan θ = ?', ['opposite/hypotenuse', 'adjacent/hypotenuse', 'opposite/adjacent', 'adjacent/opposite'], 2], ['sin 30° = ?', ['1', '½', '√3/2', '0'], 1], ['sin²θ + cos²θ = ?', ['0', '2', '1', 'tan θ'], 2], ['tan 45° = ?', ['0', '1', '√3', '½'], 1]],
        w: ['In a right triangle, the side opposite angle A is 3 and the hypotenuse is 5. Find sin A, cos A and tan A.', ['adjacent 4', 'sin A = 3/5', 'cos A = 4/5', 'tan A = 3/4'], 'By Pythagoras, adjacent = √(5² − 3²) = 4. So sin A = 3/5, cos A = 4/5 and tan A = 3/4.'],
        iq: [[1, 'Write the value of cos 60°.', '½'], [3, 'Prove that (sin θ + cos θ)² = 1 + 2 sin θ cos θ.', '(sin θ + cos θ)² = sin²θ + cos²θ + 2 sin θ cos θ = 1 + 2 sin θ cos θ, using sin²θ + cos²θ = 1.']] },
      { id: 'ma-stats', t: 'Statistics: Mean, Median and Mode', c: 9, lab: null, s: 'Mean, median and mode are three ways to find the centre (average) of a set of data.', p: ['Mean = sum of values ÷ number of values.', 'Median = the middle value after arranging in order (for an even count, the average of the two middle values).', 'Mode = the value that occurs most often.', 'Empirical relation: Mode = 3 Median − 2 Mean.'],
        q: [['Mean of 2, 4, 6 is…', ['4', '6', '12', '3'], 0], ['Median of 3, 1, 7, 5, 9 is…', ['7', '5', '3', '9'], 1], ['Mode of 2, 3, 3, 4, 5 is…', ['2', '3', '4', '5'], 1], ['Median of 2, 4, 6, 8 is…', ['4', '5', '6', '20'], 1]],
        w: ['Marks of 7 students are 45, 60, 52, 60, 38, 70, 60. Find the mean, median and mode.', ['mean 55', 'median 60', 'mode 60', 'arrange'], 'Sum = 385, so mean = 385 ÷ 7 = 55. In order: 38, 45, 52, 60, 60, 60, 70, so the median (4th value) is 60. 60 occurs most often, so the mode is 60.'],
        iq: [[1, 'Find the mode of 4, 6, 4, 9, 4, 6.', '4'], [2, 'If mean = 20 and median = 22, find the mode using the empirical relation.', 'Mode = 3 × 22 − 2 × 20 = 66 − 40 = 26.']] },
      { id: 'ma-identities', t: 'Algebraic Identities', c: 8, lab: null, s: 'An identity is an equation that is true for every value of the variables. Identities make multiplication and factorisation quick.', p: ['(a + b)² = a² + 2ab + b²', '(a − b)² = a² − 2ab + b²', '(a + b)(a − b) = a² − b²', '(x + a)(x + b) = x² + (a + b)x + ab'],
        q: [['(a + b)² = ?', ['a² + b²', 'a² + 2ab + b²', 'a² − 2ab + b²', '2a + 2b'], 1], ['(a + b)(a − b) = ?', ['a² + b²', 'a² − b²', '(a − b)²', '2ab'], 1], ['102² using an identity = ?', ['10404', '10204', '10004', '10044'], 0], ['(x + 2)(x + 3) = ?', ['x² + 5x + 6', 'x² + 6x + 5', 'x² + 6', 'x² + 5'], 0]],
        w: ['Use an identity to find 99 × 101 without long multiplication.', ['(100 − 1)(100 + 1)', 'a² − b²', '10000 − 1', '9999'], '99 × 101 = (100 − 1)(100 + 1) = 100² − 1² = 10000 − 1 = 9999, using (a − b)(a + b) = a² − b².'],
        iq: [[2, 'Expand (2x − 3y)².', '4x² − 12xy + 9y²'], [2, 'Factorise 49a² − 16b².', '(7a + 4b)(7a − 4b)']] },
    ],
    'Social Science': [
      { id: 'ss-earth', t: 'Earth\'s Interior, Volcanoes and Earthquakes', c: 7, lab: 'earth', s: 'The Earth has three main layers: crust, mantle and core. Movements of the plates of the crust cause earthquakes and volcanoes.', p: ['Crust: thinnest layer; continental crust (SiAl) and oceanic crust (SiMa).', 'Mantle: about 2,900 km thick; molten rock (magma) moves slowly in the upper mantle.', 'Core: outer core liquid, inner core solid; mainly nickel and iron (NiFe).', 'Earthquakes are measured on the Richter scale with a seismograph. Magma that reaches the surface is called lava.'],
        q: [['The innermost layer of the Earth is the…', ['crust', 'mantle', 'core', 'lithosphere'], 2], ['The core is mainly made of…', ['silica and alumina', 'nickel and iron', 'water', 'carbon'], 1], ['Earthquakes are recorded on a…', ['barometer', 'seismograph', 'thermometer', 'odometer'], 1], ['Magma that comes out of a volcano is called…', ['lava', 'ash', 'crust', 'sediment'], 0]],
        w: ['Describe the three layers of the Earth.', ['crust', 'mantle', 'core', 'nickel', 'iron'], 'The crust is the thin outer layer we live on (thicker under continents, thinner under oceans). Below it is the mantle, about 2,900 km thick, with hot molten magma in its upper part. At the centre is the core, made mainly of nickel and iron; the outer core is liquid and the inner core is solid.'],
        iq: [[1, 'What is the epicentre of an earthquake?', 'The point on the Earth\'s surface directly above the focus where the earthquake starts.'], [3, 'Write any three safety steps to follow during an earthquake.', 'Drop, cover and hold on under a strong table; stay away from windows and heavy furniture; if outdoors, move to an open area away from buildings, trees and power lines.']] },
      { id: 'ss-french', t: 'The French Revolution', c: 9, lab: null, s: 'The French Revolution (1789) ended absolute monarchy in France and spread the ideas of liberty, equality and fraternity.', p: ['Causes: a costly monarchy, heavy taxes on the Third Estate, food shortages and ideas of philosophers like Rousseau and Montesquieu.', '14 July 1789: storming of the Bastille.', 'The Declaration of the Rights of Man and Citizen (1789).', 'France became a republic in 1792; Napoleon later became emperor in 1804.'],
        q: [['The French Revolution began in…', ['1776', '1789', '1857', '1917'], 1], ['The Bastille was a…', ['palace', 'prison (fortress)', 'church', 'market'], 1], ['The slogan of the Revolution was…', ['Peace, land, bread', 'Liberty, equality, fraternity', 'Do or die', 'Unity in diversity'], 1], ['Who wrote "The Social Contract"?', ['Montesquieu', 'Rousseau', 'Napoleon', 'Louis XVI'], 1]],
        w: ['Explain any three causes of the French Revolution.', ['Third Estate', 'taxes', 'philosophers', 'bread', 'monarchy'], 'First, the Third Estate (peasants, workers and the middle class) paid nearly all the taxes while the clergy and nobles paid little. Second, wars and the king\'s spending emptied the treasury and bread prices rose sharply, causing hunger. Third, philosophers like Rousseau and Montesquieu spread ideas of equal rights and limited government.'],
        iq: [[1, 'When was the Bastille stormed?', '14 July 1789.'], [3, 'What were the three estates in French society?', 'First Estate: clergy. Second Estate: nobility. Third Estate: everyone else, including big businessmen, merchants, lawyers, peasants, artisans and labourers, who paid most of the taxes.']] },
      { id: 'ss-federalism', t: 'Federalism', c: 10, lab: null, s: 'Federalism is a system where power is divided between a central authority and its constituent units, such as states.', p: ['India has three lists: Union List (defence, foreign affairs, banking), State List (police, agriculture, trade within the state) and Concurrent List (education, forests, marriage).', 'Residuary subjects (like computer software) go to the Union government.', 'The 1992 amendment made local government (panchayats and municipalities) the third tier.', 'Courts settle disputes between the levels of government.'],
        q: [['Defence is in the…', ['State List', 'Union List', 'Concurrent List', 'Residuary List'], 1], ['Education is in the…', ['Union List', 'State List', 'Concurrent List', 'no list'], 2], ['Police is in the…', ['Union List', 'State List', 'Concurrent List', 'Residuary'], 1], ['The third tier of government is…', ['the Supreme Court', 'local government', 'the President', 'the Rajya Sabha'], 1]],
        w: ['Explain the three-fold distribution of legislative powers in India.', ['Union List', 'State List', 'Concurrent List', 'residuary'], 'The Constitution divides law-making power into three lists. The Union List has subjects of national importance like defence and banking, on which only Parliament makes laws. The State List has local subjects like police and agriculture for state legislatures. The Concurrent List, like education, is shared; if laws conflict, the Union law prevails. Residuary subjects go to the Union.'],
        iq: [[1, 'Give one example of a residuary subject.', 'Computer software.'], [3, 'Write three features of federalism.', 'Two or more levels of government; each level has its own powers written in the Constitution; the courts can settle disputes; changing the basic division of powers needs the consent of both levels.']] },
    ],
    Computers: [
      { id: 'co-sorting', t: 'Algorithms and Sorting', c: 9, lab: 'sorting', s: 'An algorithm is a finite, step-by-step set of instructions to solve a problem. Sorting algorithms arrange data in order.', p: ['Good algorithms are clear, finite and give the correct output.', 'Bubble sort repeatedly swaps neighbouring items that are in the wrong order.', 'Selection sort picks the smallest remaining item and places it next.', 'Flowchart symbols: oval (start/end), parallelogram (input/output), rectangle (process), diamond (decision).'],
        q: [['An algorithm must be…', ['endless', 'finite and clear', 'random', 'written only in English'], 1], ['The diamond symbol in a flowchart means…', ['start', 'process', 'decision', 'output'], 2], ['Bubble sort compares…', ['random items', 'neighbouring items', 'only the first item', 'nothing'], 1], ['Sorting 5, 2, 8 in ascending order gives…', ['8, 5, 2', '2, 5, 8', '5, 2, 8', '2, 8, 5'], 1]],
        w: ['Write an algorithm to find the largest of three numbers A, B and C.', ['input', 'compare', 'if', 'print', 'stop'], 'Step 1: Start. Step 2: Input A, B, C. Step 3: Set MAX = A. Step 4: If B > MAX, set MAX = B. Step 5: If C > MAX, set MAX = C. Step 6: Print MAX. Step 7: Stop.'],
        iq: [[1, 'What does the parallelogram symbol show in a flowchart?', 'Input or output.'], [3, 'Show the passes of bubble sort on 4, 3, 1.', 'Pass 1: 3, 4, 1 → 3, 1, 4. Pass 2: 1, 3, 4. The list is sorted: 1, 3, 4.']] },
      { id: 'co-python', t: 'Python Basics', c: 9, lab: null, s: 'Python is an easy, high-level programming language. Programs use variables, data types, operators, conditions and loops.', p: ['print("Hello") shows output; input() reads from the keyboard.', 'Data types: int, float, str, bool, list.', 'if / elif / else make decisions; indentation matters in Python.', 'for and while repeat code; range(1, 6) gives 1 to 5.'],
        q: [['Which shows output in Python?', ['input()', 'print()', 'show()', 'echo'], 1], ['Type of 3.5 is…', ['int', 'float', 'str', 'bool'], 1], ['range(1, 4) gives…', ['1, 2, 3, 4', '1, 2, 3', '0, 1, 2, 3', '4'], 1], ['In Python, blocks of code are shown by…', ['brackets { }', 'indentation', 'semicolons', 'END'], 1]],
        w: ['Write a Python program to print the multiplication table of 7 (7 × 1 to 7 × 10).', ['for', 'range(1, 11)', 'print', '7 * i'], 'for i in range(1, 11):\n    print(7, "x", i, "=", 7 * i)'],
        iq: [[1, 'What is the output of print(10 // 3)?', '3 (floor division).'], [2, 'Write a Python program to check whether a number is even or odd.', 'n = int(input())\nif n % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")']] },
      { id: 'co-sheets', t: 'Spreadsheets', c: 8, lab: null, s: 'A spreadsheet arranges data in rows and columns of cells and can calculate with formulas.', p: ['A cell address joins column letter and row number, e.g. B3.', 'Formulas start with =, e.g. =A1+B1 or =SUM(A1:A10).', 'Useful functions: SUM, AVERAGE, MAX, MIN, COUNT.', 'Charts (bar, pie, line) show data visually.'],
        q: [['Every formula starts with…', ['+', '=', '#', '@'], 1], ['=SUM(A1:A3) adds…', ['A1 and A3 only', 'A1, A2 and A3', 'all of column A', 'nothing'], 1], ['C5 means column… row…', ['5, C', 'C, 5', 'row C', 'none'], 1], ['To find the highest value use…', ['MIN', 'MAX', 'COUNT', 'AVERAGE'], 1]],
        w: ['Marks are in B2 to B6. Write formulas for the total, the average and the highest mark.', ['=SUM(B2:B6)', '=AVERAGE(B2:B6)', '=MAX(B2:B6)'], 'Total: =SUM(B2:B6). Average: =AVERAGE(B2:B6). Highest: =MAX(B2:B6).'],
        iq: [[1, 'What is a cell?', 'The box where a row and a column meet in a spreadsheet.'], [2, 'Name any four spreadsheet functions.', 'SUM, AVERAGE, MAX, MIN (also COUNT).']] },
    ],
    EVS: [
      { id: 'ev-water', t: 'The Water Cycle', c: 5, lab: 'watercycle', s: 'Water keeps moving between the land, the sea and the sky. This never-ending movement is the water cycle.', p: ['Evaporation: the Sun heats water and it turns into water vapour.', 'Condensation: vapour cools high up and forms tiny droplets: clouds.', 'Precipitation: droplets join and fall as rain, snow or hail.', 'Collection: water flows into rivers, lakes, seas and soaks into the ground (groundwater).'],
        q: [['Water turning into vapour is…', ['condensation', 'evaporation', 'precipitation', 'freezing'], 1], ['Clouds form by…', ['evaporation', 'condensation', 'melting', 'boiling'], 1], ['Rain, snow and hail are…', ['precipitation', 'evaporation', 'collection', 'transpiration'], 0], ['The main source of heat for the water cycle is…', ['the Moon', 'the Sun', 'fire', 'wind'], 1]],
        w: ['Explain the water cycle in four steps.', ['evaporation', 'condensation', 'precipitation', 'collection'], 'The Sun heats water in seas and rivers so it evaporates into vapour. The vapour rises, cools and condenses into clouds. When the droplets get heavy they fall as precipitation (rain or snow). The water collects in rivers, seas and under the ground, and the cycle starts again.'],
        iq: [[1, 'What is transpiration?', 'The loss of water vapour from the leaves of plants.'], [2, 'Give two ways to save water at home.', 'Turn off the tap while brushing; reuse water used for washing vegetables to water plants (also fix leaking taps).']] },
      { id: 'ev-plants', t: 'Plants Around Us', c: 4, lab: 'flower', s: 'Plants make their own food using sunlight, water and air. Each part of a plant has a job.', p: ['Roots hold the plant and absorb water and minerals.', 'The stem carries water up and holds the leaves.', 'Leaves make food by photosynthesis using sunlight, water and carbon dioxide.', 'Flowers make seeds; fruits protect the seeds.'],
        q: [['Which part makes food?', ['root', 'stem', 'leaf', 'flower'], 2], ['Which part absorbs water?', ['root', 'leaf', 'flower', 'fruit'], 0], ['Plants give out which gas in sunlight?', ['carbon dioxide', 'oxygen', 'nitrogen', 'smoke'], 1], ['Seeds are found inside the…', ['root', 'fruit', 'leaf', 'stem'], 1]],
        w: ['Why are leaves called the kitchen of the plant?', ['photosynthesis', 'sunlight', 'chlorophyll', 'food'], 'Leaves make food for the whole plant by photosynthesis. Using the green pigment chlorophyll, they take sunlight, water and carbon dioxide and make sugar (food) and oxygen. Like a kitchen, they cook food for the plant.'],
        iq: [[1, 'Name the green pigment in leaves.', 'Chlorophyll.'], [2, 'Write two uses of plants to us.', 'They give us food (fruits, vegetables, grains) and oxygen to breathe (also wood, medicines and cotton).']] },
      { id: 'ev-waste', t: 'Waste and Clean Surroundings', c: 5, lab: null, s: 'Separating waste at home helps recycle it and keeps our surroundings clean and healthy.', p: ['Green bin: wet or biodegradable waste (peels, leftover food) can become compost.', 'Blue bin: dry waste (paper, plastic, metal, glass) can be recycled.', 'The 3 Rs: Reduce, Reuse, Recycle.', 'Burning plastic releases poisonous gases; never burn waste.'],
        q: [['Vegetable peels go in the…', ['blue bin', 'green bin', 'river', 'road'], 1], ['Which waste is biodegradable?', ['plastic bag', 'glass bottle', 'banana peel', 'tin can'], 2], ['The 3 Rs are…', ['Read, Write, Recite', 'Reduce, Reuse, Recycle', 'Run, Rest, Repeat', 'Rain, River, Road'], 1], ['Burning plastic is…', ['safe', 'harmful', 'useful', 'clean'], 1]],
        w: ['How can your family reduce waste at home? Give three ideas.', ['cloth bag', 'compost', 'reuse', 'separate'], 'We can carry cloth bags instead of plastic bags, turn kitchen waste into compost for plants, reuse jars and boxes for storage, and keep wet and dry waste in separate bins so dry waste can be recycled.'],
        iq: [[1, 'What is compost?', 'Manure made when wet (biodegradable) waste rots down.'], [2, 'Why should we not throw plastic in drains?', 'It blocks drains, causing flooding and mosquito breeding, and it does not rot.']] },
      { id: 'ev-food', t: 'Food and Nutrition', c: 5, lab: null, s: 'A balanced diet has the right amounts of all nutrients our body needs to grow and stay healthy.', p: ['Carbohydrates and fats give energy (rice, roti, ghee).', 'Proteins build the body (dal, milk, eggs, paneer).', 'Vitamins and minerals protect us from disease (fruits, vegetables).', 'Water and roughage (fibre) help digestion.', 'Lack of nutrients causes deficiency diseases, e.g. scurvy (vitamin C), anaemia (iron).'],
        q: [['Body-building food is rich in…', ['carbohydrates', 'proteins', 'fats', 'water'], 1], ['Lack of vitamin C causes…', ['scurvy', 'rickets', 'goitre', 'night blindness'], 0], ['Which gives quick energy?', ['rice', 'salt', 'water', 'pepper'], 0], ['Roughage helps in…', ['seeing', 'digestion', 'hearing', 'breathing'], 1]],
        w: ['What is a balanced diet? Plan one balanced lunch.', ['all nutrients', 'right amount', 'protein', 'vegetables'], 'A balanced diet gives all the nutrients — carbohydrates, proteins, fats, vitamins, minerals, roughage and water — in the right amounts. Example lunch: rice and roti (energy), dal (protein), a green vegetable and salad (vitamins, minerals, fibre), curd, and a glass of water.'],
        iq: [[1, 'Name the disease caused by lack of iodine.', 'Goitre.'], [2, 'Why is junk food harmful?', 'It has too much fat, salt and sugar and very few nutrients, which can lead to obesity and illness.']] },
    ],
    'Physical Education': [
      { id: 'pe-warmup', t: 'Warm-up and Stretching', c: 6, lab: null, s: 'A warm-up prepares the heart, lungs and muscles for exercise and reduces injuries. A cool-down helps the body recover.', p: ['Warm up for 5–10 minutes: light jogging, arm circles, jumping jacks.', 'Stretch after warming up; hold each stretch for 15–30 seconds, without bouncing.', 'Warm-up raises body temperature and heart rate gradually.', 'Cool down with slow walking and gentle stretches.'],
        q: [['A warm-up should last about…', ['1 minute', '5–10 minutes', '1 hour', '0 minutes'], 1], ['Hold a stretch for…', ['1 second', '15–30 seconds', '5 minutes', 'as long as it hurts'], 1], ['Warm-up mainly helps to…', ['prevent injury', 'sleep', 'eat more', 'lose interest'], 0], ['Bouncing during a stretch is…', ['recommended', 'not recommended', 'needed', 'a test'], 1]],
        w: ['Why is warming up important before a game?', ['heart rate', 'temperature', 'muscles', 'injury'], 'Warming up slowly raises the heart rate and body temperature, sends more blood and oxygen to the muscles, and makes muscles and joints more flexible. This improves performance and lowers the chance of strains and other injuries.'],
        iq: [[1, 'Give two examples of warm-up exercises.', 'Light jogging and arm circles (also jumping jacks, high knees).'], [2, 'What is the difference between warm-up and cool-down?', 'Warm-up prepares the body before exercise by raising heart rate; cool-down brings the heart rate back to normal slowly after exercise and reduces stiffness.']] },
      { id: 'pe-fitness', t: 'Components of Physical Fitness', c: 8, lab: null, s: 'Physical fitness means the body can do daily work and sports without getting too tired. It has several components.', p: ['Health-related: cardiovascular endurance, muscular strength, muscular endurance, flexibility, body composition.', 'Skill-related: speed, agility, balance, coordination, power, reaction time.', 'Tests: 600 m run (endurance), sit-and-reach (flexibility), 50 m dash (speed).', 'WHO advice for children: at least 60 minutes of moderate-to-vigorous activity a day.'],
        q: [['Sit-and-reach tests…', ['speed', 'flexibility', 'strength', 'balance'], 1], ['Children should be active for at least… a day.', ['10 minutes', '60 minutes', '5 hours', '0 minutes'], 1], ['Changing direction quickly is…', ['agility', 'flexibility', 'endurance', 'strength'], 0], ['A 50 m dash tests…', ['speed', 'balance', 'flexibility', 'reaction only'], 0]],
        w: ['List the five health-related components of fitness and one activity to improve each.', ['endurance', 'strength', 'flexibility', 'body composition'], 'Cardiovascular endurance – skipping or cycling; muscular strength – push-ups; muscular endurance – planks or squats; flexibility – yoga and stretching; body composition – regular activity and a balanced diet.'],
        iq: [[1, 'What is agility?', 'The ability to change body position or direction quickly and with control.'], [3, 'Explain three benefits of regular exercise.', 'It strengthens the heart and lungs, builds strong bones and muscles, and improves mood, sleep and concentration (also helps keep a healthy weight).']] },
      { id: 'pe-yoga', t: 'Yoga and Asanas', c: 7, lab: null, s: 'Yoga combines postures (asanas), breathing (pranayama) and relaxation to improve flexibility, balance and calm.', p: ['Tadasana (mountain pose) improves posture and balance.', 'Vrikshasana (tree pose) improves balance and concentration.', 'Bhujangasana (cobra pose) strengthens the back.', 'Practise on an empty stomach, on a mat, breathing slowly through the nose; never force a pose.', 'International Day of Yoga is on 21 June.'],
        q: [['Vrikshasana is the… pose.', ['cobra', 'tree', 'mountain', 'boat'], 1], ['Breathing exercises in yoga are called…', ['asanas', 'pranayama', 'mudras', 'kriyas'], 1], ['International Day of Yoga is on…', ['21 June', '5 September', '14 November', '26 January'], 0], ['Yoga is best practised…', ['after a heavy meal', 'on an empty stomach', 'while running', 'with loud music only'], 1]],
        w: ['Describe how to do Vrikshasana and write two benefits.', ['stand', 'sole', 'thigh', 'balance', 'namaste'], 'Stand straight. Shift weight to the left leg and place the right sole on the inner left thigh. Join the palms in namaste above the head, look at a fixed point and breathe slowly for 20–30 seconds. Repeat on the other side. It improves balance and concentration and strengthens the legs.'],
        iq: [[1, 'What is pranayama?', 'Controlled breathing exercises in yoga.'], [2, 'Write two precautions while doing yoga.', 'Practise on an empty stomach and do not force any posture (also use a mat and breathe through the nose).']] },
      { id: 'pe-firstaid', t: 'First Aid', c: 8, lab: null, s: 'First aid is the immediate help given to an injured or ill person before a doctor arrives.', p: ['Aims: preserve life, prevent the condition from getting worse, and help recovery.', 'Sprain: RICE — Rest, Ice, Compression, Elevation.', 'Bleeding: press firmly on the wound with a clean cloth and raise the limb.', 'Minor burns: cool under running water for 10–20 minutes; do not apply ice, butter or toothpaste.', 'In India, call 108 for an ambulance or 112 for any emergency.'],
        q: [['RICE stands for…', ['Run, Ice, Clean, Eat', 'Rest, Ice, Compression, Elevation', 'Rest, Inject, Cover, Exit', 'none'], 1], ['For a minor burn, cool it with…', ['ice', 'running water', 'butter', 'toothpaste'], 1], ['India\'s ambulance number is…', ['100', '108', '101', '1098'], 1], ['For bleeding, first…', ['wash with soap', 'press with a clean cloth', 'apply turmeric only', 'ignore it'], 1]],
        w: ['A classmate twists her ankle while playing. What first aid will you give?', ['RICE', 'rest', 'ice', 'compression', 'elevation', 'teacher'], 'Make her stop playing and rest. Tell the PE teacher. Apply an ice pack wrapped in a cloth for 15–20 minutes, wrap the ankle firmly with a crepe bandage (compression) and keep the foot raised on a pillow (elevation). If the pain or swelling is severe, take her to a doctor.'],
        iq: [[1, 'What is first aid?', 'Immediate help given to an injured or sick person before medical help arrives.'], [3, 'Write first aid for a minor burn.', 'Cool the burn under clean running water for 10–20 minutes, remove rings or tight items nearby, cover loosely with a clean cloth, and do not apply ice, butter or toothpaste. See a doctor if it is large or blistering.']] },
      { id: 'pe-games', t: 'Rules of Kabaddi and Kho-Kho', c: 7, lab: null, s: 'Kabaddi and kho-kho are traditional Indian team games that build speed, agility, strength and teamwork.', p: ['Kabaddi: 7 players on court per team; a raider must chant "kabaddi" on one breath while raiding.', 'A raider who touches a defender and returns to their half scores a point.', 'Kho-kho: 12 players per team, 9 take the field; the chasers sit in a row in alternate directions.', 'The active chaser gives a "kho" by touching a sitting teammate from behind and saying "kho".'],
        q: [['Kabaddi players on court per team:', ['5', '7', '9', '11'], 1], ['In kho-kho, players on the field per team:', ['7', '9', '11', '12'], 1], ['In kabaddi the raider must…', ['run silently', 'chant "kabaddi" on one breath', 'throw a ball', 'use a bat'], 1], ['A "kho" is given by…', ['shouting from far away', 'touching a sitting teammate from behind', 'throwing the ball', 'whistling'], 1]],
        w: ['Write any four rules of kabaddi.', ['7 players', 'raider', 'cant', 'touch', 'point'], 'Each team has 7 players on court. The raider enters the opponent\'s half chanting "kabaddi" continuously on one breath (the cant). If the raider touches a defender and returns safely, the team scores a point. If the defenders hold the raider until the breath breaks, the raider is out and the defenders score.'],
        iq: [[1, 'How many players does a kho-kho team have?', '12 (9 take the field).'], [2, 'Name two physical qualities developed by kabaddi.', 'Strength and agility (also speed, breath control and teamwork).']] },
    ],
  };
  Object.entries(NEW_TOPICS).forEach(([subj, list]) => list.forEach((x) => {
    if (STOPIC[x.id]) return;
    SUBJECTS[subj].topics.push([x.id, x.t, x.c, x.lab, x.s, x.p, x.q]);
    STOPIC[x.id] = { id: x.id, title: x.t, cls: x.c, lab: x.lab, summary: x.s, points: x.p, quiz: x.q, subject: subj, w: x.w, iq: x.iq };
  }));
  // writing tasks and important questions for the first set of topics
  const EXTRA = {
    'ph-force': { w: ['Why is it easier to cut with a sharp knife than a blunt one?', ['pressure', 'area', 'force'], 'Pressure = force ÷ area. A sharp knife has a very small cutting area, so the same force gives much larger pressure and it cuts easily.'], iq: [[1, 'Define pressure.', 'Force acting per unit area.'], [3, 'Give one example each of muscular, magnetic and gravitational force.', 'Pushing a door (muscular); a magnet pulling a nail (magnetic); a ball falling to the ground (gravitational).']] },
    'ph-friction': { w: ['Friction is a "necessary evil". Explain.', ['walk', 'grip', 'wear', 'heat'], 'Friction is necessary because it lets us walk, hold objects, write and brake vehicles. It is an evil because it wears out shoes and machine parts and wastes energy as heat. So we increase it where useful and reduce it with lubricants and ball bearings where harmful.'], iq: [[1, 'Name the smallest type of friction.', 'Rolling friction.'], [3, 'Give three ways to reduce friction.', 'Using lubricants like oil or grease; ball bearings; streamlined shapes (also polishing surfaces and using wheels).']] },
    'ph-current': { w: ['A bulb draws 0.5 A from a 6 V battery. Find its resistance and explain Ohm\'s law.', ['V = IR', '12 Ω', 'proportional'], 'Ohm\'s law says the current through a conductor is proportional to the potential difference across it at constant temperature: V = IR. So R = V ÷ I = 6 ÷ 0.5 = 12 Ω.'], iq: [[1, 'What is the SI unit of current?', 'Ampere (A).'], [3, 'Three 2 Ω resistors are connected in series and then in parallel. Find the total resistance each time.', 'Series: 2 + 2 + 2 = 6 Ω. Parallel: 1/R = 1/2 + 1/2 + 1/2 = 3/2, so R = 2/3 Ω ≈ 0.67 Ω.']] },
    'ph-magnets': { w: ['How would you find out whether an object is magnetic?', ['magnet', 'attract', 'iron'], 'Bring a magnet close to the object. If the object is attracted and sticks to the magnet, it is magnetic (made of iron, nickel, cobalt or steel). If nothing happens, it is non-magnetic.'], iq: [[1, 'Name two magnetic materials.', 'Iron and nickel (also cobalt, steel).'], [2, 'Why should magnets be kept with keepers?', 'Keepers (soft iron pieces) across the poles stop magnets from slowly losing their magnetism.']] },
    'ph-motion': { w: ['A car speeds up from 10 m/s to 30 m/s in 5 s. Find its acceleration and the distance covered.', ['a = (v − u)/t', '4 m/s²', '100 m'], 'a = (30 − 10) ÷ 5 = 4 m/s². Distance s = ut + ½at² = 10 × 5 + ½ × 4 × 25 = 50 + 50 = 100 m.'], iq: [[1, 'What is uniform motion?', 'Motion in which an object covers equal distances in equal intervals of time.'], [3, 'Write the three equations of motion.', 'v = u + at; s = ut + ½at²; v² = u² + 2as.']] },
    'ch-acids': { w: ['Explain neutralisation with an example and one use in daily life.', ['acid', 'base', 'salt', 'water'], 'Neutralisation is the reaction of an acid with a base to give salt and water, e.g. HCl + NaOH → NaCl + H₂O. Example in daily life: an antacid (a base like magnesium hydroxide) neutralises extra acid in the stomach.'], iq: [[1, 'Name the acid in vinegar.', 'Acetic (ethanoic) acid.'], [3, 'How is the pH of a solution changed when an acid is added slowly to a base?', 'The pH starts high (basic), falls towards 7 as the base is neutralised, and goes below 7 once there is extra acid.']] },
    'ch-reactions': { w: ['What happens when an iron nail is kept in copper sulphate solution? Write the equation.', ['displacement', 'blue', 'green', 'brown'], 'Iron is more reactive than copper, so it displaces copper from the solution: Fe + CuSO₄ → FeSO₄ + Cu. The blue colour fades to pale green and a reddish-brown coat of copper forms on the nail.'], iq: [[1, 'Balance: H₂ + O₂ → H₂O', '2H₂ + O₂ → 2H₂O'], [3, 'Name the type of each reaction: (a) CaCO₃ → CaO + CO₂ (b) C + O₂ → CO₂ (c) Zn + CuSO₄ → ZnSO₄ + Cu', '(a) decomposition (b) combination (c) displacement.']] },
    'ch-metals': { w: ['Why are metals used to make cooking pans and electric wires?', ['conductor', 'heat', 'electricity', 'malleable', 'ductile'], 'Metals are good conductors of heat, so pans heat food quickly, and they are malleable so they can be shaped. Metals like copper are good conductors of electricity and ductile, so they can be drawn into wires.'], iq: [[1, 'Name a metal that is liquid at room temperature.', 'Mercury.'], [3, 'Why does copper not react with dilute HCl but zinc does?', 'Zinc is above hydrogen in the reactivity series, so it displaces hydrogen from the acid. Copper is below hydrogen, so it cannot.']] },
    'ch-changes': { w: ['Is rusting a physical or chemical change? How can it be prevented?', ['chemical', 'oxygen', 'water', 'paint', 'galvanising'], 'Rusting is a chemical change because a new substance, iron oxide (rust), forms when iron reacts with oxygen and water. It can be prevented by painting, oiling or greasing, or galvanising (coating with zinc).'], iq: [[1, 'Is melting of ice a physical or chemical change?', 'Physical change.'], [2, 'What is crystallisation?', 'A physical change in which pure crystals of a substance are obtained from its solution.']] },
    'ch-atoms': { w: ['Calculate the molar mass of H₂SO₄ (H = 1, S = 32, O = 16).', ['2 + 32 + 64', '98', 'g/mol'], 'Molar mass = 2 × 1 + 32 + 4 × 16 = 2 + 32 + 64 = 98 g/mol.'], iq: [[1, 'What is an atom?', 'The smallest particle of an element that can take part in a chemical reaction.'], [2, 'Write the formula of calcium oxide and sodium chloride.', 'CaO and NaCl.']] },
    'ma-mensuration': { w: ['A cylindrical tank has radius 7 m and height 10 m. Find its volume (π = 22/7).', ['πr²h', '22/7 × 49 × 10', '1540'], 'V = πr²h = 22/7 × 7 × 7 × 10 = 22 × 7 × 10 = 1540 m³.'], iq: [[1, 'Write the formula for the volume of a cone.', 'V = ⅓πr²h.'], [3, 'Find the total surface area of a cube of side 5 cm.', 'TSA = 6a² = 6 × 25 = 150 cm².']] },
    'ma-solids': { w: ['Verify Euler\'s formula for a triangular prism.', ['F = 5', 'V = 6', 'E = 9', '5 + 6 − 9 = 2'], 'A triangular prism has F = 5 faces, V = 6 vertices and E = 9 edges. F + V − E = 5 + 6 − 9 = 2. Euler\'s formula is verified.'], iq: [[1, 'How many faces does a cuboid have?', '6.'], [2, 'Can a polyhedron have 10 faces, 20 edges and 15 vertices?', 'F + V − E = 10 + 15 − 20 = 5 ≠ 2, so no.']] },
    'ma-pythagoras': { w: ['A ladder 10 m long reaches a window 8 m high. How far is its foot from the wall?', ['10² = 8² + x²', '100 − 64', '36', '6 m'], '10² = 8² + x², so x² = 100 − 64 = 36 and x = 6 m.'], iq: [[1, 'State Pythagoras theorem.', 'In a right-angled triangle, hypotenuse² = base² + perpendicular².'], [3, 'Check if 7, 24, 25 form a right triangle.', '7² + 24² = 49 + 576 = 625 = 25². Yes, it is a right triangle.']] },
    'ma-linear': { w: ['The sum of two numbers is 45 and one is twice the other. Find them.', ['x + 2x = 45', '3x = 45', '15', '30'], 'Let the numbers be x and 2x. x + 2x = 45, so 3x = 45 and x = 15. The numbers are 15 and 30.'], iq: [[1, 'Solve 5x = 35.', 'x = 7.'], [3, 'Solve (x − 3)/2 = 4 and check.', 'x − 3 = 8, so x = 11. Check: (11 − 3)/2 = 4 ✓.']] },
    'ma-probability': { w: ['A bag has 3 red and 5 blue balls. What is the probability of picking a red ball?', ['total 8', 'favourable 3', '3/8'], 'Total balls = 3 + 5 = 8. Favourable outcomes = 3. P(red) = 3/8.'], iq: [[1, 'What is the probability of a sure event?', '1.'], [3, 'Two coins are tossed. Find the probability of getting at least one head.', 'Outcomes: HH, HT, TH, TT. At least one head: 3. P = 3/4.']] },
    'ss-globe': { w: ['Why does India have one standard time, and how is it calculated?', ['82½°E', '5 h 30 min', '15°'], 'India stretches about 30° of longitude, giving a 2-hour difference in local time from Gujarat to Arunachal Pradesh. To avoid confusion, the local time of 82½°E is used for the whole country. 82½ ÷ 15 = 5.5, so IST is 5 hours 30 minutes ahead of GMT.'], iq: [[1, 'What is the latitude of the Tropic of Cancer?', '23½° N.'], [3, 'What are the heat zones of the Earth?', 'Torrid zone between the tropics, temperate zones between the tropics and the polar circles, and frigid zones near the poles.']] },
    'ss-motions': { w: ['Why do we have seasons?', ['tilt', '23½°', 'revolution', 'direct rays'], 'The Earth\'s axis is tilted 23½° and the Earth revolves around the Sun. So for part of the year one hemisphere leans towards the Sun and gets more direct rays and longer days (summer), while the other gets slanting rays and shorter days (winter).'], iq: [[1, 'What is the circle of illumination?', 'The imaginary line that divides the day side and the night side of the Earth.'], [3, 'What happens on 21 June?', 'The Sun is overhead at the Tropic of Cancer; the Northern Hemisphere has its longest day (summer solstice), and the Southern Hemisphere has winter.']] },
    'ss-india': { w: ['Explain India\'s location and its importance.', ['Northern Hemisphere', 'Indian Ocean', 'trade', 'Tropic of Cancer'], 'India lies in the Northern Hemisphere between 8°4′N and 37°6′N, and the Tropic of Cancer passes through the middle. It is at the centre of the Indian Ocean, between East and West Asia, which has helped trade and cultural contact for centuries.'], iq: [[1, 'Name the southernmost point of India.', 'Indira Point (in the Andaman and Nicobar Islands).'], [2, 'Which country shares the longest land border with India?', 'Bangladesh.']] },
    'ss-constitution': { w: ['Why do we need a constitution?', ['rules', 'rights', 'government', 'limits'], 'A constitution sets the basic rules of the country. It decides how the government is formed and what powers it has, limits those powers to prevent misuse, and protects citizens\' rights.'], iq: [[1, 'Who is called the Father of the Indian Constitution?', 'Dr B. R. Ambedkar.'], [3, 'Name any three Fundamental Rights.', 'Right to Equality, Right to Freedom, Right against Exploitation (also freedom of religion, cultural and educational rights, constitutional remedies).']] },
    'ss-resources': { w: ['Why is resource planning important in India?', ['diversity', 'uneven', 'sustainable', 'future'], 'India\'s resources are unevenly spread: some states are rich in minerals but short of water, others the opposite. Planning helps use resources wisely, balance regions, avoid waste and keep them for future generations (sustainable development).'], iq: [[1, 'Give one example of a non-renewable resource.', 'Coal (or petroleum).'], [3, 'Name three types of soil in India and one crop each.', 'Alluvial – wheat and rice; black – cotton; red – millets (and pulses).']] },
    'co-parts': { w: ['Explain the IPO cycle with an example.', ['input', 'process', 'output', 'storage'], 'IPO means Input–Process–Output. Typing 5 + 3 on the keyboard is input, the CPU calculating 8 is processing, and the answer on the monitor is output. The result can also be saved in storage.'], iq: [[1, 'Name two input devices.', 'Keyboard and mouse.'], [2, 'What does the Control Unit do?', 'It directs and coordinates all the parts of the computer, telling them what to do and when.']] },
    'co-memory': { w: ['Differentiate between RAM and ROM.', ['volatile', 'non-volatile', 'read', 'write'], 'RAM is volatile (it loses data when power goes off) and can be read and written; it holds programs in use. ROM is non-volatile and mostly read-only; it holds start-up instructions (firmware).'], iq: [[1, '1 GB = ? MB', '1024 MB.'], [2, 'Name two secondary storage devices.', 'Hard disk and SSD (also pen drive, memory card).']] },
    'co-binary': { w: ['Convert decimal 13 to binary showing your working.', ['13 ÷ 2', 'remainder', '1101'], '13 ÷ 2 = 6 r1; 6 ÷ 2 = 3 r0; 3 ÷ 2 = 1 r1; 1 ÷ 2 = 0 r1. Reading the remainders from bottom to top: 1101. So (13)₁₀ = (1101)₂.'], iq: [[1, 'Convert (111)₂ to decimal.', '7.'], [2, 'Why do computers use binary?', 'Electronic circuits have two stable states (on/off), which match the two binary digits 1 and 0.']] },
    'co-logic': { w: ['Draw the truth table of an AND gate and explain it.', ['A', 'B', 'Y', 'only when both'], 'A B → Y: 0 0 → 0; 0 1 → 0; 1 0 → 0; 1 1 → 1. The output is 1 only when both inputs are 1, like two switches in series.'], iq: [[1, 'Write the Boolean expression of an OR gate.', 'Y = A + B.'], [2, 'Why are NAND and NOR called universal gates?', 'Any other gate (AND, OR, NOT) can be built using only NAND gates or only NOR gates.']] },
    'co-safety': { w: ['Write five rules to stay safe online.', ['password', 'OTP', 'stranger', 'tell an adult', 'privacy'], 'Use strong, secret passwords; never share OTPs or bank details; do not accept requests from or meet online strangers; keep your profile private and think before posting; tell a parent or teacher about anything that feels wrong, and report cybercrime at cybercrime.gov.in or 1930.'], iq: [[1, 'What is phishing?', 'A trick to steal personal information through fake messages, emails or websites.'], [2, 'What is a strong password?', 'A long password mixing capital and small letters, numbers and symbols, with no personal details.']] },
  };
  Object.entries(EXTRA).forEach(([id, x]) => { if (STOPIC[id]) Object.assign(STOPIC[id], x); });

  /* ================= MORE 3D LABS ================= */
  const clearG = (g) => { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); g.clear(); };
  const seg2 = (K, a, b, r, m) => K.tube([a, b], r, m, 2);
  const near = (a, b, tol) => Math.abs(a - b) <= tol;

  /* ---------- PHYSICS: SIMPLE PENDULUM ---------- */
  defineLab({
    id: 'pendulum', subject: 'Physics', cls: 'Class 7–11', icon: '⏱️', title: 'Simple pendulum',
    intro: 'Swing a pendulum, let the lab count 10 oscillations, and discover what changes the time period and what does not.',
    notes: ['One oscillation is one complete to-and-fro swing. The time it takes is the time period T.', 'For small swings T = 2π√(L/g), with g = 9.8 m/s². T depends on the length L only.', 'The mass of the bob and a small change of amplitude do not change T.', 'A pendulum about 1 m long has a time period of about 2 s (a "seconds pendulum").'],
    view: { dist: 7.5, th: 0.4, ph: 1.35, target: [0, 1.7, 0] },
    steps: [
      { t: 'Measure the time period', hint: 'Press "Swing and measure". The lab times 10 oscillations.' },
      { t: 'Change only the mass and measure again', hint: 'Move the Mass slider, keep the length the same, then measure.' },
      { t: 'Change the length and measure again', hint: 'Move the Length slider, then measure.' },
      { t: 'Find the length for T = 2 s', hint: 'Type the length (m) that gives a 2-second pendulum, then Check.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, g = 9.8;
      E.scene.add(K.box(5, 0.1, 3, K.mat(0x30363f), [0, -0.05, 0]), K.box(0.12, 3.4, 0.12, K.mat(0x9aa3ad, { metalness: 0.7 }), [-1.6, 1.7, 0]), K.box(1.9, 0.1, 0.12, K.mat(0x9aa3ad, { metalness: 0.7 }), [-0.7, 3.35, 0]));
      const pivot = K.group(); pivot.position.set(0, 3.3, 0); E.scene.add(pivot);
      const str = K.cyl(0.008, 0.008, 1, K.mat(0xeeeeee)), bob = K.sph(0.15, K.mat(0xd4af37, { metalness: 0.9, roughness: 0.25 })); pivot.add(str, bob);
      api.part(bob, 'Bob', 'The heavy ball at the end. Its mass does not change the time period.', { off: [0.25, 0.2, 0] });
      const scale = K.group(); for (let a = -30; a <= 30; a += 5) { const r = a * Math.PI / 180; scale.add(K.box(0.012, a % 15 ? 0.06 : 0.12, 0.012, K.mat(0xffffff), [Math.sin(r) * 0.7, -Math.cos(r) * 0.7, 0], [0, 0, r])); } pivot.add(scale);
      let L = 1.0, m = 100, amp = 10, th = 0, w = 0, swinging = false, simT = 0, cross = [], last = 0, prev = 0; const runs = [];
      const place = () => { const len = L; str.scale.y = len; str.position.set(Math.sin(th) * len / 2, -Math.cos(th) * len / 2, 0); str.rotation.z = th; bob.position.set(Math.sin(th) * len, -Math.cos(th) * len, 0); bob.scale.setScalar(Math.cbrt(m / 100)); };
      const Tth = () => 2 * Math.PI * Math.sqrt(L / g);
      const show = (meas) => api.readout([['Length L', L.toFixed(2) + ' m'], ['Bob mass', m + ' g'], ['Amplitude', amp + '°'], ['T (formula)', Tth().toFixed(2) + ' s'], ['T measured', meas ? meas.toFixed(2) + ' s' : (swinging ? 'counting ' + Math.max(0, cross.length - 1) + '/10' : '–')], ['Time', simT.toFixed(1) + ' s']]);
      const start = () => { th = amp * Math.PI / 180; w = 0; simT = 0; cross = []; prev = th; swinging = true; api.say('Swinging. Counting 10 oscillations…'); };
      const finish = () => {
        swinging = false; const Tm = (cross[10] - cross[0]) / 10; const run = { L, m, T: Tm }; runs.push(run); show(Tm);
        api.obs('L = ' + L.toFixed(2) + ' m, m = ' + m + ' g → T = ' + Tm.toFixed(2) + ' s');
        if (!api.isDone(0)) api.done(0, 'Time period = time for 10 oscillations ÷ 10.');
        else if (!api.isDone(1) && runs.some((r) => r !== run && near(r.L, L, 0.001) && r.m !== m)) api.done(1, 'Changing the mass did not change T: ' + Tm.toFixed(2) + ' s both times.');
        if (api.isDone(0) && !api.isDone(2) && runs.some((r) => r !== run && !near(r.L, L, 0.001))) api.done(2, 'A longer pendulum swings more slowly: T grows with √L.');
      };
      const ans = h('input', { type: 'number', step: '0.01', placeholder: 'Length (m)', style: 'width:120px' });
      api.controls(api.slider('len', 'Length', 0.3, 2.5, 0.05, L, ' m', (v) => { L = v; if (!swinging) { th = 0; place(); show(); } }), api.slider('mass', 'Bob mass', 50, 500, 50, m, ' g', (v) => { m = v; place(); show(); }), api.slider('amp', 'Starting angle', 5, 25, 5, amp, '°', (v) => { amp = v; }),
        api.buttons([['Swing and measure', start, 'pri'], ['Stop', () => { swinging = false; th = 0; w = 0; place(); show(); }]]),
        h('div', { class: 'cx-row' }, ans, h('button', { class: 'cx-btn', type: 'button', text: 'Check', onclick: () => { const v = +ans.value; if (v >= 0.95 && v <= 1.04) api.done(3, 'L = gT²/4π² = 9.8 × 4 ÷ 39.5 ≈ 0.99 m: about 1 m gives T = 2 s.'); else api.say('Not quite. Use T = 2π√(L/g): L = g × T² ÷ (4π²). Try the slider to test your guess.'); } })));
      place(); show();
      return { update(dt) { if (!swinging) return; const n = 12, h2 = dt / n; for (let i = 0; i < n; i++) { w += -(g / L) * Math.sin(th) * h2; th += w * h2; simT += h2; if (prev < 0 && th >= 0) cross.push(simT); prev = th; } place(); if (cross.length >= 11) finish(); else if ((last += dt) > 0.2) { last = 0; show(); } } };
    },
  });

  /* ---------- PHYSICS: CONVEX LENS IMAGE FORMATION ---------- */
  defineLab({
    id: 'lens', subject: 'Physics', cls: 'Class 10', icon: '🔍', title: 'Convex lens: image formation',
    intro: 'Move a candle along an optical bench and watch two rays find the image. See when the image is real or virtual, bigger or smaller.',
    notes: ['Convex lens rules: a ray parallel to the axis passes through the focus F after refraction; a ray through the optical centre goes straight.', 'Object beyond 2F: image between F and 2F, real, inverted, diminished.', 'Object at 2F: image at 2F, real, inverted, same size.', 'Object between F and 2F: image beyond 2F, real, inverted, magnified.', 'Object at F: image at infinity. Object between F and the lens: virtual, erect, magnified (a magnifying glass).', 'Lens formula 1/v − 1/u = 1/f; magnification m = v/u.'],
    view: { dist: 9, th: 0, ph: 1.45, target: [0, 0.6, 0] },
    steps: [
      { t: 'Object beyond 2F', hint: 'Move the candle further than 2F.' },
      { t: 'Object exactly at 2F', hint: 'Place the candle at 2F (the image is the same size).' },
      { t: 'Object between F and 2F', hint: 'The image becomes magnified.' },
      { t: 'Object between F and the lens', hint: 'Now the lens works as a magnifying glass.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, S = 0.06;
      E.scene.add(K.box(8.4, 0.08, 0.4, K.mat(0x2b3140), [0, -0.04, 0]));
      E.scene.add(seg2(K, [-4.2, 0, 0], [4.2, 0, 0], 0.008, K.mat(0x8aa0c8)));
      const lens = K.sph(1, K.glass(0xbfe6ff, 0.35), [0, 0.0, 0], [0.12, 1.3, 1.3]); E.scene.add(lens); api.part(lens, 'Convex lens', 'Thicker in the middle. It converges (brings together) parallel rays at its focus.', { off: [0, 1.45, 0] });
      const marks = K.group(); E.scene.add(marks); const markLbl = [];
      const rays = K.group(); E.scene.add(rays);
      const flame = K.group(K.cyl(0.05, 0.05, 1, K.mat(0xf3efe6), [0, 0.5, 0]), K.cone(0.05, 0.16, K.glow(0xffa53a, 2.5), [0, 1.08, 0])); E.scene.add(flame); api.part(flame, 'Object (candle)', 'The object. Its distance from the lens is u (negative by sign convention).', { off: [0, 1.35, 0] });
      const imgM = K.mat(0xffa53a, { transparent: true, opacity: 0.9 }), img = K.group(K.cyl(0.05, 0.05, 1, imgM, [0, 0.5, 0]), K.cone(0.05, 0.16, K.glow(0xffa53a, 1.5), [0, 1.08, 0])); E.scene.add(img); const imgL = E.addLabel(img, 'Image', [0, 0.2, 0]);
      const screen = K.box(0.04, 2.6, 1.2, K.mat(0xf2f2f2, { roughness: 0.9 })); E.scene.add(screen); api.part(screen, 'Screen', 'A real image can be caught on a screen. A virtual image cannot.', { off: [0, 1.5, 0] });
      let f = 15, u = -45;
      const rayM = K.glow(0xffe36e, 1.2), virtM = new T.MeshBasicMaterial({ color: 0xffe36e, transparent: true, opacity: 0.35 });
      function draw() {
        clearG(marks); markLbl.forEach((l) => { l.el.remove(); E.labels.splice(E.labels.indexOf(l), 1); }); markLbl.length = 0;
        [[-2 * f, '2F'], [-f, 'F'], [f, 'F'], [2 * f, '2F']].forEach(([x, n]) => { const m = K.sph(0.05, K.glow(0x7c8cff, 2), [x * S, 0, 0]); marks.add(m); markLbl.push(E.addLabel(m, n, [0, -0.15, 0], 'pin')); });
        flame.position.x = u * S; const hO = 1.16;
        const v = Math.abs(u + f) < 0.01 ? Infinity : (u * f) / (u + f), mg = v === Infinity ? Infinity : v / u, real = v > 0;
        clearG(rays);
        const top = [u * S, hO, 0], P = [0, hO, 0], X = 4.2;
        rays.add(seg2(K, top, P, 0.012, rayM));
        const s1 = (0 - hO) / (f * S); rays.add(seg2(K, P, [X, hO + s1 * X, 0], 0.012, rayM));
        const s2 = hO / (u * S); rays.add(seg2(K, top, [X, s2 * X, 0], 0.012, rayM));
        let nature = 'at infinity';
        if (v !== Infinity) {
          const hI = mg * hO; img.visible = Math.abs(v * S) < 4.2 && Math.abs(hI) < 4.5; img.position.x = v * S; img.scale.y = mg; imgM.opacity = real ? 0.9 : 0.45;
          if (!real) { rays.add(seg2(K, P, [v * S, hI, 0], 0.008, virtM)); rays.add(seg2(K, [0, 0, 0], [v * S, hI, 0], 0.008, virtM)); }
          screen.visible = real && img.visible; screen.position.set(v * S + 0.03, 1.0 * Math.sign(mg) * -0, 0); screen.position.y = 0;
          nature = (real ? 'real, inverted' : 'virtual, erect') + ', ' + (Math.abs(Math.abs(mg) - 1) < 0.05 ? 'same size' : Math.abs(mg) > 1 ? 'magnified' : 'diminished');
          imgL.el.textContent = 'Image: ' + nature;
          api.readout([['u (object)', u + ' cm'], ['f', '+' + f + ' cm'], ['v (image)', (v > 0 ? '+' : '') + v.toFixed(1) + ' cm'], ['m = v/u', mg.toFixed(2)], ['Image', nature]]);
        } else { img.visible = false; screen.visible = false; api.readout([['u (object)', u + ' cm'], ['f', '+' + f + ' cm'], ['Image', 'at infinity (rays parallel)']]); }
        const d = -u;
        if (d > 2 * f + 0.5) api.done(0, 'Object beyond 2F → image between F and 2F: real, inverted, diminished (camera, eye).');
        else if (near(d, 2 * f, 0.5)) api.done(1, 'Object at 2F → image at 2F: real, inverted, same size.');
        else if (d > f + 0.5 && d < 2 * f) api.done(2, 'Object between F and 2F → image beyond 2F: real, inverted, magnified (projector).');
        else if (d < f - 0.5) api.done(3, 'Object between F and lens → virtual, erect, magnified image on the same side (magnifying glass).');
      }
      api.controls(api.slider('u', 'Object distance (cm from lens)', 5, 65, 1, 45, ' cm', (x) => { u = -x; draw(); }), api.slider('f', 'Focal length f', 10, 25, 1, f, ' cm', (x) => { f = x; draw(); }));
      draw();
      return {};
    },
  });

  /* ---------- CHEMISTRY: pH OF HOUSEHOLD LIQUIDS ---------- */
  const PH_COL = ['#d7191c', '#e8432a', '#f46d43', '#fdae61', '#fee08b', '#e6f598', '#a6d96a', '#66bd63', '#1a9850', '#3288bd', '#3f5fb5', '#5e4fa2', '#6a3d9a', '#542788', '#3f007d'];
  defineLab({
    id: 'ph', subject: 'Chemistry', cls: 'Class 7–10', icon: '🧪', title: 'pH of household liquids',
    intro: 'Add universal indicator to everyday liquids and read their pH from the colour. Then neutralise an acid.',
    safety: 'Never taste lab liquids. Bleach and drain cleaner are dangerous; adults only.',
    notes: ['Universal indicator is a mixture of indicators that shows a different colour for each pH.', 'Red/orange = strongly acidic, yellow = weakly acidic, green = neutral (pH 7), blue = weakly basic, violet = strongly basic.', 'Lemon juice ≈ 2, vinegar ≈ 3, milk ≈ 6.5, pure water = 7, baking soda solution ≈ 8.5, soap solution ≈ 10, milk of magnesia ≈ 10.5, washing soda ≈ 11.', 'A bee sting is acidic, so a mild base like baking soda soothes it. A wasp sting is basic, so vinegar is used.'],
    view: { dist: 11.5, th: 0.1, ph: 1.15, target: [0, 1.0, 0] },
    steps: [
      { t: 'Test lemon juice and soap solution', hint: 'Click a beaker to add 3 drops of universal indicator.' },
      { t: 'Test all 8 liquids', hint: 'Click every beaker.' },
      { t: 'Neutralise the vinegar', hint: 'Press "Add baking soda to vinegar" until it turns green.' },
      { t: 'Answer: what soothes a bee sting?', hint: 'Choose the right liquid below.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      E.scene.add(K.box(9, 0.2, 3, K.mat(0x2a2f38), [0, -0.1, 0]));
      const bar = K.plane(6, 0.4, new T.MeshBasicMaterial({ map: K.tex(1024, 64, (g, W, H) => { PH_COL.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * W / 15, 0, W / 15 + 1, H); g.fillStyle = '#fff'; g.font = 'bold 30px system-ui'; g.fillText(String(i), i * W / 15 + 18, 44); }); }) }), [0, 2.4, -1.2]); E.scene.add(bar);
      api.part(bar, 'pH colour chart', 'Compare the colour of each tested liquid with this chart: 0 is most acidic, 7 is neutral, 14 is most basic.', { off: [0, 0.35, 0] });
      const LIQ = [['Lemon juice', 2, 0xfff6b0], ['Vinegar', 3, 0xf6f0d8], ['Milk', 6.5, 0xfdfdf8], ['Pure water', 7, 0xe9f4ff], ['Baking soda solution', 8.5, 0xf2f6fa], ['Soap solution', 10, 0xf0eaff], ['Milk of magnesia (antacid)', 10.5, 0xfafafa], ['Washing soda solution', 11, 0xf4f8fa]];
      const tested = new Set(), items = LIQ.map(([n, p, c], i) => { const x = -3.5 + i; const g = K.group(K.cyl(0.32, 0.28, 0.9, K.glass(0xffffff, 0.2), [0, 0.45, 0], null, 24, true)); const lm = K.mat(c, { transparent: true, opacity: 0.85, roughness: 0.2 }); const liq = K.cyl(0.29, 0.26, 0.6, lm, [0, 0.32, 0]); g.add(liq); g.position.set(x, 0, 0.3); E.scene.add(g); api.part(g, n, 'Click to add universal indicator.', { off: [0, 1.15, 0] }); g.userData.click.info = 'Click to add universal indicator and read its pH.'; return { g, n, p, lm, x }; });
      const dropper = K.group(K.cyl(0.04, 0.02, 0.6, K.glass(0xffffff, 0.5), [0, 0, 0]), K.sph(0.08, K.mat(0x222222), [0, 0.35, 0])); dropper.position.set(0, 2, 1); E.scene.add(dropper);
      const colOf = (p) => new T.Color(PH_COL[Math.max(0, Math.min(14, Math.round(p)))]);
      let busy = false, vinP = 3; const queue = [];
      const test = (it) => {
        if (busy) { if (!queue.includes(it)) queue.push(it); return; } busy = true;
        const p0 = dropper.position.clone(); A(0.5, (k) => dropper.position.set(lerp(p0.x, it.x, k), lerp(p0.y, 1.3, k), lerp(p0.z, 0.3, k)), () => { const c0 = it.lm.color.clone(), c1 = colOf(it.p); A(0.8, (k) => { it.lm.color.copy(c0).lerp(c1, k); }, () => { busy = false; if (queue.length) { test(queue.shift()); return; } A(0.4, (k) => dropper.position.set(lerp(it.x, 0, k), lerp(1.3, 2, k), lerp(0.3, 1, k))); });
          tested.add(it.n); const kind = it.p < 7 ? 'acidic' : it.p > 7 ? 'basic' : 'neutral'; it.g.userData.label.el.textContent = it.n + ' · pH ' + it.p; api.obs(it.n + ': pH ' + it.p + ' (' + kind + ')');
          api.say(it.n + ' turned ' + (it.p < 4 ? 'red-orange' : it.p < 7 ? 'yellow' : it.p === 7 ? 'green' : it.p < 10 ? 'blue-green' : 'blue-violet') + ': pH ' + it.p + ', ' + kind + '.');
          if (tested.has('Lemon juice') && tested.has('Soap solution')) api.done(0, 'Lemon juice is acidic (pH 2); soap is basic (pH 10).');
          if (tested.size === LIQ.length) api.done(1, 'From most acidic to most basic: lemon juice, vinegar, milk, water, baking soda, soap, antacid, washing soda.');
        });
      };
      const quiz = h('div', { class: 'cx-row' }, ['Vinegar', 'Lemon juice', 'Baking soda solution', 'Pure water'].map((o) => h('button', { class: 'cx-btn', type: 'button', text: o, onclick: () => { if (o === 'Baking soda solution') api.done(3, 'A bee sting injects an acid (methanoic acid), so a mild base like baking soda neutralises it.'); else api.say('Think: a bee sting is acidic. What neutralises an acid?'); } })));
      api.controls(api.buttons([['Add baking soda to vinegar', () => { const it = items[1]; if (!tested.has('Vinegar')) { api.say('First test the vinegar with indicator.'); return; } vinP = Math.min(7, vinP + 1); it.p = vinP; it.lm.color.copy(colOf(vinP)); it.g.userData.label.el.textContent = 'Vinegar + soda · pH ' + vinP; api.say(vinP < 7 ? 'Fizz! CO₂ bubbles. pH is now ' + vinP + '. Keep adding.' : 'Green: pH 7. The acid is neutralised.'); if (vinP === 7) api.done(2, 'Acid + base → salt + water (+ CO₂ with baking soda). The indicator turned green at pH 7.'); }, 'pri']]), h('p', { class: 'cx-note', text: 'Bee sting question:' }), quiz);
      return { click(obj) { const it = items.find((x) => x.g === obj); if (it) { test(it); return true; } return false; } };
    },
  });

  /* ---------- MATHS: LINEAR GRAPHS ---------- */
  defineLab({
    id: 'graphs', subject: 'Maths', cls: 'Class 8–10', icon: '📈', title: 'Graph board: y = mx + c',
    intro: 'Change the slope m and intercept c and watch the line move on a 3D graph board. Match the target lines.',
    notes: ['y = mx + c: m is the slope (rise ÷ run), c is the y-intercept.', 'Positive slope rises to the right; negative slope falls; zero slope is horizontal.', 'Lines with the same slope are parallel. A line with c = 0 passes through the origin.'],
    view: { dist: 13, th: 0, ph: 1.5, target: [0, 0, 0] },
    steps: [
      { t: 'Make a line through the origin', hint: 'Set c = 0 (and any slope that is not 0).' },
      { t: 'Make a horizontal line', hint: 'Set m = 0.' },
      { t: 'Match the gold line y = 2x − 3', hint: 'Set m and c so your line covers the gold one.' },
      { t: 'Match the line through (0, 3) and (3, 0)', hint: 'Work out the slope from the two points first.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, N = 6;
      E.scene.add(K.box(13, 13, 0.1, K.mat(0x0f1a2e), [0, 0, -0.1]));
      const gm = K.mat(0x2b3a55), am = K.mat(0xdfe6ff);
      for (let i = -N; i <= N; i++) { E.scene.add(K.box(12, i ? 0.015 : 0.04, 0.02, i ? gm : am, [0, i, 0]), K.box(i ? 0.015 : 0.04, 12, 0.02, i ? gm : am, [i, 0, 0])); }
      const nums = K.tex(1024, 1024, (g, W) => { g.fillStyle = '#9fb0d6'; g.font = '26px system-ui'; for (let i = -N; i <= N; i++) { if (!i) continue; const p = (i + 6.5) / 13 * W; g.fillText(String(i), p - 8, W / 2 + 28); g.fillText(String(i), W / 2 + 8, W - p + 8); } g.fillText('x', W - 30, W / 2 - 10); g.fillText('y', W / 2 + 10, 26); });
      E.scene.add(K.plane(13, 13, new T.MeshBasicMaterial({ map: nums, transparent: true }), [0, 0, 0.03]));
      const lineM = K.glow(0x5ee6c8, 1.4), line = K.box(1, 0.06, 0.06, lineM); E.scene.add(line);
      const targetG = K.group(); E.scene.add(targetG);
      const ant = K.sph(0.15, K.glow(0xff6f91, 2)); E.scene.add(ant); const antL = E.addLabel(ant, '', [0, 0.3, 0], 'pin');
      let m = 1, c = 1, t = 0, target = null;
      const setTarget = (tm, tc) => { clearG(targetG); target = [tm, tc]; for (let x = -6; x < 6; x += 0.5) { const y1 = tm * x + tc, y2 = tm * (x + 0.3) + tc; if (Math.abs(y1) < 6 && Math.abs(y2) < 6) targetG.add(seg2(K, [x, y1, 0.02], [x + 0.3, y2, 0.02], 0.05, K.glow(0xffd54a, 1.6))); } };
      function draw() {
        const ang = Math.atan(m), len = 12 / Math.max(Math.abs(Math.cos(ang)), 0.15) * 1.1; line.scale.x = Math.min(len, 30); line.rotation.z = ang; line.position.set(0, c, 0.05);
        const rows = [-2, -1, 0, 1, 2].map((x) => [x, m * x + c]);
        api.readout([['Equation', 'y = ' + (m === 0 ? '' : (m === 1 ? '' : m === -1 ? '−' : m) + 'x') + (c ? (c > 0 && m !== 0 ? ' + ' : c < 0 ? ' − ' : '') + Math.abs(c) : m === 0 ? '0' : '')], ['Slope m', String(m)], ['y-intercept c', String(c)], ['Table', rows.map((r) => '(' + r[0] + ', ' + r[1] + ')').join(' ')]]);
        if (c === 0 && m !== 0) api.done(0, 'With c = 0 the line passes through the origin (0, 0): y = mx.');
        if (m === 0) api.done(1, 'With m = 0 the line is horizontal: y = c.');
        if (api.cur() === 2 && m === 2 && c === -3) { api.done(2, 'y = 2x − 3: slope 2 (up 2 for every 1 across), crossing the y-axis at −3.'); setTarget(-1, 3); }
        else if (api.cur() === 3 && m === -1 && c === 3) { api.done(3, 'Slope = (0 − 3) ÷ (3 − 0) = −1 and c = 3, so y = −x + 3.'); clearG(targetG); }
      }
      api.controls(api.slider('m', 'Slope m', -3, 3, 0.5, m, '', (v) => { m = v; draw(); }), api.slider('c', 'Intercept c', -4, 4, 1, c, '', (v) => { c = v; draw(); }));
      setTarget(2, -3); draw();
      return { update(dt) { t += dt * 0.5; const x = ((t % 2) / 2) * 10 - 5, y = m * x + c; ant.visible = Math.abs(y) < 6; ant.position.set(x, y, 0.15); antL.el.textContent = '(' + x.toFixed(1) + ', ' + y.toFixed(1) + ')'; if (api.cur() === 3 && target && target[0] === 2) setTarget(-1, 3); } };
    },
  });

  /* ---------- MATHS: PROBABILITY WITH DICE ---------- */
  defineLab({
    id: 'dice', subject: 'Maths', cls: 'Class 9–10', icon: '🎲', title: 'Probability with dice',
    intro: 'Roll dice hundreds of times and watch the 3D bar chart. See how experiment results get close to theory.',
    notes: ['Theoretical probability P(E) = favourable outcomes ÷ total outcomes.', 'For one fair die each face has probability 1/6 ≈ 0.167.', 'With two dice there are 36 outcomes. A sum of 7 can happen in 6 ways, so P(7) = 6/36 = 1/6, the most likely sum.', 'The more times you repeat an experiment, the closer the experimental probability gets to the theoretical value.'],
    view: { dist: 11, th: 0.3, ph: 1.2, target: [0, 1.4, 0] },
    steps: [
      { t: 'Roll one die 10 times', hint: 'Choose "1 die" and press Roll ×10.' },
      { t: 'Roll one die 1000 times', hint: 'Press Roll ×1000 and compare each bar with 1/6.' },
      { t: 'Roll two dice 1000 times', hint: 'Choose "2 dice (sum)" and roll ×1000. Which sum wins?' },
      { t: 'Find P(sum = 7)', hint: 'Type it as a fraction or decimal and press Check.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      E.scene.add(K.box(12, 0.1, 5, K.mat(0x1d4a35, { roughness: 0.9 }), [0, -0.05, 0]));
      const face = (n) => K.tex(128, 128, (g, W) => { g.fillStyle = '#fbfbfb'; g.fillRect(0, 0, W, W); g.fillStyle = '#c0202a'; const P = { 1: [[64, 64]], 2: [[34, 34], [94, 94]], 3: [[30, 30], [64, 64], [98, 98]], 4: [[34, 34], [94, 34], [34, 94], [94, 94]], 5: [[30, 30], [98, 30], [64, 64], [30, 98], [98, 98]], 6: [[34, 28], [94, 28], [34, 64], [94, 64], [34, 100], [94, 100]] }[n]; P.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); }); });
      const mats = [1, 6, 2, 5, 3, 4].map((n) => new T.MeshStandardMaterial({ map: face(n), roughness: 0.35 }));
      const mkDie = (x) => { const d = new T.Mesh(new T.BoxGeometry(0.7, 0.7, 0.7), mats); d.position.set(x, 0.35, 1.6); E.scene.add(d); return d; };
      const d1 = mkDie(-0.5), d2 = mkDie(0.5); d2.visible = false;
      const ROT = { 1: [0, 0, Math.PI / 2], 6: [0, 0, -Math.PI / 2], 2: [0, 0, 0], 5: [Math.PI, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0] };
      const bars = K.group(); E.scene.add(bars); const lbls = [];
      let two = false, counts = {}, total = 0;
      const theo = (s) => (two ? (6 - Math.abs(s - 7)) / 36 : 1 / 6);
      const keys = () => (two ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6]);
      function draw() {
        clearG(bars); lbls.forEach((l) => { l.el.remove(); E.labels.splice(E.labels.indexOf(l), 1); }); lbls.length = 0;
        const ks = keys(), w = 9 / ks.length;
        ks.forEach((k, i) => { const p = total ? (counts[k] || 0) / total : 0, hgt = Math.max(0.02, p * 12), x = -4.5 + w * (i + 0.5);
          const b = K.box(w * 0.7, hgt, 0.6, K.mat(k === 7 && two ? 0xffd54a : 0x5ee6c8, { roughness: 0.4 }), [x, hgt / 2, -1]); bars.add(b);
          const th = theo(k) * 12; bars.add(K.box(w * 0.85, 0.03, 0.7, K.glow(0xff6f91, 1.5), [x, th, -1]));
          const lab = K.group(); lab.position.set(x, 0, -0.55); bars.add(lab); lbls.push(E.addLabel(lab, String(k), [0, 0.05, 0], 'pin'));
          const top = K.group(); top.position.set(x, hgt, -1); bars.add(top); if (total) lbls.push(E.addLabel(top, (p * 100).toFixed(1) + '%', [0, 0.25, 0])); });
        const best = ks.reduce((a, b) => ((counts[b] || 0) > (counts[a] || 0) ? b : a), ks[0]);
        api.readout([['Rolls', String(total)], ['Mode', two ? '2 dice (sum)' : '1 die'], ['Pink line', 'theory'], ['Most frequent', total ? String(best) : '–']]);
      }
      const roll = (n) => {
        for (let i = 0; i < n; i++) { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6), k = two ? a + b : a; counts[k] = (counts[k] || 0) + 1; total++; if (i === n - 1) { const s1 = ROT[a], s2 = ROT[b]; A(0.6, (q) => { d1.rotation.set(s1[0] + (1 - q) * 9, s1[1] + (1 - q) * 7, s1[2]); d1.position.y = 0.35 + Math.sin(q * Math.PI) * 1.2; if (two) { d2.rotation.set(s2[0] + (1 - q) * 8, s2[1], s2[2] + (1 - q) * 6); d2.position.y = 0.35 + Math.sin(q * Math.PI) * 1.1; } }); } }
        draw();
        if (!two && total >= 10) api.done(0, 'With only 10 rolls the bars are uneven: small experiments vary a lot.');
        if (!two && total >= 1000) api.done(1, 'After 1000 rolls each face is close to 16.7% (1/6).');
        if (two && total >= 1000) api.done(2, 'Sum 7 is the most common: 6 of the 36 outcomes give 7.');
      };
      const ans = h('input', { placeholder: 'e.g. 1/6', style: 'width:110px' });
      api.controls(h('div', { class: 'cx-row' }, ...[['1 die', false], ['2 dice (sum)', true]].map(([t, v]) => h('button', { class: 'cx-btn', type: 'button', text: t, onclick: () => { two = v; d2.visible = v; counts = {}; total = 0; draw(); } }))),
        api.buttons([['Roll ×1', () => roll(1)], ['Roll ×10', () => roll(10)], ['Roll ×1000', () => roll(1000), 'pri'], ['Reset', () => { counts = {}; total = 0; draw(); }]]),
        h('div', { class: 'cx-row' }, ans, h('button', { class: 'cx-btn', type: 'button', text: 'Check', onclick: () => { const s = ans.value.trim().replace(/\s/g, ''); let v = NaN; if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); v = a / b; } else v = parseFloat(s); if (Math.abs(v - 1 / 6) < 0.005) api.done(3, 'P(sum 7) = 6/36 = 1/6: (1,6), (2,5), (3,4), (4,3), (5,2), (6,1).'); else api.say('List the pairs that add to 7 and divide by 36.'); } })));
      draw();
      return {};
    },
  });

  /* ---------- SOCIAL SCIENCE: EARTH'S INTERIOR, VOLCANO, EARTHQUAKE ---------- */
  defineLab({
    id: 'earth', subject: 'Social Science', cls: 'Class 7–9', icon: '🌋', title: 'Inside the Earth: volcano and earthquake',
    intro: 'Look inside a cut-open Earth, go deeper layer by layer, then erupt a volcano and set off an earthquake.',
    notes: ['Crust: 5–70 km thick (thin under oceans, thick under mountains). Continental crust is mostly silica and alumina (SiAl); oceanic crust silica and magnesium (SiMa).', 'Mantle: about 2,900 km thick. Part of the upper mantle is soft and partly molten; slow currents move the plates.', 'Outer core: liquid iron and nickel, about 2,200 km thick. Its movement makes Earth\'s magnetic field.', 'Inner core: solid iron and nickel, radius about 1,220 km, around 5,000–6,000 °C.', 'Volcano: an opening in the crust through which magma, gases and ash erupt. Magma on the surface is called lava.', 'Earthquake: sudden shaking when rocks along plate edges slip. The focus is where it starts; the epicentre is the point on the surface above it. Measured with a seismograph on the Richter scale.'],
    view: { dist: 12.5, th: -0.75, ph: 1.2, target: [0, -0.3, 0] },
    steps: [
      { t: 'Go deeper', hint: 'Drag the "Go deeper" slider to the end to remove layers one by one.' },
      { t: 'Click all 4 layers', hint: 'Move the slider back and click the crust, mantle, outer core and inner core.' },
      { t: 'Erupt the volcano', hint: 'Press "Erupt".' },
      { t: 'Cause an earthquake and read the seismograph', hint: 'Press "Earthquake".' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      const LAY = [['Crust', 3.0, 2.85, 0x8b6b4a, 'The thin, rocky outer layer we live on: 5–70 km thick. Continents and ocean floors are part of it.'], ['Mantle', 2.85, 1.65, 0xd9682b, 'About 2,900 km thick. Hot rock that flows very slowly; the upper part has molten magma.'], ['Outer core', 1.65, 0.75, 0xffa53a, 'Liquid iron and nickel, about 2,200 km thick. Its motion creates Earth\'s magnetism.'], ['Inner core', 0.75, 0, 0xfff0a0, 'Solid iron and nickel (NiFe) at about 5,000–6,000 °C. It stays solid because of the huge pressure.']];
      const layers = LAY.map(([n, ro, ri, col, info], i) => {
        const g = K.group(), m = K.mat(col, { roughness: 0.75, side: 2, emissive: i >= 2 ? col : 0x000000, emissiveIntensity: i >= 2 ? 0.35 : 0 });
        g.add(new T.Mesh(new T.SphereGeometry(ro, 64, 40, Math.PI / 2, Math.PI * 1.5), i === 0 ? K.mat(0xffffff, { map: K.tex(1024, 512, (c, W, H) => { c.fillStyle = '#2468b0'; c.fillRect(0, 0, W, H); c.fillStyle = '#5f9e4f'; Object.values(LAND).forEach((p) => { c.beginPath(); p.forEach(([a, b], k) => (k ? c.lineTo((a + 180) / 360 * W, (90 - b) / 180 * H) : c.moveTo((a + 180) / 360 * W, (90 - b) / 180 * H))); c.fill(); }); }), roughness: 0.8, side: 2 }) : m));
        const r1 = new T.Mesh(new T.RingGeometry(ri, ro, 64, 1, Math.PI / 2, Math.PI), m), r2 = new T.Mesh(new T.RingGeometry(ri, ro, 64, 1, -Math.PI / 2, Math.PI), m); r2.rotation.y = -Math.PI / 2; g.add(r1, r2);
        E.scene.add(g); api.part(g, n, info, { off: [-(ri + ro) / 2 * 0.7, 0.1, (ri + ro) / 2 * 0.7], id: n }); return g;
      });
      const volc = K.group(K.cone(0.45, 0.5, K.mat(0x5a4636, { roughness: 0.9 }), [0, 0.2, 0]), K.cyl(0.05, 0.05, 0.02, K.glow(0xff4a1a, 3), [0, 0.46, 0]));
      volc.position.set(0, 3.0, 0); volc.position.applyAxisAngle(new T.Vector3(0, 0, 1), -0.5).applyAxisAngle(new T.Vector3(0, 1, 0), 2.6); volc.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), volc.position.clone().normalize()); E.scene.add(volc);
      api.part(volc, 'Volcano', 'An opening in the crust. Magma from the mantle rises and erupts as lava, ash and gases.', { off: [0, 0.7, 0] });
      const NL = 120, lava = new T.InstancedMesh(new T.SphereGeometry(0.05, 6, 5), K.glow(0xff5a1a, 2.5), NL); lava.visible = false; volc.add(lava); const ld = Array.from({ length: NL }, () => ({ t: Math.random(), vx: (Math.random() - 0.5) * 1.2, vz: (Math.random() - 0.5) * 1.2, vy: 1.5 + Math.random() * 1.5 })); const dd = new T.Object3D();
      const seis = K.tex(512, 160, () => {}), seisC = seis.image, sg = seisC.getContext('2d'); const seismo = K.plane(3, 0.95, new T.MeshBasicMaterial({ map: seis }), [0, -3.8, 0], [0, -0.75, 0]); E.scene.add(seismo);
      api.part(seismo, 'Seismograph', 'Records ground shaking as a wavy line. Bigger waves mean a stronger earthquake (higher on the Richter scale).', { off: [0, 0.6, 0] });
      let wave = [], quake = 0, erupt = 0; const clicked = new Set(); const drawSeis = () => { sg.fillStyle = '#f6f3e8'; sg.fillRect(0, 0, 512, 160); sg.strokeStyle = '#c33'; sg.lineWidth = 2; sg.beginPath(); wave.forEach((y, i) => (i ? sg.lineTo(i * 2, 80 + y) : sg.moveTo(0, 80 + y))); sg.stroke(); sg.fillStyle = '#333'; sg.font = '16px monospace'; sg.fillText('SEISMOGRAPH', 8, 18); seis.needsUpdate = true; }; drawSeis();
      let depth = 0;
      api.controls(api.slider('deep', 'Go deeper', 0, 3, 1, 0, '', (v) => { depth = v; layers.forEach((g, i) => { g.visible = i >= v; }); volc.visible = v === 0; if (v === 3) api.done(0, 'From outside in: crust → mantle → outer core (liquid) → inner core (solid).'); }),
        api.buttons([['Erupt', () => { if (depth) { api.say('Move the slider back to 0 to see the surface.'); return; } erupt = 6; lava.visible = true; api.done(2, 'Magma rose through a weak spot in the crust and erupted as lava, ash and gases.'); }, 'pri'], ['Earthquake', () => { quake = 4; wave = []; api.done(3, 'Rocks slipped along a fault. The seismograph shows the waves; bigger amplitude = higher magnitude.'); }]]));
      const base = E.target.clone();
      return {
        click(obj) { const i = layers.indexOf(obj); if (i >= 0 && api.cur() === 1) { clicked.add(i); api.info(LAY[i][0], LAY[i][4]); if (clicked.size === 4) api.done(1, 'Crust (thin, rocky), mantle (thick, hot), outer core (liquid metal), inner core (solid metal).'); else api.say(LAY[i][0] + '. ' + (4 - clicked.size) + ' more.'); return true; } return false; },
        update(dt, t) {
          if (erupt > 0) { erupt -= dt; ld.forEach((p, i) => { p.t += dt * 0.7; if (p.t > 1) { p.t = 0; } const s = p.t * 1.4; dd.position.set(p.vx * s, 0.5 + p.vy * s - 2.2 * s * s, p.vz * s); dd.scale.setScalar(1 - p.t * 0.5); dd.updateMatrix(); lava.setMatrixAt(i, dd.matrix); }); lava.instanceMatrix.needsUpdate = true; if (erupt <= 0) lava.visible = false; }
          if (quake > 0) { quake -= dt; const a = Math.min(1, quake) * 0.12; E.target.set(base.x + (Math.random() - 0.5) * a, base.y + (Math.random() - 0.5) * a, base.z); wave.push(Math.sin(t * 60) * 60 * Math.min(1, quake / 2) * (0.6 + Math.random() * 0.4)); if (wave.length > 256) wave.shift(); drawSeis(); if (quake <= 0) E.target.copy(base); }
        },
      };
    },
  });

  /* ---------- SOCIAL SCIENCE: SOLAR SYSTEM ---------- */
  defineLab({
    id: 'solar', subject: 'Social Science', cls: 'Class 6–8', icon: '🪐', title: 'The Solar System',
    intro: 'Watch the eight planets orbit the Sun. Click them in order and learn a trick to remember the order.',
    notes: ['Order from the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. Trick: "My Very Educated Mother Just Served Us Noodles".', 'Inner (rocky) planets: Mercury, Venus, Earth, Mars. Outer (gas and ice giants): Jupiter, Saturn, Uranus, Neptune.', 'Venus is the hottest planet and is called the morning or evening star. Mars is the red planet. Jupiter is the largest.', 'Earth is the only planet known to support life; it is called the blue planet.', 'Pluto was reclassified as a dwarf planet in 2006.'],
    view: { dist: 26, th: 0.3, ph: 0.85, target: [0, 0, 0], maxR: 80 },
    steps: [
      { t: 'Click the planets in order from the Sun', hint: 'Start with the one closest to the Sun.' },
      { t: 'Find the largest planet', hint: 'Click it.' },
      { t: 'Find the red planet', hint: 'Click it.' },
      { t: 'Speed up time and watch Earth complete one year', hint: 'Move the speed slider up.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T;
      E.scene.children.forEach((o) => { if (o.isLight) o.intensity *= 0.25; });
      const sunL = new T.PointLight(0xffffff, 400, 0, 1.6); E.scene.add(sunL);
      const stars = new T.InstancedMesh(new T.SphereGeometry(0.08, 4, 3), new T.MeshBasicMaterial({ color: 0xffffff }), 400), d = new T.Object3D(); for (let i = 0; i < 400; i++) { d.position.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(90 + Math.random() * 40); d.updateMatrix(); stars.setMatrixAt(i, d.matrix); } E.scene.add(stars);
      const sun = K.sph(1.6, K.glow(0xffc23a, 2.2)); E.scene.add(sun); api.part(sun, 'Sun', 'A star at the centre of the Solar System. Its gravity holds the planets in orbit, and it gives light and heat.', { off: [0, 2, 0] });
      const PL = [['Mercury', 0.25, 3, 0x9a9a9a, 88, 'Smallest planet and closest to the Sun. No moons.'], ['Venus', 0.42, 4.4, 0xe8c27a, 225, 'Hottest planet (thick CO₂ atmosphere). Brightest planet in our sky: the morning/evening star.'], ['Earth', 0.45, 6, 0x3a7bd5, 365, 'Our home: the only planet known to have life. 1 moon. Takes 365¼ days to go round the Sun.'], ['Mars', 0.33, 7.6, 0xd2522c, 687, 'The red planet (iron oxide dust). Has 2 small moons, Phobos and Deimos.'], ['Jupiter', 1.1, 10.5, 0xd9b38c, 4333, 'Largest planet, a gas giant with the Great Red Spot storm and many moons.'], ['Saturn', 0.95, 13.6, 0xe8d39a, 10759, 'Gas giant with bright rings of ice and rock.'], ['Uranus', 0.65, 16.4, 0x9fe3ea, 30687, 'Ice giant that spins on its side.'], ['Neptune', 0.63, 19, 0x3f63e0, 60190, 'Farthest planet; very cold and windy.']];
      const planets = PL.map(([n, r, a, col, per, info]) => { const ring = K.torus(a, 0.012, new T.MeshBasicMaterial({ color: 0x3a4766 }), [0, 0, 0], [Math.PI / 2, 0, 0]); E.scene.add(ring); const p = K.sph(r, K.mat(col, { roughness: 0.7 })); if (n === 'Saturn') p.add(K.torus(r * 1.7, r * 0.25, K.mat(0xd8c89a, { transparent: true, opacity: 0.8 }), [0, 0, 0], [Math.PI / 2.3, 0, 0])); E.scene.add(p); api.part(p, n, info, { off: [0, r + 0.35, 0] }); return { p, n, a, per, ang: Math.random() * TAU }; });
      const earth = planets[2], moon = K.sph(0.12, K.mat(0xcccccc)); E.scene.add(moon);
      let speed = 10, order = 0, days = 0, startAng = 0, yearDone = false;
      api.controls(api.slider('spd', 'Speed (Earth days per second)', 0, 120, 5, speed, '', (v) => { speed = v; if (v >= 60 && !yearDone) { startAng = earth.ang; days = 0; } }));
      return {
        click(obj) {
          const i = planets.findIndex((q) => q.p === obj); if (i < 0) return false;
          if (api.cur() === 0) { if (i === order) { order++; api.say(order + '. ' + planets[i].n + (order < 8 ? ' ✓  Next?' : ' ✓')); if (order === 8) api.done(0, 'Order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune — "My Very Educated Mother Just Served Us Noodles".'); } else { api.say('Not yet: ' + planets[i].n + ' is number ' + (i + 1) + ' from the Sun. Hint: "My Very Educated Mother…"'); } return false; }
          if (api.cur() === 1 && planets[i].n === 'Jupiter') api.done(1, 'Jupiter is the largest planet: more than 1,300 Earths could fit inside it.');
          if (api.cur() === 2 && planets[i].n === 'Mars') api.done(2, 'Mars looks red because of iron oxide (rust) in its soil.');
          return false;
        },
        update(dt) {
          const dd2 = speed * dt; planets.forEach((q) => { q.ang += dd2 / q.per * TAU; q.p.position.set(Math.cos(q.ang) * q.a, 0, -Math.sin(q.ang) * q.a); q.p.rotation.y += dt; });
          moon.position.copy(earth.p.position).add(new T.Vector3(Math.cos(earth.ang * 13.4) * 0.8, 0, -Math.sin(earth.ang * 13.4) * 0.8));
          if (api.cur() === 3) { days += dd2; api.readout([['Earth days passed', Math.floor(days).toString()], ['Goal', '365 days = 1 year']]); if (days >= 365 && !yearDone) { yearDone = true; api.readout(null); api.done(3, 'One revolution of the Earth around the Sun takes about 365¼ days: one year.'); } }
        },
      };
    },
  });

  /* ---------- COMPUTERS: SORTING VISUALISER ---------- */
  defineLab({
    id: 'sorting', subject: 'Computers', cls: 'Class 8–11', icon: '📊', title: 'Sorting algorithms',
    intro: 'Watch bubble sort and selection sort arrange 3D bars step by step, then sort them yourself.',
    notes: ['An algorithm is a finite set of clear steps that solves a problem.', 'Bubble sort: compare neighbours and swap if they are in the wrong order. After each pass the largest remaining value "bubbles" to the end. For n items it needs at most n − 1 passes.', 'Selection sort: find the smallest remaining value and swap it into the next position.', 'Both take about n² comparisons, so they are slow for big lists; faster methods include merge sort and quick sort.'],
    view: { dist: 13.5, th: 0, ph: 1.3, target: [0, 1.6, 0] },
    steps: [
      { t: 'Run bubble sort', hint: 'Choose Bubble and press Auto (or Step).' },
      { t: 'Run selection sort', hint: 'Press Shuffle, choose Selection and press Auto.' },
      { t: 'Sort the bars yourself', hint: 'Press Shuffle, then click two bars to swap them until they are in order.' },
      { t: 'How many passes does bubble sort need at most for 8 items?', hint: 'Type the number and press Check.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E), N = 8;
      E.scene.add(K.box(10, 0.1, 2.5, K.mat(0x1e2430), [0, -0.05, 0]));
      let vals = [], bars = [], gen = null, algo = 'bubble', auto = false, acc = 0, cmp = 0, swp = 0, sel = null, manual = false;
      const col = { base: 0x5e8cff, cmp: 0xffd54a, swap: 0xff5c7a, done: 0x3ddc97, sel: 0xff9f6a };
      const xOf = (i) => -3.85 + i * 1.1;
      const build = () => { bars.forEach((b) => { E.scene.remove(b.m); const k = E.clickables.indexOf(b.m); if (k >= 0) E.clickables.splice(k, 1); }); bars = vals.map((v, i) => { const m = K.box(0.8, v * 0.42, 0.8, K.mat(col.base, { roughness: 0.4 }), [xOf(i), v * 0.21, 0]); E.scene.add(m); api.clickable(m); const g = K.group(); g.position.set(0, v * 0.21 + 0.05, 0); m.add(g); const L = E.addLabel(g, String(v), [0, 0.1, 0], 'pin'); return { m, v, L }; }); };
      const shuffle = () => { vals = Array.from({ length: N }, (_, i) => i + 1).sort(() => Math.random() - 0.5); if (vals.every((v, i) => v === i + 1)) vals.reverse(); E.labels.slice().forEach((L) => { if (bars.some((b) => b.L === L)) { L.el.remove(); E.labels.splice(E.labels.indexOf(L), 1); } }); build(); gen = null; auto = false; cmp = 0; swp = 0; manual = false; show(); };
      const paint = (i, c) => bars[i] && bars[i].m.material.color.set(c);
      const swapBars = (i, j) => { const a = bars[i], b = bars[j]; [bars[i], bars[j]] = [b, a]; [vals[i], vals[j]] = [vals[j], vals[i]]; const ai = a.m.position.x, bi = b.m.position.x; A(0.25, (k) => { a.m.position.x = lerp(ai, xOf(j), k); b.m.position.x = lerp(bi, xOf(i), k); a.m.position.z = Math.sin(k * Math.PI) * 0.6; b.m.position.z = -Math.sin(k * Math.PI) * 0.6; }); swp++; };
      function* bubble() { for (let p = 0; p < N - 1; p++) { for (let i = 0; i < N - 1 - p; i++) { bars.forEach((_, k) => paint(k, k >= N - p ? col.done : col.base)); paint(i, col.cmp); paint(i + 1, col.cmp); cmp++; yield; if (vals[i] > vals[i + 1]) { paint(i, col.swap); paint(i + 1, col.swap); swapBars(i, i + 1); yield; } } } bars.forEach((_, k) => paint(k, col.done)); }
      function* selection() { for (let i = 0; i < N - 1; i++) { let mn = i; for (let j = i + 1; j < N; j++) { bars.forEach((_, k) => paint(k, k < i ? col.done : col.base)); paint(mn, col.sel); paint(j, col.cmp); cmp++; yield; if (vals[j] < vals[mn]) mn = j; } if (mn !== i) { paint(i, col.swap); paint(mn, col.swap); swapBars(i, mn); yield; } } bars.forEach((_, k) => paint(k, col.done)); }
      const show = () => api.readout([['Algorithm', manual ? 'you!' : algo === 'bubble' ? 'Bubble sort' : 'Selection sort'], ['Comparisons', String(cmp)], ['Swaps', String(swp)], ['Colours', 'yellow compare · red swap · green sorted']]);
      const step = () => { manual = false; if (!gen) gen = algo === 'bubble' ? bubble() : selection(); const r = gen.next(); show(); if (r.done) { auto = false; gen = null; api.done(algo === 'bubble' ? 0 : 1, (algo === 'bubble' ? 'Bubble sort' : 'Selection sort') + ' finished with ' + cmp + ' comparisons and ' + swp + ' swaps.'); } };
      const ans = h('input', { type: 'number', placeholder: 'Passes', style: 'width:100px' });
      const algoBtns = [['bubble', 'Bubble'], ['selection', 'Selection']].map(([k, l]) => h('button', { class: 'cx-btn' + (k === algo ? ' on' : ''), type: 'button', text: l, onclick: () => { algo = k; gen = null; algoBtns.forEach((b) => b.classList.toggle('on', b.textContent === l)); show(); } }));
      api.controls(h('div', { class: 'cx-row' }, algoBtns), api.buttons([['Shuffle', shuffle], ['Step', step], ['Auto', () => { auto = true; }, 'pri'], ['Pause', () => { auto = false; }]]),
        h('div', { class: 'cx-row' }, ans, h('button', { class: 'cx-btn', type: 'button', text: 'Check', onclick: () => { if (+ans.value === 7) api.done(3, 'For n items bubble sort needs at most n − 1 passes: 8 − 1 = 7.'); else api.say('Each pass puts one more bar in its final place. When only one bar is left, it is already in place.'); } })));
      shuffle();
      return {
        click(obj) {
          const i = bars.findIndex((b) => b.m === obj); if (i < 0) return false; if (gen) { api.say('Wait for the algorithm to finish or press Shuffle.'); return true; }
          if (sel === null) { manual = true; sel = i; paint(i, col.sel); return true; }
          if (sel !== i) { cmp++; swapBars(sel, i); }
          bars.forEach((_, k) => paint(k, col.base)); sel = null; show();
          if (manual && vals.every((v, k) => v === k + 1)) { bars.forEach((_, k) => paint(k, col.done)); api.done(2, 'You sorted the list in ' + swp + ' swaps. Selection sort never needs more than n − 1 = 7 swaps.'); }
          return true;
        },
        update(dt) { if (!auto) return; acc += dt; if (acc > 0.32) { acc = 0; step(); } },
      };
    },
  });

  /* ---------- COMPUTERS: BINARY BULBS ---------- */
  defineLab({
    id: 'binary', subject: 'Computers', cls: 'Class 6–9', icon: '💡', title: 'Binary bulbs',
    intro: 'Eight bulbs make one byte. Switch bulbs on and off to build numbers and letters in binary.',
    notes: ['A bit is a 0 or a 1. 8 bits make 1 byte.', 'Place values from right to left: 1, 2, 4, 8, 16, 32, 64, 128.', 'The biggest number in one byte is 11111111₂ = 255.', 'Computers store letters as numbers (ASCII): A = 65, a = 97.'],
    view: { dist: 13.5, th: 0, ph: 1.3, target: [0, 0.9, 0] },
    steps: [
      { t: 'Make the number 5', hint: 'Which place values add up to 5?' },
      { t: 'Make the number 13', hint: '8 + 4 + 1.' },
      { t: 'Make 255 (all on)', hint: 'The biggest number in one byte.' },
      { t: 'Make the letter A (65)', hint: 'A is 65 in ASCII: 64 + 1.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T;
      E.scene.add(K.box(10, 0.2, 2.4, K.mat(0x1e2430), [0, -0.1, 0]));
      const bits = [128, 64, 32, 16, 8, 4, 2, 1].map((v, i) => { const x = -3.85 + i * 1.1; const glassM = new T.MeshStandardMaterial({ color: 0x555555, emissive: 0xffd36a, emissiveIntensity: 0, transparent: true, opacity: 0.9 }); const g = K.group(K.sph(0.38, glassM, [0, 1.2, 0]), K.cyl(0.18, 0.18, 0.35, K.mat(0xaaaaaa, { metalness: 0.8 }), [0, 0.75, 0]), K.box(0.6, 0.4, 0.5, K.mat(0x30363f), [0, 0.2, 0])); g.position.set(x, 0, 0); E.scene.add(g); api.part(g, String(v), 'Place value ' + v + '. Click to switch this bit on (1) or off (0).', { off: [0, 1.85, 0] }); const lt = new T.PointLight(0xffd36a, 0, 2.5); lt.position.set(x, 1.3, 0.4); E.scene.add(lt); const b = K.group(); b.position.set(0, -0.1, 0.4); g.add(b); const L = E.addLabel(b, '0', [0, 0, 0], 'pin'); return { g, v, on: false, glassM, lt, L }; });
      const draw = () => { const n = bits.reduce((a, b) => a + (b.on ? b.v : 0), 0), bin = bits.map((b) => (b.on ? 1 : 0)).join(''); bits.forEach((b) => { b.glassM.emissiveIntensity = b.on ? 2.2 : 0; b.glassM.color.set(b.on ? 0xfff2c0 : 0x555555); b.lt.intensity = b.on ? 3 : 0; b.L.el.textContent = b.on ? '1' : '0'; });
        api.readout([['Binary', bin], ['Decimal', String(n)], ['Hex', n.toString(16).toUpperCase().padStart(2, '0')], ['ASCII', n >= 32 && n < 127 ? '"' + String.fromCharCode(n) + '"' : '–']]);
        const st = api.cur(); if (st === 0 && n === 5) api.done(0, '5 = 4 + 1 = 00000101₂.'); else if (st === 1 && n === 13) api.done(1, '13 = 8 + 4 + 1 = 00001101₂.'); else if (st === 2 && n === 255) api.done(2, '11111111₂ = 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255.'); else if (st === 3 && n === 65) api.done(3, 'A = 65 = 01000001₂. Every letter you type is stored as a number like this.'); };
      api.controls(api.buttons([['All off', () => { bits.forEach((b) => { b.on = false; }); draw(); }], ['Random', () => { bits.forEach((b) => { b.on = Math.random() < 0.5; }); draw(); }]]));
      draw();
      return { click(obj) { const b = bits.find((x) => x.g === obj); if (!b) return false; b.on = !b.on; draw(); return true; } };
    },
  });

  /* ---------- EVS: WATER CYCLE ---------- */
  defineLab({
    id: 'watercycle', subject: 'EVS', cls: 'Class 3–6', icon: '💧', title: 'The water cycle',
    intro: 'Turn up the Sun to evaporate the sea, watch clouds grow, and make it rain on the mountain.',
    notes: ['Evaporation: the Sun heats water and it changes into water vapour.', 'Condensation: vapour cools high up and forms clouds of tiny droplets.', 'Precipitation: heavy droplets fall as rain, snow or hail.', 'Collection: water runs into rivers, lakes and the sea, or soaks into the ground as groundwater.', 'Plants also release water vapour from their leaves: transpiration.'],
    view: { dist: 21, th: 0.45, ph: 1.12, target: [-0.5, 3, 0] },
    steps: [
      { t: 'Start evaporation', hint: 'Move the Sun slider up.' },
      { t: 'Fill the clouds', hint: 'Keep the Sun high until the clouds are full (condensation).' },
      { t: 'Make it rain', hint: 'When the clouds are full, press "Rain".' },
      { t: 'Click the 4 stages', hint: 'Click Evaporation, Condensation, Precipitation and Collection.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T;
      const sea = K.box(8, 0.3, 8, K.mat(0x2468b0, { roughness: 0.25, metalness: 0.1 }), [-4, 0, 0]); E.scene.add(sea);
      const land = K.box(8, 0.6, 8, K.mat(0x5f9e4f, { roughness: 0.9 }), [4, 0.15, 0]); E.scene.add(land);
      const mount = K.cone(2.4, 3.8, K.mat(0x6e6455, { roughness: 0.9 }), [5, 2.3, -1.5]); E.scene.add(mount); const snow = K.cone(0.9, 1.4, K.mat(0xffffff), [5, 3.5, -1.5]); E.scene.add(snow);
      const river = K.tube([[4.6, 1.2, 0.2], [3.5, 0.5, 1.4], [1.5, 0.48, 1.2], [0, 0.2, 1.6], [-1.5, 0.16, 1.3]], 0.16, K.mat(0x3a88d8, { roughness: 0.2 })); E.scene.add(river);
      for (let i = 0; i < 7; i++) { const x = 1.5 + (i % 4) * 1.4, z = 2 + Math.floor(i / 4) * 1.2; E.scene.add(K.cyl(0.07, 0.09, 0.6, K.mat(0x6b4a2b), [x, 0.75, z]), K.cone(0.38, 0.9, K.mat(0x2f8f46), [x, 1.4, z])); }
      const sun = K.sph(0.9, K.glow(0xffc23a, 2.4), [-6, 8, -3]); E.scene.add(sun); api.part(sun, 'Sun', 'The Sun\'s heat drives the whole water cycle.', { off: [0, 1.2, 0] });
      const cloudM = K.mat(0xffffff, { roughness: 1, transparent: true, opacity: 0.95 }), cloud = K.group(); for (let i = 0; i < 9; i++) cloud.add(K.sph(0.7 + (i % 3) * 0.2, cloudM, [(i - 4) * 0.55, Math.sin(i) * 0.2, (i % 2) * 0.4])); cloud.position.set(-1, 6, 0); cloud.scale.setScalar(0.4); E.scene.add(cloud);
      const NV = 120, vap = new T.InstancedMesh(new T.SphereGeometry(0.06, 6, 5), new T.MeshBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0.6 }), NV); E.scene.add(vap); const vd = Array.from({ length: NV }, () => [-7 + Math.random() * 6, Math.random(), -3 + Math.random() * 6]);
      const NR = 200, rain = new T.InstancedMesh(new T.CylinderGeometry(0.015, 0.015, 0.3, 4), new T.MeshBasicMaterial({ color: 0x8fc8ff }), NR); rain.visible = false; E.scene.add(rain); const rd = Array.from({ length: NR }, () => [Math.random(), Math.random(), Math.random()]);
      const tags = [['Evaporation', [-4, 2.5, 1], 'The Sun heats the sea; water turns into invisible water vapour and rises.'], ['Condensation', [-1, 7.4, 0], 'High up it is cold, so vapour condenses into tiny droplets that form clouds.'], ['Precipitation', [3.2, 4.6, 0], 'When droplets join and become heavy, they fall as rain, snow or hail.'], ['Collection', [0.5, 0.9, 2.4], 'Water collects in rivers, lakes and the sea, and soaks into the ground.']].map(([n, p, info]) => { const g = K.group(K.sph(0.22, K.glow(0x5ee6c8, 1.6))); g.position.set(...p); E.scene.add(g); api.part(g, n, info, { off: [0, 0.4, 0] }); return { g, n }; });
      let heat = 0, water = 0, raining = 0; const seen = new Set(), dd = new T.Object3D();
      api.controls(api.slider('sun', 'Sun\'s heat', 0, 10, 1, 0, '', (v) => { heat = v; if (v >= 3) api.done(0, 'Heat from the Sun turns sea water into water vapour: evaporation.'); }), api.buttons([['Rain', () => { if (water < 1) { api.say('The clouds are not full yet. Keep the Sun high a little longer.'); return; } raining = 6; api.done(2, 'Heavy droplets fall as rain: precipitation. On the cold mountain top it falls as snow.'); }, 'pri']]));
      return {
        click(obj) { const tg = tags.find((x) => x.g === obj); if (tg && api.cur() === 3) { seen.add(tg.n); api.info(tg.n, obj.userData.click.info); if (seen.size === 4) api.done(3, 'Evaporation → condensation → precipitation → collection, again and again.'); return true; } return false; },
        update(dt, t) {
          const ev = heat / 10; vap.visible = ev > 0;
          vd.forEach((p, i) => { p[1] += dt * (0.25 + ev * 0.6); if (p[1] > 1) p[1] = 0; dd.position.set(p[0] + Math.sin(t + i) * 0.1 + p[1] * 4, 0.3 + p[1] * 5.5, p[2] * (1 - p[1] * 0.6)); dd.scale.setScalar(ev > 0 ? 1 : 0.001); dd.updateMatrix(); vap.setMatrixAt(i, dd.matrix); }); vap.instanceMatrix.needsUpdate = true;
          if (!raining) { water = Math.min(1, water + dt * ev * 0.12); if (water >= 1) api.done(1, 'Water vapour cooled high up and condensed into big, dark clouds.'); }
          cloud.scale.setScalar(0.4 + water * 0.9); cloudM.color.setScalar(1 - water * 0.45); cloud.position.x = -1 + water * 3.5;
          rain.visible = raining > 0;
          if (raining > 0) { raining -= dt; water = Math.max(0, water - dt * 0.17); rd.forEach((p, i) => { p[1] -= dt * 1.2; if (p[1] < 0) p[1] = 1; dd.position.set(cloud.position.x - 2 + p[0] * 4, 0.6 + p[1] * (cloud.position.y - 0.8), -1.5 + p[2] * 3); dd.scale.setScalar(1); dd.updateMatrix(); rain.setMatrixAt(i, dd.matrix); }); rain.instanceMatrix.needsUpdate = true; snow.scale.setScalar(1 + (6 - raining) * 0.03); }
        },
      };
    },
  });

  /* ---------- BIOLOGY: MICROSCOPE (ONION PEEL) ---------- */
  defineLab({
    id: 'microscope', subject: 'Biology', cls: 'Class 8–9', icon: '🔬', title: 'Microscope: onion peel cells',
    intro: 'Put an onion peel slide on a compound microscope, focus it, switch to high power and find the parts of a plant cell.',
    notes: ['A compound microscope has an eyepiece (10×) and objective lenses (10× low power, 40× high power). Total magnification = eyepiece × objective.', 'Always focus first with the coarse knob on low power, then use the fine knob.', 'Onion peel cells are brick-shaped with a thick cell wall. A stain like safranin or iodine makes the nucleus clearly visible.', 'Plant cells have a cell wall and a large vacuole; animal cells (e.g. cheek cells) do not.'],
    view: { dist: 9, th: 0.45, ph: 1.2, target: [0.9, 1.8, 0] },
    steps: [
      { t: 'Place the slide on the stage', hint: 'Click the glass slide on the table.' },
      { t: 'Focus on low power', hint: 'Turn the focus slider until the cells look sharp.' },
      { t: 'Switch to high power (400×) and refocus', hint: 'Press "40× objective", then use the fine focus.' },
      { t: 'Find 4 parts of the cell', hint: 'Click the cell wall, nucleus, cytoplasm and vacuole in the view.' },
    ],
    build(api) {
      const { K, E } = api, T = K.T, A = anims(E);
      E.scene.add(K.box(6, 0.15, 3.5, K.mat(0xd8d3c8, { roughness: 0.8 }), [0, -0.08, 0]));
      const metal = K.mat(0x2c3340, { metalness: 0.6, roughness: 0.35 }), chrome = K.mat(0xc8ced6, { metalness: 0.9, roughness: 0.2 });
      const scope = K.group(K.box(1.4, 0.15, 1.1, metal, [0, 0.08, 0]), K.box(0.25, 2.0, 0.3, metal, [0, 1.1, -0.4], [-0.15, 0, 0]), K.box(1.1, 0.06, 0.9, metal, [0, 1.0, 0]), K.cyl(0.13, 0.13, 1.4, metal, [0, 2.3, 0.05], [0.25, 0, 0]), K.cyl(0.09, 0.09, 0.3, chrome, [0, 3.05, -0.12], [0.25, 0, 0]), K.cyl(0.2, 0.2, 0.06, chrome, [0, 1.25, 0]));
      E.scene.add(scope);
      const objs = K.group(K.cyl(0.05, 0.035, 0.28, chrome, [0.12, 1.42, 0], [0, 0, 0.3]), K.cyl(0.05, 0.03, 0.4, chrome, [-0.12, 1.37, 0], [0, 0, -0.3])); E.scene.add(objs); api.part(objs, 'Objective lenses (10×, 40×)', 'The lenses close to the slide. Low power 10× to find the cells, high power 40× to see details.', { off: [0.4, 0, 0] });
      const knob = K.cyl(0.2, 0.2, 0.12, chrome, [0.32, 1.0, -0.4], [0, 0, Math.PI / 2]); E.scene.add(knob); api.part(knob, 'Focus knobs', 'Coarse knob moves the stage a lot; fine knob makes small adjustments for a sharp image.', { off: [0.3, 0.2, 0] });
      const eye = K.group(); eye.position.set(0, 3.25, -0.18); E.scene.add(eye); api.part(eye, 'Eyepiece (10×)', 'The lens you look through. It magnifies 10 times.', { off: [0, 0.2, 0] });
      const slide = K.group(K.box(0.9, 0.02, 0.3, K.glass(0xffffff, 0.5)), K.box(0.25, 0.025, 0.22, K.mat(0xd4a0c8, { transparent: true, opacity: 0.7 }), [0, 0.005, 0])); slide.position.set(-2, 0.05, 1); E.scene.add(slide); api.part(slide, 'Onion peel slide', 'A thin layer of onion peel, stained and covered with a cover slip.', { off: [0, 0.25, 0] });
      const VIEW = 512; let focus = 0.15, hi = false, placed = false;
      const cells = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) cells.push({ x: c * 130 + (r % 2) * 50 - 30, y: r * 90 - 10, w: 128, h: 88 });
      const tex = K.tex(VIEW, VIEW, () => {}), cv = tex.image, g = cv.getContext('2d');
      const drawView = () => {
        const target = hi ? 0.62 : 0.5, blur = Math.min(14, Math.abs(focus - target) * 60); g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, VIEW, VIEW); g.beginPath(); g.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 4, 0, TAU); g.clip(); g.fillStyle = placed ? '#f4e6ee' : '#fffdf6'; g.fillRect(0, 0, VIEW, VIEW);
        if (placed) { g.filter = 'blur(' + blur.toFixed(1) + 'px)'; const s = hi ? 2.4 : 1; g.translate(VIEW / 2, VIEW / 2); g.scale(s, s); g.translate(-VIEW / 2, -VIEW / 2);
          cells.forEach((q) => { g.fillStyle = '#ecd3e2'; g.fillRect(q.x, q.y, q.w, q.h); g.fillStyle = '#f7ecf2'; g.fillRect(q.x + 14, q.y + 12, q.w - 28, q.h - 24); g.strokeStyle = '#9b3f74'; g.lineWidth = 6; g.strokeRect(q.x, q.y, q.w, q.h); g.fillStyle = '#7a1f57'; g.beginPath(); g.ellipse(q.x + 32, q.y + 30, 11, 9, 0, 0, TAU); g.fill(); }); }
        g.restore(); tex.needsUpdate = true; return blur;
      };
      const view = K.group(K.cyl(1.25, 1.25, 0.04, new T.MeshBasicMaterial({ map: tex }), [0, 0, 0], [Math.PI / 2, 0, 0], 64), K.torus(1.27, 0.06, K.mat(0x111111), [0, 0, 0], [0, 0, 0])); view.position.set(2.2, 2.4, 0); view.rotation.y = -0.5; E.scene.add(view);
      const vlab = K.group(); vlab.position.set(0, 1.45, 0); view.add(vlab); E.addLabel(vlab, 'What you see in the eyepiece', [0, 0, 0]);
      const P = [['Cell wall', 0.62, 0.0, 'A thick, rigid wall of cellulose around each plant cell. It gives shape and support.'], ['Nucleus', -0.36, 0.42, 'The dark-stained round body that controls the cell and holds the DNA.'], ['Cytoplasm', 0.25, -0.35, 'The jelly-like material between the cell membrane and the nucleus.'], ['Vacuole', -0.1, -0.05, 'A large clear space filled with cell sap. It keeps the cell firm (turgid).']].map(([n, x, y, info]) => { const g2 = K.group(K.sph(0.05, K.glow(0x5ee6c8, 1.5))); g2.position.set(x, y, 0.04); g2.visible = false; view.add(g2); api.part(g2, n, info, { off: [0, 0.1, 0] }); return { g: g2, n }; });
      const found = new Set();
      drawView();
      const objBtn = h('button', { class: 'cx-btn', type: 'button', text: '40× objective', onclick: () => { if (!api.isDone(1)) { api.say('Focus on low power first.'); return; } hi = !hi; objBtn.textContent = hi ? '10× objective' : '40× objective'; A(0.5, (k) => { objs.rotation.y = (hi ? k : 1 - k) * Math.PI; }); drawView(); api.say(hi ? 'High power: 10 × 40 = 400×. The view is blurry again — use the fine focus.' : 'Low power: 10 × 10 = 100×.'); } });
      api.controls(api.slider('focus', 'Focus (coarse → fine)', 0, 1, 0.01, focus, '', (v) => { focus = v; const b = drawView(); if (placed && !hi && b < 1.2) api.done(1, 'Low power (100×): many brick-shaped cells in rows.'); if (placed && hi && b < 1.2) { api.done(2, 'High power (400×): each cell shows a thick wall and a dark nucleus.'); P.forEach((p) => { p.g.visible = true; }); } }), objBtn);
      return {
        click(obj) {
          if (obj === slide && !placed) { placed = true; A(1, (k) => slide.position.set(lerp(-2, 0, k), lerp(0.05, 1.05, k) + Math.sin(k * Math.PI) * 0.6, lerp(1, 0, k))); api.done(0, 'The slide is clipped on the stage, over the hole, under the objective lens.'); drawView(); return true; }
          const p = P.find((q) => q.g === obj); if (p && api.cur() === 3) { found.add(p.n); api.info(p.n, obj.userData.click.info); if (found.size === 4) api.done(3, 'Onion cells: cell wall, cell membrane, cytoplasm, nucleus and a big vacuole. No chloroplasts, because onion peel is not green.'); return true; }
          return false;
        },
      };
    },
  });

  /* ================= STUDY HUB: Understand → Practice → Read → Write → Execute ================= */
  S.study = S.study || {}; S.papers = S.papers || {};
  const STAGES = [['u', 'Understand', '💡'], ['p', 'Practice', '🎯'], ['r', 'Read', '📖'], ['w', 'Write', '✍️'], ['e', 'Execute', '🧪']];
  const BIO_LAB = { flower: 'flower', pollination: 'flower', plantCell: 'microscope', animalCell: 'microscope', heart: 'cockroach', digestive: 'frog', kidney: 'frog', lungs: 'frog' };
  const kwFrom = (pts) => { const stop = new Set('the and with that this from into have has are was were for which their there they them then than also each only more most very when where what into onto over under about after before between because while through'.split(' ')); const ws = pts.join(' ').toLowerCase().match(/[a-z][a-z-]{5,}/g) || []; const seen = []; ws.forEach((w) => { if (!stop.has(w) && !seen.includes(w)) seen.push(w); }); return seen.slice(0, 5); };
  function bioTopic(t) { return { id: t.id, title: t.title, cls: t.cls, subject: 'Biology', summary: t.summary, points: t.learn || [], quiz: null, lab: BIO_LAB[t.id] || null, bio: true,
    w: ['Explain "' + t.title + '" in your own words. Use the key terms.', kwFrom(t.learn || []), t.summary + ' ' + (t.learn || []).join(' ')],
    iq: (t.learn || []).slice(0, 3).map((l, i) => [i === 2 ? 3 : 2, i === 0 ? 'Write a short note on ' + t.title.toLowerCase() + '.' : 'Explain: ' + l.split(/[:;,(]/)[0].trim() + '.', l]) }; }
  const SUBJ_ALL = () => ['Biology', ...SUBJ_LIST];
  const topicsOf = (subj) => (subj === 'Biology' ? C.TOPICS.map(bioTopic) : SUBJECTS[subj].topics.map((x) => STOPIC[x[0]]).filter(Boolean));
  const findTopic = (id) => STOPIC[id] || (C.topicOf(id) ? bioTopic(C.topicOf(id)) : null);
  const stState = (id) => (S.study[id] = S.study[id] || {});
  const stageDone = (t, k) => { const s = S.study[t.id] || {}; if (s[k]) return true; if (k === 'p') return t.bio ? !!(appState().done || {})[t.id] : !!(S.subj[t.id] && S.subj[t.id].done); if (k === 'e' && t.lab) return !!(S.labs[t.lab] && S.labs[t.lab].done); return false; };
  const markStage = (t, k) => { const s = stState(t.id); if (s[k]) return; s[k] = Date.now(); save(); const n = STAGES.filter(([x]) => stageDone(t, x)).length; if (n === 5) { notify('parent', S.child.name + ' completed all 5 study steps for "' + t.title + '" (' + t.subject + ').', 'learning'); toast('All 5 steps done: ' + t.title + ' ⭐'); } };
  const dots = (t) => h('span', { class: 'cx-dots', title: 'Understand · Practice · Read · Write · Execute' }, STAGES.map(([k, l]) => h('i', { class: stageDone(t, k) ? 'on' : '', title: l })));
  function quizWidget(quiz, onFinish) {
    const box = h('div', { class: 'cx-quiz' }); let qi = 0, score = 0;
    const draw = () => {
      if (qi >= quiz.length) { box.replaceChildren(h('p', { html: '<b>' + score + ' / ' + quiz.length + '</b> ' + (score >= Math.ceil(quiz.length * 0.75) ? '· Great, you passed!' : '· Read again and retry.') }), h('button', { class: 'cx-btn', type: 'button', text: 'Try again', onclick: () => { qi = 0; score = 0; draw(); } })); onFinish && onFinish(score); return; }
      const [q, opts, ok] = quiz[qi]; let locked = false;
      box.replaceChildren(h('small', { class: 'cx-note', text: 'Question ' + (qi + 1) + ' of ' + quiz.length }), h('p', {}, h('b', { text: q })), h('div', { class: 'cx-qopts' }, opts.map((o, i) => h('button', { class: 'cx-btn', type: 'button', text: o, onclick: (e) => { if (locked) return; locked = true; if (i === ok) score++; e.target.classList.add(i === ok ? 'right' : 'wrong'); if (i !== ok) box.querySelectorAll('.cx-qopts button')[ok].classList.add('right'); setTimeout(() => { qi++; draw(); }, i === ok ? 650 : 1400); } }))));
    };
    draw(); return box;
  }
  function checkWriting(ans, kws) {
    const a = ' ' + ans.toLowerCase().replace(/[^a-z0-9²³½√π.=+−\-×÷/ ]/g, ' ') + ' ';
    const hit = kws.filter((k) => { const parts = k.toLowerCase().split(/\s+/).filter((x) => x.length > 1); return parts.length && parts.every((p) => a.includes(p.replace(/s$/, ''))); });
    return { hit, miss: kws.filter((k) => !hit.includes(k)), pct: kws.length ? Math.round(hit.length / kws.length * 100) : 0, words: (ans.trim().match(/\S+/g) || []).length };
  }
  const ap = (el, ...k) => el.append(...k.flat().filter((x) => x != null && x !== false));
  let studyStage = 'u';
  function renderStudy(main) {
    const sel = S.studySel && findTopic(S.studySel);
    if (sel) return renderStudyTopic(main, sel);
    const view = S.studyView || 'topics';
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Study hub' }), h('h1', { html: 'Understand. Practise. <em>Master.</em>' })),
      h('p', { class: 'cx-lead', text: 'Every topic follows five steps: understand it with 3D and an AI teacher, practise with a quiz, read the notes, write an answer and check it, then execute it in a lab or activity.' })));
    main.append(h('div', { class: 'cx-stagebar' }, STAGES.map(([k, l, ic], i) => h('span', {}, h('b', { text: ic + ' ' + l }), i < 4 ? h('i', { text: '→' }) : null))));
    main.append(h('nav', { class: 'cx-subtabs' }, [['topics', 'Topics'], ['iq', 'Important questions'], ['papers', 'Practice papers'], ['pyq', 'Previous years\' papers'], ['notes', 'Revision notes']].map(([k, l]) => h('button', { type: 'button', class: view === k ? 'on' : '', text: l, onclick: () => { S.studyView = k; save(); C.render(); } }))));
    const subj = S.studySubj || 'Maths';
    main.append(h('div', { class: 'cx-chips' }, SUBJ_ALL().map((s) => h('button', { type: 'button', class: 'cx-chipbtn' + (s === subj ? ' on' : ''), style: '--c:' + (SUBJ_COL[s] || '#5ee6c8'), text: (s === 'Biology' ? '🧬' : SUBJECTS[s].icon) + ' ' + s, onclick: () => { S.studySubj = s; save(); C.render(); } }))));
    const list = topicsOf(subj).sort((a, b) => a.cls - b.cls);
    if (view === 'topics') {
      const card = h('div', { class: 'cx-card glass' }, h('h3', { text: subj + ' · ' + list.length + ' topics' }));
      list.forEach((t) => { const n = STAGES.filter(([k]) => stageDone(t, k)).length; card.append(h('div', { class: 'cx-vrow', style: '--h:' + (SUBJ_COL[subj] || '#5ee6c8') }, h('span', { class: 'ic', text: n === 5 ? '⭐' : String(n) }), h('span', {}, h('b', { text: t.title }), h('small', { text: clsLabel(t.cls) + (t.lab ? ' · 3D lab' : '') }), dots(t)), h('button', { class: 'cx-btn pri', type: 'button', text: n ? (n === 5 ? 'Revise' : 'Continue') : 'Start', onclick: () => { S.studySel = t.id; studyStage = STAGES.find(([k]) => !stageDone(t, k))?.[0] || 'u'; save(); C.render(); } }))); });
      main.append(card);
    }
    if (view === 'iq') {
      const marks = S.iqMarks || 0;
      main.append(h('div', { class: 'cx-row' }, [0, 1, 2, 3].map((m) => h('button', { class: 'cx-btn' + (m === marks ? ' on' : ''), type: 'button', text: m ? m + '-mark' : 'All', onclick: () => { S.iqMarks = m; save(); C.render(); } })), h('button', { class: 'cx-btn', type: 'button', text: 'Print', onclick: () => printEl($('#cx-iq-list'), subj + ' important questions') })));
      const box = h('div', { class: 'cx-card glass', id: 'cx-iq-list' }, h('h3', { text: subj + ': important questions' }), h('p', { class: 'cx-note', text: 'Frequently asked types of questions, with model answers. Try each one yourself first, then tap "Show answer".' }));
      list.forEach((t) => { const qs = (t.iq || []).filter((x) => !marks || x[0] === marks); if (!qs.length) return; ap(box, h('h4', { text: t.title + ' · ' + clsLabel(t.cls) })); qs.forEach(([m, q, a]) => { const ansEl = h('p', { class: 'cx-iq-a', hidden: true, text: a }); box.append(h('div', { class: 'cx-iq' }, h('span', { class: 'cx-mk', text: m + 'M' }), h('div', {}, h('p', { class: 'cx-iq-q', text: q }), ansEl, h('button', { class: 'cx-link', type: 'button', text: 'Show answer', onclick: (e) => { ansEl.hidden = !ansEl.hidden; e.target.textContent = ansEl.hidden ? 'Show answer' : 'Hide answer'; } })))); }); });
      main.append(box);
    }
    if (view === 'papers') renderPaper(main, subj, list);
    if (view === 'pyq') renderPYQ(main, subj);
    if (view === 'notes') {
      const box = h('div', { class: 'cx-card glass', id: 'cx-notes' }, h('div', { class: 'cx-row', style: 'justify-content:space-between' }, h('h3', { text: subj + ': revision notes' }), h('button', { class: 'cx-btn', type: 'button', text: 'Print / save as PDF', onclick: () => printEl($('#cx-notes'), subj + ' revision notes') })));
      list.forEach((t) => ap(box, h('h4', { text: t.title + ' · ' + clsLabel(t.cls) }), h('p', { text: t.summary }), h('ul', { class: 'cx-points' }, t.points.map((p) => h('li', { text: p })))));
      main.append(box);
    }
  }
  function printEl(el, title) {
    if (!el) return; const w = h('div', { id: 'cx-print' }, h('h1', { text: CAMPUS_NAME() + ' · ' + title }), el.cloneNode(true));
    w.querySelectorAll('button').forEach((b) => b.remove()); w.querySelectorAll('[hidden]').forEach((x) => { x.hidden = false; });
    document.body.append(w); document.documentElement.classList.add('cx-printing'); setTimeout(() => { try { window.print(); } catch (e) {} setTimeout(() => { w.remove(); document.documentElement.classList.remove('cx-printing'); }, 400); }, 50);
  }
  const CAMPUS_NAME = () => (C.CAMPUS && C.CAMPUS.school) || 'INSTITUTION';
  function renderPaper(main, subj, list) {
    if (subj === 'Biology') { main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Biology practice' }), h('p', { class: 'cx-note', text: 'Biology quizzes and class tests are inside each 3D topic in the library. Use "Important questions" here, or the official links in "Previous years\' papers".' }))); return; }
    const seed = S.paperSeed || 1, rnd = (() => { let x = seed * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); })();
    const pick = (arr, n) => arr.map((v) => [rnd(), v]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
    const mcq = pick(list.flatMap((t) => t.quiz || []), 8), short = pick(list.flatMap((t) => (t.iq || []).filter((x) => x[0] <= 2)), 4), three = pick(list.flatMap((t) => (t.iq || []).filter((x) => x[0] === 3)), 3), long = pick(list.filter((t) => t.w), 2);
    const total = mcq.length + short.length * 2 + three.length * 3 + long.length * 5;
    const key = h('div', { class: 'cx-key', hidden: true }, h('h4', { text: 'Answer key' }), h('ol', {}, mcq.map((q) => h('li', { text: q[1][q[2]] }))), h('h4', { text: 'Sections B–D: model answers' }), ...short.concat(three).map((q) => h('p', { text: '• ' + q[2] })), ...long.map((t) => h('p', { text: '• ' + t.w[2] })));
    const paper = h('div', { class: 'cx-card glass cx-paper', id: 'cx-paper' },
      h('div', { class: 'cx-paper-h' }, h('b', { text: CAMPUS_NAME() + ' · ' + subj + ' practice paper #' + seed }), h('span', { text: 'Max marks: ' + total + ' · Time: 1 hour' })),
      h('p', { class: 'cx-note', text: 'A practice paper in the board pattern, made from this app\'s question bank. It is not an official past paper.' }),
      h('h4', { text: 'Section A · Multiple choice (1 mark each)' }), h('ol', {}, mcq.map((q) => h('li', {}, q[0], h('div', { class: 'cx-opts4' }, q[1].map((o, i) => h('span', { text: '(' + 'abcd'[i] + ') ' + o })))))),
      short.length ? h('h4', { text: 'Section B · Short answer (2 marks each)' }) : null, h('ol', { start: mcq.length + 1 }, short.map((q) => h('li', { text: q[1] }))),
      three.length ? h('h4', { text: 'Section C · Short answer (3 marks each)' }) : null, h('ol', { start: mcq.length + short.length + 1 }, three.map((q) => h('li', { text: q[1] }))),
      long.length ? h('h4', { text: 'Section D · Long answer (5 marks each)' }) : null, h('ol', { start: mcq.length + short.length + three.length + 1 }, long.map((t) => h('li', { text: t.w[0] }))), key);
    let timer = null, left = 3600; const clock = h('span', { class: 'cx-chip a', text: '60:00' });
    main.append(h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Start 1-hour timer', onclick: (e) => { clearInterval(timer); left = 3600; e.target.textContent = 'Restart timer'; timer = setInterval(() => { if (!clock.isConnected) { clearInterval(timer); return; } left--; clock.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); if (left <= 0) { clearInterval(timer); toast('Time up! Check your answers with the key.'); key.hidden = false; } }, 1000); } }), clock,
      h('button', { class: 'cx-btn', type: 'button', text: 'Show answer key', onclick: () => { key.hidden = !key.hidden; } }), h('button', { class: 'cx-btn', type: 'button', text: 'New paper', onclick: () => { S.paperSeed = seed + 1; save(); C.render(); } }), h('button', { class: 'cx-btn', type: 'button', text: 'Print / save as PDF', onclick: () => printEl($('#cx-paper'), subj + ' practice paper') })), paper);
  }
  /* previous years' papers: official links + papers uploaded by the school */
  const PDB = { db: null, open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('institution.papers', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => { this.db = r.result; res(this.db); }; r.onerror = () => rej(r.error); }); }, async put(id, v) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(v, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }, async get(id) { const db = await this.open(); return new Promise((res) => { const q = db.transaction('files').objectStore('files').get(id); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); }, async del(id) { const db = await this.open(); return new Promise((res) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(id); tx.oncomplete = res; }); } };
  function renderPYQ(main, subj) {
    const LINKS = [['CBSE Academic: sample papers and marking schemes', 'https://cbseacademic.nic.in/', 'Official CBSE site for sample question papers and marking schemes for Classes 10 and 12.'], ['CBSE: previous years\' question papers', 'https://www.cbse.gov.in/', 'The main CBSE website; past board question papers are published under its academic and examination sections.'], ['KSEAB (Karnataka SSLC and PUC)', 'https://kseab.karnataka.gov.in/', 'Karnataka School Examination and Assessment Board: SSLC and II PUC model and previous question papers.'], ['NCERT textbooks (free)', 'https://ncert.nic.in/textbook.php', 'Every NCERT textbook chapter as a free PDF. Board questions come from these books.'], ['DIKSHA', 'https://diksha.gov.in/', 'Government learning platform with question banks and videos for each state board.']];
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Official sources' }), h('p', { class: 'cx-note', text: 'Download real previous years\' papers from the official boards. Links open in a new tab.' }), ...LINKS.map(([t, u, d]) => h('div', { class: 'cx-vrow' }, h('span', { class: 'ic', text: '🔗' }), h('span', {}, h('b', { text: t }), h('small', { text: d })), h('a', { class: 'cx-btn', href: u, target: '_blank', rel: 'noopener noreferrer', text: 'Open' })))));
    const role = S.role, canAdd = ['teacher', 'principal', 'parent'].includes(role);
    const mine = Object.entries(S.papers).filter(([, p]) => p.subject === subj).sort((a, b) => (b[1].year || 0) - (a[1].year || 0));
    const viewer = h('div', { class: 'cx-pdfview', hidden: true });
    const card = h('div', { class: 'cx-card glass' }, h('h3', { text: 'School\'s paper library · ' + subj }), h('p', { class: 'cx-note', text: canAdd ? 'Add previous years\' papers (PDF or photo). They are saved on this device for students to open.' : 'Papers added by your teachers. Switch "Viewing as" to Class teacher to add papers.' }),
      mine.length ? h('div', {}, mine.map(([id, p]) => h('div', { class: 'cx-vrow' }, h('span', { class: 'ic', text: '📄' }), h('span', {}, h('b', { text: p.name }), h('small', { text: subj + ' · ' + (p.year || '') + (p.cls ? ' · ' + clsLabel(p.cls) : '') })), h('span', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Open', onclick: async () => { const f = await PDB.get(id); if (!f) { toast('That file is not on this device.'); return; } const u = URL.createObjectURL(f.blob); viewer.hidden = false; viewer.replaceChildren(f.blob.type.includes('pdf') ? h('iframe', { src: u, title: p.name }) : h('img', { src: u, alt: p.name }), h('a', { class: 'cx-btn', href: u, download: p.name, text: 'Download' })); viewer.scrollIntoView({ behavior: 'smooth' }); } }), canAdd ? h('button', { class: 'cx-btn', type: 'button', text: 'Remove', onclick: async () => { await PDB.del(id); delete S.papers[id]; save(); C.render(); } }) : null)))) : h('p', { class: 'cx-note', text: 'No papers added yet.' }));
    if (canAdd) { const file = h('input', { type: 'file', accept: 'application/pdf,image/*' }), year = h('input', { type: 'number', placeholder: 'Year', value: new Date().getFullYear() - 1, style: 'width:100px' }), cls = h('input', { type: 'number', placeholder: 'Class', value: S.child.cls, style: 'width:90px' });
      card.append(h('div', { class: 'cx-form-grid', style: 'margin-top:12px' }, h('label', { class: 'cx-field' }, 'File', file), h('label', { class: 'cx-field' }, 'Year', year), h('label', { class: 'cx-field' }, 'Class', cls)), h('button', { class: 'cx-btn pri', type: 'button', text: 'Add paper', style: 'margin-top:10px', onclick: async () => { const f = file.files && file.files[0]; if (!f) { toast('Choose a PDF or photo first.'); return; } if (f.size > 40e6) { toast('That file is over 40 MB.'); return; } const id = 'p' + Date.now().toString(36); try { await PDB.put(id, { blob: f }); S.papers[id] = { name: f.name, subject: subj, year: +year.value, cls: cls.value, at: Date.now() }; save(); notify('student', 'A new ' + subj + ' question paper (' + year.value + ') was added to the Study hub.', 'learning'); C.render(); } catch (e) { toast('Could not save the file on this device.'); } } })); }
    main.append(card, viewer);
  }
  function renderStudyTopic(main, t) {
    S.last = { kind: t.bio ? 'topic' : 'subj', id: t.id, title: t.title, at: Date.now() }; save();
    const col = SUBJ_COL[t.subject] || '#5ee6c8';
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('button', { class: 'cx-back', type: 'button', text: '← Study hub', onclick: () => { S.studySel = null; save(); C.render(); } }), h('span', { class: 'eyebrow', style: 'display:block;margin-top:10px;color:' + col, text: t.subject + ' · ' + clsLabel(t.cls) }), h('h1', { text: t.title })), dots(t)));
    const tabs = h('nav', { class: 'cx-steps5' }, STAGES.map(([k, l, ic], i) => h('button', { type: 'button', class: (studyStage === k ? 'on ' : '') + (stageDone(t, k) ? 'done' : ''), onclick: () => { studyStage = k; C.render(); } }, h('span', { class: 'n', text: stageDone(t, k) ? '✓' : String(i + 1) }), h('span', { text: ic + ' ' + l }))));
    main.append(tabs);
    const body = h('div', { class: 'cx-grid2' }), left = h('div', { class: 'cx-card glass' });
    const teacher = teacherPanel({ name: AI.subjectTeacher, role: t.subject + ' teacher', starters: ['Explain this simply', 'Give a real-life example', 'Quiz me', 'Check my understanding'], hello: 'Hi ' + S.child.name + '! Step "' + STAGES.find(([k]) => k === studyStage)[1] + '" of "' + t.title + '". Ask me anything.', getCtx: () => ({ lab: false, subject: t.subject, cls: clsLabel(t.cls), title: t.title, notes: [t.summary, ...t.points], quiz: t.quiz || [], glossary: [] }) });
    const next = () => { const i = STAGES.findIndex(([k]) => k === studyStage); if (i < 4) { studyStage = STAGES[i + 1][0]; C.render(); window.scrollTo && $('#campus-root').scrollTo({ top: 0, behavior: 'smooth' }); } else { S.studySel = null; save(); C.render(); } };
    const nextBtn = (txt) => h('button', { class: 'cx-btn pri', type: 'button', text: txt || 'Next step →', onclick: next });
    if (studyStage === 'u') {
      ap(left, h('h3', { text: '💡 Understand' }), h('p', { class: 'cx-big', text: t.summary }),
        h('div', { class: 'cx-row' }, t.bio ? h('button', { class: 'cx-btn', type: 'button', text: '🧬 Open the 3D model', onclick: () => { location.hash = '#/topic/' + t.id; } }) : null, t.bio ? h('button', { class: 'cx-btn', type: 'button', text: '▶ 3D video lesson', onclick: () => { location.hash = '#/topic/' + t.id; setTimeout(() => C.openVideo(t.id), 900); } }) : null, t.lab ? h('button', { class: 'cx-btn', type: 'button', text: '🧪 See it in 3D: ' + LABS[t.lab].title, onclick: () => goLab(t.lab) }) : null, h('button', { class: 'cx-btn', type: 'button', text: '🔊 Listen', onclick: () => speak(t.title + '. ' + t.summary) })),
        funFor(t) ? h('div', { class: 'cx-funtip' }, h('b', { text: '🎵 Easy way to remember' }), h('p', { text: funFor(t).trick }), h('button', { class: 'cx-link', type: 'button', text: 'Open in Fun Zone', onclick: () => { S.funSel = funFor(t).id; save(); location.hash = '#/campus/fun'; } })) : null,
        h('p', { class: 'cx-note', text: 'Ask the AI teacher until it makes sense, then mark it understood.' }), h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'I understand it →', onclick: () => { markStage(t, 'u'); next(); } })));
    }
    if (studyStage === 'p') {
      ap(left, h('h3', { text: '🎯 Practice' }));
      if (t.quiz) ap(left, h('p', { class: 'cx-note', text: 'Answer 4 questions. Pass with 3 or more.' }), quizWidget(t.quiz, (sc) => { if (sc >= 3) { const st = subjState(t.id); st.best = Math.max(st.best, sc); st.tries++; if (!st.done) { st.done = true; checkAssign(); } markStage(t, 'p'); save(); ap(left, nextBtn()); } }));
      else ap(left, h('p', { text: 'Biology practice is the quiz inside the 3D lesson.' }), h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Take the 3D lesson quiz', onclick: () => { location.hash = '#/topic/' + t.id; } }), stageDone(t, 'p') ? nextBtn() : h('span', { class: 'cx-chip', text: 'Ticks itself when you pass' })));
    }
    if (studyStage === 'r') {
      ap(left, h('h3', { text: '📖 Read' }), h('p', { text: t.summary }), h('ul', { class: 'cx-points' }, t.points.map((p) => h('li', { text: p }))),
        h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn', type: 'button', text: '🔊 Read aloud', onclick: () => speak(t.title + '. ' + t.summary + ' ' + t.points.join(' ')) }), h('button', { class: 'cx-btn', type: 'button', text: 'Stop', onclick: () => stopSpeech() }), h('a', { class: 'cx-btn', href: 'https://ncert.nic.in/textbook.php', target: '_blank', rel: 'noopener noreferrer', text: 'NCERT textbook' })),
        (t.iq || []).length ? h('div', {}, h('h4', { text: 'Important questions' }), ...(t.iq || []).map(([m, q, a]) => h('details', { class: 'cx-iqd' }, h('summary', {}, h('span', { class: 'cx-mk', text: m + 'M' }), ' ' + q), h('p', { text: a })))) : null,
        h('div', { class: 'cx-row', style: 'margin-top:10px' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'I have read it →', onclick: () => { markStage(t, 'r'); next(); } })));
    }
    if (studyStage === 'w') {
      const [q, kws, model] = t.w || ['Explain ' + t.title + ' in your own words.', kwFrom(t.points), t.summary];
      const st = stState(t.id), ta = h('textarea', { class: 'cx-write', rows: 8, placeholder: 'Write your answer here, in your own words…' }); ta.value = st.draft || ''; ta.oninput = () => { st.draft = ta.value; save(); };
      const out = h('div', { class: 'cx-wcheck' }), modelEl = h('div', { class: 'cx-model', hidden: true }, h('b', { text: 'Model answer' }), h('p', { text: model }));
      ap(left, h('h3', { text: '✍️ Write' }), h('p', { class: 'cx-big', text: q }), h('p', { class: 'cx-note', text: 'Write it as you would in an exam. The checker looks for the key terms an examiner expects.' }), ta,
        h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: 'Check my answer', onclick: () => { const r = checkWriting(ta.value, kws); out.replaceChildren(...[h('p', {}, h('b', { text: r.pct + '% of key terms · ' + r.words + ' words' })), r.hit.length ? h('p', { class: 'ok', text: '✓ Included: ' + r.hit.join(', ') }) : null, r.miss.length ? h('p', { class: 'bad', text: '✗ Missing: ' + r.miss.join(', ') }) : null, h('p', { class: 'cx-note', text: r.pct >= 60 ? 'Well written! Compare with the model answer to polish it.' : 'Add the missing terms and explain them, then check again.' })].filter(Boolean)); if (r.pct >= 60 && r.words >= 15) { markStage(t, 'w'); out.append(nextBtn()); } } }), h('button', { class: 'cx-btn', type: 'button', text: 'Show model answer', onclick: () => { modelEl.hidden = !modelEl.hidden; } }), h('button', { class: 'cx-btn', type: 'button', text: 'Ask AI to review', onclick: () => teacher.ask('Please review my answer to "' + q + '": ' + (ta.value || '(empty)')) })), out, modelEl);
    }
    if (studyStage === 'e') {
      ap(left, h('h3', { text: '🧪 Execute' }));
      if (t.lab) { const done = stageDone(t, 'e'); ap(left, h('p', { text: 'Do it yourself in the 3D lab: ' + LABS[t.lab].title + '. Finish every step to complete this topic.' }), h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: done ? 'Open the lab again' : 'Start the 3D lab', onclick: () => goLab(t.lab) }), done ? h('span', { class: 'cx-chip ok', text: 'Lab completed' }) : null)); }
      const acts = [['Teach it', 'Explain this topic to a family member in 2 minutes without looking at notes.'], ['Mind map', 'Draw a one-page mind map with the topic in the centre and every key point as a branch.'], ['Real life', 'Find 2 places where you see this topic at home, school or outside, and write them down.']];
      ap(left, h('h4', { text: t.lab ? 'Or do an activity' : 'Do one activity' }), ...acts.map(([a, d]) => h('div', { class: 'cx-vrow' }, h('span', { class: 'ic', text: '✔' }), h('span', {}, h('b', { text: a }), h('small', { text: d })), h('button', { class: 'cx-btn', type: 'button', text: 'Done', onclick: () => { stState(t.id).act = a; markStage(t, 'e'); C.render(); } }))));
      if (STAGES.every(([k]) => stageDone(t, k))) ap(left, h('p', { class: 'cx-done5', text: '⭐ All 5 steps complete. You have mastered "' + t.title + '"!' }), nextBtn('Back to topics'));
    }
    body.append(left, h('div', { class: 'cx-card glass cx-ai-card' }, teacher.el)); main.append(body);
  }

  /* ================= FUN ZONE: Where Difficult Concepts Become Fun ================= */
  S.games = S.games || {}; S.funSeen = S.funSeen || {};
  // Each card: a difficult concept, why students find it hard, a memory trick, an original chant to sing, a picture story, and a quick check.
  const FUN = [
    // ---- Maths
    { id: 'f-bodmas', subj: 'Maths', topic: 'ma-linear', title: 'Order of operations (BODMAS)', why: 'Students solve left to right and get the wrong answer.', trick: 'BODMAS: Brackets → Orders (powers, roots) → Division and Multiplication (left to right) → Addition and Subtraction (left to right).', chant: ['Brackets first, open the door,', 'Orders next, the powers soar,', 'Divide, multiply, left to right,', 'Add, subtract, and you get it right!'], story: '📦 → ⚡ → ➗✖️ → ➕➖', check: ['8 + 2 × 5 = ?', ['50', '18', '20', '15'], 1] },
    { id: 'f-trig', subj: 'Maths', topic: 'ma-trig', title: 'Trigonometric ratios', why: 'sin, cos and tan look alike and are easy to mix up.', trick: 'SOH CAH TOA — Sin = Opposite/Hypotenuse, Cos = Adjacent/Hypotenuse, Tan = Opposite/Adjacent. Values of sin at 0°, 30°, 45°, 60°, 90°: √0/2, √1/2, √2/2, √3/2, √4/2. Cos is the same list backwards.', chant: ['SOH, sine is opposite over hyp,', 'CAH, cosine adjacent, take a trip,', 'TOA, tangent opposite over adjacent,', 'Three little words, and the answer\'s evident!'], story: '📐 S-O-H · C-A-H · T-O-A', check: ['sin 30° = ?', ['√3/2', '1/2', '1', '0'], 1] },
    { id: 'f-identities', subj: 'Maths', topic: 'ma-identities', title: '(a + b)² identity', why: 'Students write (a + b)² = a² + b² and forget the middle term.', trick: 'Square the first, square the last, twice the product in the middle — never skip the middle!', chant: ['First one squared, that is a²,', 'Last one squared, b² too,', 'Twice the product sits in between,', '2ab, keep it clean!'], story: '🟥a² + 🟨ab + 🟨ab + 🟦b² = (a+b)²', check: ['(x + 3)² = ?', ['x² + 9', 'x² + 6x + 9', 'x² + 3x + 9', '2x + 6'], 1] },
    { id: 'f-integers', subj: 'Maths', topic: 'ma-linear', title: 'Multiplying negative numbers', why: 'Why is (−) × (−) positive?', trick: 'Friends and enemies: a friend of a friend is a friend (+ × + = +); an enemy of an enemy is a friend (− × − = +); a friend of an enemy is an enemy (+ × − = −).', chant: ['Plus times plus, a happy face,', 'Minus times minus, also in place,', 'Mix the signs, a minus you\'ll see,', 'Same is plus, different is minus — easy!'], story: '😊×😊=😊 · 😠×😠=😊 · 😊×😠=😠', check: ['(−4) × (−5) = ?', ['−20', '20', '−9', '9'], 1] },
    { id: 'f-fractions', subj: 'Maths', topic: 'ma-linear', title: 'Dividing fractions', why: 'Students divide the tops and bottoms and get it wrong.', trick: 'Keep, Change, Flip: keep the first fraction, change ÷ to ×, flip the second fraction.', chant: ['Keep the first, don\'t let it go,', 'Change divide to times, you know,', 'Flip the second upside down,', 'Multiply — and wear the crown!'], story: '½ ÷ ¾ → ½ × 4/3 = 4/6 = ⅔', check: ['2/3 ÷ 1/3 = ?', ['2/9', '2', '1/2', '6'], 1] },
    // ---- Science
    { id: 'f-periodic', subj: 'Science', topic: 'ch-periodic', title: 'First 20 elements of the periodic table', why: '20 symbols in order are hard to memorise.', trick: '"Hi Hello, Little Bunny Bought Cheap New Oranges From Nepal; Naughty Magpie Always Sings Purple Songs Close Around King\'s Castle." → H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca.', chant: ['H, He, Li, Be, B — Hi Hello Little Bunny Bought,', 'C, N, O, F, Ne — Cheap New Oranges From Nepal,', 'Na, Mg, Al, Si, P — Naughty Magpie Always Sings Purple,', 'S, Cl, Ar, K, Ca — Songs Close Around King\'s Castle!'], story: '👋🐰🍊🇳🇵 · 🐦🎶🏰', special: 'periodic', check: ['Which element is number 11?', ['Neon', 'Sodium', 'Magnesium', 'Potassium'], 1] },
    { id: 'f-reactivity', subj: 'Science', topic: 'ch-metals', title: 'Reactivity series of metals', why: '13 metals in order, used for displacement questions.', trick: '"Please Send Cats, Monkeys And Zebras In Large Hired Cages Made Sturdily Guarded" → K, Na, Ca, Mg, Al, Zn, Fe, Pb, H, Cu, Hg, Ag, Au (most to least reactive).', chant: ['Potassium, sodium, calcium on top,', 'Magnesium, aluminium, zinc don\'t stop,', 'Iron, lead, then hydrogen\'s line,', 'Copper, mercury, silver, gold — so fine!'], story: '🐱🐒🦓 in 🏠 cages', check: ['Can copper displace iron from iron sulphate?', ['Yes', 'No, copper is less reactive', 'Only when hot', 'Only in water'], 1] },
    { id: 'f-vibgyor', subj: 'Science', topic: 'ph-light', title: 'Colours of the spectrum', why: 'The order of the 7 colours after dispersion through a prism.', trick: 'VIBGYOR (from the bottom of the spectrum) — Violet, Indigo, Blue, Green, Yellow, Orange, Red. Red bends the least, violet the most.', chant: ['Violet bends the most of all,', 'Indigo, blue, then green stands tall,', 'Yellow, orange, red on top,', 'VIBGYOR — the rainbow won\'t stop!'], story: '🟣🔵🔷🟢🟡🟠🔴', check: ['Which colour bends the most in a prism?', ['Red', 'Violet', 'Green', 'Yellow'], 1] },
    { id: 'f-heart', subj: 'Science', topic: 'heart', title: 'Blood flow through the heart', why: 'Many chambers, valves and vessels in a fixed order.', trick: 'Valves in the order blood meets them: "Try Pulling My Aorta" → Tricuspid, Pulmonary, Mitral (bicuspid), Aortic. Right side to the lungs, left side to the body.', chant: ['Body blue comes to the right atrium door,', 'Tricuspid, ventricle, pulmonary to the lungs to explore,', 'Back red to the left, through the mitral gate,', 'Aortic valve, aorta — the body\'s on its plate!'], story: '🫀 R→🫁→L→🧍', check: ['Which valve is between the left atrium and left ventricle?', ['Tricuspid', 'Mitral (bicuspid)', 'Pulmonary', 'Aortic'], 1] },
    { id: 'f-mitosis', subj: 'Science', topic: 'mitosis', title: 'Stages of mitosis', why: 'Four stages with similar-sounding names.', trick: 'PMAT: "Please Make Another Two" — Prophase (chromosomes appear), Metaphase (middle line), Anaphase (apart), Telophase (two nuclei).', chant: ['Prophase, the chromosomes show,', 'Metaphase, lined in the middle row,', 'Anaphase, pulled apart they go,', 'Telophase, two new nuclei grow!'], story: '🧶 → ➖ → ↔️ → 👯', check: ['In which stage do chromosomes line up in the middle?', ['Prophase', 'Metaphase', 'Anaphase', 'Telophase'], 1] },
    { id: 'f-taxonomy', subj: 'Science', topic: 'mendel', title: 'Taxonomic hierarchy', why: 'Seven levels of classification in order.', trick: '"King Philip Came Over For Good Soup" → Kingdom, Phylum, Class, Order, Family, Genus, Species.', chant: ['Kingdom is the biggest crowd,', 'Phylum, class, they say it loud,', 'Order, family, genus near,', 'Species — just one kind is here!'], story: '👑 → 🏰 → 🏫 → 📋 → 👨‍👩‍👧 → 🧬 → 🐯', check: ['Which level comes just after Family?', ['Order', 'Genus', 'Species', 'Class'], 1] },
    { id: 'f-fleming', subj: 'Science', topic: 'ph-current', title: 'Fleming\'s left-hand rule', why: 'Which finger shows force, field and current?', trick: 'Hold your left hand with thumb, first finger and middle finger at right angles: thuMb = Motion (force), First finger = Field, seCond finger = Current. Remember "FBI": Force, B-field, I-current.', chant: ['Thumb shows Motion, push and go,', 'First finger Field, north to south flow,', 'Second finger Current, the charge in the wire,', 'Left hand for motors — now you\'re a live wire!'], story: '👍 Motion · ☝️ Field · 🖕➡ Current', check: ['In Fleming\'s left-hand rule the first finger shows…', ['current', 'magnetic field', 'force', 'voltage'], 1] },
    { id: 'f-newton', subj: 'Science', topic: 'ph-force', title: 'Newton\'s three laws', why: 'Students confuse inertia, F = ma and action–reaction.', trick: '1 — Lazy law (objects keep doing what they are doing: inertia). 2 — Push law (F = m × a). 3 — Pair law (every action has an equal and opposite reaction).', chant: ['One: at rest I stay, in motion I glide,', 'Two: force is mass times acceleration\'s ride,', 'Three: push the wall and the wall pushes back,', 'Newton\'s three laws — now you\'re on track!'], story: '🛋️ inertia · 🏋️ F=ma · 🚀↕️ action-reaction', check: ['A rocket rising by pushing gas down shows Newton\'s…', ['first law', 'second law', 'third law', 'law of gravitation'], 2] },
    // ---- Social Science
    { id: 'f-planets', subj: 'Social Science', topic: 'ss-motions', title: 'Order of the planets', why: 'Eight names in order from the Sun.', trick: '"My Very Educated Mother Just Served Us Noodles" → Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.', chant: ['Mercury, Venus, Earth and Mars,', 'The rocky four, the inner stars,', 'Jupiter, Saturn, Uranus, Neptune,', 'The giants far, they\'ll see you soon!'], story: '☀️ 🪨🪨🌍🔴 · 🟠🪐🔵🔵', check: ['The fifth planet from the Sun is…', ['Mars', 'Jupiter', 'Saturn', 'Earth'], 1] },
    { id: 'f-latlong', subj: 'Social Science', topic: 'ss-globe', title: 'Latitude vs longitude', why: 'Which lines go across and which go up and down?', trick: 'LATitude lines lie FLAT like the rungs of a LADDER (east–west, measured north–south). LONGitude lines are LONG from pole to pole.', chant: ['Lat is flat, like a ladder\'s rung,', 'Long is long, from top it\'s hung,', 'Equator zero, the middle belt,', 'Greenwich zero, the meridian felt!'], story: '🪜 latitude · 🍊 longitude segments', check: ['Lines that run from pole to pole are…', ['latitudes', 'longitudes', 'tropics', 'equators'], 1] },
    { id: 'f-freedom', subj: 'Social Science', topic: 'ss-constitution', title: 'Timeline of India\'s freedom struggle', why: 'Many dates and events to remember in order.', trick: '1857 Revolt · 1885 Congress born · 1905 Bengal split · 1919 Jallianwala Bagh · 1920 Non-Cooperation · 1930 Dandi March · 1942 Quit India · 1947 Freedom!', chant: ['Eighteen fifty-seven, the first revolt,', 'Eighty-five, the Congress was born,', 'Nineteen-oh-five, Bengal was torn,', 'Nineteen, Jallianwala\'s pain,', 'Twenty, non-cooperation\'s campaign,', 'Thirty, salt at Dandi\'s shore,', 'Forty-two, Quit India\'s roar,', 'Forty-seven, free for evermore!'], story: '⚔️ → 🏛️ → ✂️ → 💔 → ✋ → 🧂 → 📢 → 🇮🇳', check: ['The Dandi (Salt) March was in…', ['1920', '1930', '1942', '1919'], 1] },
    { id: 'f-rights', subj: 'Social Science', topic: 'ss-constitution', title: 'Six Fundamental Rights', why: 'Six rights with long names.', trick: '"Every Fine Elephant Remembers Culture and the Constitution" → Equality, Freedom, against Exploitation, freedom of Religion, Cultural and educational rights, Constitutional remedies.', chant: ['Equality for all, the first we hold,', 'Freedom to speak, to move, be bold,', 'No exploitation, religion free,', 'Culture, education, and remedies — that\'s six, you see!'], story: '⚖️ 🕊️ ⛓️‍💥 🛕 🎭 🏛️', check: ['Which right lets you go to court if your rights are violated?', ['Right to Equality', 'Right to Constitutional Remedies', 'Right to Freedom', 'Cultural rights'], 1] },
    { id: 'f-neighbours', subj: 'Social Science', topic: 'ss-india', title: 'India\'s neighbours', why: 'Seven land neighbours plus island neighbours.', trick: 'Land: Pakistan, Afghanistan, China, Nepal, Bhutan, Bangladesh, Myanmar — "Proud Animals Can Never Be Badly Mannered". By sea: Sri Lanka and Maldives.', chant: ['West is Pakistan, Afghanistan near,', 'North is China, Nepal, Bhutan clear,', 'East, Bangladesh, Myanmar\'s land,', 'South, Sri Lanka, Maldives by sand!'], story: '⬅️🇵🇰 ⬆️🇨🇳🇳🇵🇧🇹 ➡️🇧🇩🇲🇲 ⬇️🇱🇰🇲🇻', check: ['Which neighbour shares the longest land border with India?', ['China', 'Pakistan', 'Bangladesh', 'Nepal'], 2] },
    // ---- Computers
    { id: 'f-binary', subj: 'Computers', topic: 'co-binary', title: 'Binary place values', why: 'Converting between binary and decimal.', trick: 'Each place doubles from the right: 1, 2, 4, 8, 16, 32, 64, 128. Add the places that have a 1.', chant: ['One, two, four, eight,', 'Sixteen, thirty-two, keep it straight,', 'Sixty-four, one-twenty-eight,', 'Add the ones — the number\'s great!'], story: '💡💡💡💡💡💡💡💡 = 255', check: ['(1010)₂ = ?', ['10', '12', '5', '1010'], 0] },
    { id: 'f-gates', subj: 'Computers', topic: 'co-logic', title: 'Logic gates', why: 'Which gate gives 1 when?', trick: 'AND needs ALL, OR needs ONE, NOT flips it, XOR needs ONLY ONE (they must differ). NAND and NOR are the opposites of AND and OR.', chant: ['AND wants everyone to say yes,', 'OR is happy with one, no less,', 'NOT turns yes to no, no to yes,', 'XOR wants different — what a mess!'], story: '🤝 AND · 🙋 OR · 🔄 NOT · ⚡ XOR', check: ['OR gate output with A = 0, B = 1 is…', ['0', '1', '2', 'error'], 1] },
    { id: 'f-units', subj: 'Computers', topic: 'co-memory', title: 'Memory units', why: 'Bits, bytes, KB, MB, GB, TB in order.', trick: '"Big Bears Kick Many Giant Turnips" → bit, byte, kilobyte, megabyte, gigabyte, terabyte. 8 bits = 1 byte; after that, each step × 1024.', chant: ['Eight little bits make one byte,', 'Times one-oh-two-four, take a flight,', 'Kilo, mega, giga, tera,', 'Memory units — no more error!'], story: '🐻🐻🦵🍠', check: ['1 MB = ?', ['1000 bytes', '1024 KB', '1024 GB', '8 KB'], 1] },
    { id: 'f-flowchart', subj: 'Computers', topic: 'co-sorting', title: 'Flowchart symbols', why: 'Which shape means what?', trick: 'Oval = start/stop (like an egg: beginning and end). Parallelogram = input/output (tilted like data flowing in). Rectangle = process (a box to work in). Diamond = decision (two ways out: yes/no).', chant: ['Oval starts and oval ends,', 'Parallelogram, input it sends,', 'Rectangle works, a process box,', 'Diamond asks, and yes or no unlocks!'], story: '⬭ ▱ ▭ ◇', check: ['A decision in a flowchart uses a…', ['rectangle', 'oval', 'diamond', 'circle'], 2] },
    // ---- EVS
    { id: 'f-watercycle', subj: 'EVS', topic: 'ev-water', title: 'Steps of the water cycle', why: 'Four steps with long words.', trick: 'E-C-P-C: "Every Cloud Pours Cool water" → Evaporation, Condensation, Precipitation, Collection.', chant: ['Sun shines down, water goes up — evaporation!', 'Up it cools, the clouds come — condensation!', 'Clouds get heavy, rain falls — precipitation!', 'Rivers fill, back to sea — collection!'], story: '☀️💧⬆️ ☁️ 🌧️ 🌊', check: ['Clouds are formed by…', ['evaporation', 'condensation', 'collection', 'melting'], 1] },
    { id: 'f-food', subj: 'EVS', topic: 'ev-food', title: 'Nutrients and their jobs', why: 'Which nutrient does which job?', trick: 'GO, GROW, GLOW: GO foods give energy (carbohydrates, fats), GROW foods build the body (proteins), GLOW foods protect (vitamins, minerals).', chant: ['Rice and roti make me GO,', 'Dal and milk help me GROW,', 'Fruits and veggies make me GLOW,', 'Water and fibre keep the flow!'], story: '🍚 GO · 🥛 GROW · 🥕 GLOW', check: ['Dal and eggs are mainly…', ['GO foods', 'GROW foods', 'GLOW foods', 'junk food'], 1] },
    { id: 'f-3r', subj: 'EVS', topic: 'ev-waste', title: 'The 3 Rs', why: 'Remembering the best order to manage waste.', trick: 'Reduce first (best), then Reuse, then Recycle. The fewer things you throw, the cleaner the planet.', chant: ['Reduce what you buy and use,', 'Reuse jars and bags and shoes,', 'Recycle paper, glass and tin,', 'Green and blue bins — let\'s all win!'], story: '⬇️ ♻️ 🔁', check: ['Which R is the best for the planet?', ['Recycle', 'Reuse', 'Reduce', 'Remove'], 2] },
    // ---- Physical Education
    { id: 'f-rice', subj: 'Physical Education', topic: 'pe-firstaid', title: 'First aid for a sprain', why: 'In a panic, steps get forgotten.', trick: 'RICE: Rest, Ice (wrapped, 15–20 minutes), Compression (crepe bandage), Elevation (raise it above the heart).', chant: ['Rest it now, don\'t play on,', 'Ice it, wrapped, till pain is gone,', 'Compress it with a bandage tight,', 'Elevate it — you\'ll be all right!'], story: '🛑 🧊 🩹 ⬆️', check: ['The E in RICE stands for…', ['Exercise', 'Elevation', 'Emergency', 'Energy'], 1] },
    { id: 'f-fitness', subj: 'Physical Education', topic: 'pe-fitness', title: 'Five health-related fitness components', why: 'Five long names to remember.', trick: '"Every Strong Muscle Feels Better" → Endurance (cardiovascular), Strength, Muscular endurance, Flexibility, Body composition.', chant: ['Run and skip for endurance strong,', 'Push-ups for strength all day long,', 'Planks for muscles that last and last,', 'Stretch for flexibility — eat well, not fast!'], story: '🏃 💪 🧘 ⚖️', check: ['The sit-and-reach test measures…', ['strength', 'flexibility', 'speed', 'endurance'], 1] },
  ];
  const FUN_SUBJ = ['Maths', 'Science', 'Social Science', 'Computers', 'EVS', 'Physical Education'];
  const FUN_ICON = { Maths: '📐', Science: '🔬', 'Social Science': '🌍', Computers: '💻', EVS: '🌱', 'Physical Education': '🏃' };
  function funFor(t) { return FUN.find((f) => f.topic === t.id) || null; }
  /* singing: speech line by line on a simple beat (Web Audio) */
  let singing = null;
  function beat(ac, t, hi) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(hi ? 180 : 110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.2); }
  function sing(lines, els, onEnd) {
    stopSing(); const ac = (window.__cxAC = window.__cxAC || new (window.AudioContext || window.webkitAudioContext)()); try { ac.resume(); } catch (e) {}
    let i = 0, alive = true; singing = { stop: () => { alive = false; try { speechSynthesis.cancel(); } catch (e) {} els.forEach((e) => e.classList.remove('now')); } };
    const next = () => {
      if (!alive) return; els.forEach((e, k) => e.classList.toggle('now', k === i));
      if (i >= lines.length) { singing = null; onEnd && onEnd(); return; }
      const t0 = ac.currentTime; for (let b = 0; b < 4; b++) beat(ac, t0 + b * 0.45, b === 0);
      let done = false; const go = () => { if (done) return; done = true; i++; setTimeout(next, 120); };
      try { const u = new SpeechSynthesisUtterance(lines[i]); u.rate = 1.02; u.pitch = 1.25 + (i % 2) * 0.15; u.lang = 'en-IN'; u.onend = go; u.onerror = go; speechSynthesis.speak(u); } catch (e) {}
      setTimeout(go, Math.max(1800, lines[i].length * 85));
    };
    next();
  }
  function stopSing() { if (singing) singing.stop(); singing = null; }
  addEventListener('hashchange', stopSing);
  function renderFun(main) {
    const cur = S.funSubj || 'Maths', sel = S.funSel && FUN.find((f) => f.id === S.funSel);
    main.append(h('div', { class: 'cx-fun-hero' }, h('span', { class: 'eyebrow', text: 'Fun Zone' }), h('h1', { html: 'Where difficult concepts <em>become fun.</em>' }), h('p', { class: 'cx-lead', text: 'The hardest topics from every subject, turned into memory tricks, chants you can sing along to, picture stories and quick checks. Bored? Take a brain break or play a game.' }),
      h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: '🎮 Play games', onclick: () => { location.hash = '#/campus/games'; } }), h('button', { class: 'cx-btn', type: 'button', text: '🧘 2-minute brain break', onclick: brainBreak }), h('button', { class: 'cx-btn', type: 'button', text: '⚛️ Periodic table explorer', onclick: () => { S.funSel = 'f-periodic'; save(); C.render(); } }))));
    main.append(h('div', { class: 'cx-chips' }, FUN_SUBJ.map((s) => h('button', { type: 'button', class: 'cx-chipbtn' + (s === cur && !sel ? ' on' : ''), style: '--c:' + (SUBJ_COL[s] || '#7c8cff'), text: FUN_ICON[s] + ' ' + s + ' · ' + FUN.filter((f) => f.subj === s).length, onclick: () => { S.funSubj = s; S.funSel = null; save(); C.render(); } }))));
    if (sel) { main.append(funCard(sel, true)); if (sel.special === 'periodic') main.append(periodicTable()); return; }
    main.append(h('div', { class: 'cx-fun-grid' }, FUN.filter((f) => f.subj === cur).map((f) => funCard(f, false))));
  }
  function funCard(f, big) {
    const lines = f.chant.map((l) => h('p', { class: 'cx-lyric', text: l }));
    const res = h('p', { class: 'cx-note' }); let answered = false;
    const card = h('article', { class: 'cx-fun' + (big ? ' big' : ''), style: '--c:' + (SUBJ_COL[f.subj] || '#7c8cff') },
      h('div', { class: 'cx-fun-top' }, h('span', { class: 'cx-chip', text: FUN_ICON[f.subj] + ' ' + f.subj }), S.funSeen[f.id] ? h('span', { class: 'cx-chip ok', text: '✓ learned' }) : null),
      h('h3', { text: f.title }), h('p', { class: 'cx-fun-why', text: '😵 Why it\'s hard: ' + f.why }),
      h('div', { class: 'cx-fun-trick' }, h('b', { text: '🧠 The trick' }), h('p', { text: f.trick })),
      h('div', { class: 'cx-fun-story', text: f.story }),
      h('div', { class: 'cx-fun-song' }, h('b', { text: '🎵 Sing it' }), ...lines, h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: '▶ Sing along', onclick: () => sing(f.chant, lines) }), h('button', { class: 'cx-btn', type: 'button', text: '■ Stop', onclick: stopSing }))),
      h('div', { class: 'cx-fun-check' }, h('b', { text: '✅ Quick check: ' + f.check[0] }), h('div', { class: 'cx-qopts' }, f.check[1].map((o, i) => h('button', { class: 'cx-btn', type: 'button', text: o, onclick: (e) => { if (answered) return; answered = true; e.target.classList.add(i === f.check[2] ? 'right' : 'wrong'); if (i === f.check[2]) { S.funSeen[f.id] = Date.now(); save(); res.textContent = 'Correct! You\'ve got this trick. 🎉'; confetti(); } else { res.textContent = 'Not quite — sing the chant once more and try again.'; setTimeout(() => { answered = false; e.target.classList.remove('wrong'); }, 1200); } } }))), res),
      h('div', { class: 'cx-row' }, !big ? h('button', { class: 'cx-btn', type: 'button', text: 'Open', onclick: () => { S.funSel = f.id; save(); C.render(); } }) : h('button', { class: 'cx-btn', type: 'button', text: '← All ' + f.subj + ' tricks', onclick: () => { S.funSel = null; S.funSubj = f.subj; save(); C.render(); } }), findTopic(f.topic) ? h('button', { class: 'cx-btn', type: 'button', text: '📚 Study this topic', onclick: () => { S.studySel = f.topic; studyStage = 'u'; save(); location.hash = '#/campus/study'; } }) : null));
    return card;
  }
  function confetti() { const box = h('div', { class: 'cx-confetti', 'aria-hidden': 'true' }); for (let i = 0; i < 40; i++) box.append(h('i', { style: 'left:' + Math.random() * 100 + '%;background:hsl(' + Math.floor(Math.random() * 360) + ',90%,60%);animation-delay:' + (Math.random() * 0.4).toFixed(2) + 's;transform:rotate(' + Math.floor(Math.random() * 360) + 'deg)' })); document.body.append(box); setTimeout(() => box.remove(), 2200); }
  /* periodic table explorer */
  const EL = 'H Hydrogen,He Helium,Li Lithium,Be Beryllium,B Boron,C Carbon,N Nitrogen,O Oxygen,F Fluorine,Ne Neon,Na Sodium,Mg Magnesium,Al Aluminium,Si Silicon,P Phosphorus,S Sulphur,Cl Chlorine,Ar Argon,K Potassium,Ca Calcium,Sc Scandium,Ti Titanium,V Vanadium,Cr Chromium,Mn Manganese,Fe Iron,Co Cobalt,Ni Nickel,Cu Copper,Zn Zinc,Ga Gallium,Ge Germanium,As Arsenic,Se Selenium,Br Bromine,Kr Krypton,Rb Rubidium,Sr Strontium,Y Yttrium,Zr Zirconium,Nb Niobium,Mo Molybdenum,Tc Technetium,Ru Ruthenium,Rh Rhodium,Pd Palladium,Ag Silver,Cd Cadmium,In Indium,Sn Tin,Sb Antimony,Te Tellurium,I Iodine,Xe Xenon,Cs Caesium,Ba Barium,La Lanthanum,Ce Cerium,Pr Praseodymium,Nd Neodymium,Pm Promethium,Sm Samarium,Eu Europium,Gd Gadolinium,Tb Terbium,Dy Dysprosium,Ho Holmium,Er Erbium,Tm Thulium,Yb Ytterbium,Lu Lutetium,Hf Hafnium,Ta Tantalum,W Tungsten,Re Rhenium,Os Osmium,Ir Iridium,Pt Platinum,Au Gold,Hg Mercury,Tl Thallium,Pb Lead,Bi Bismuth,Po Polonium,At Astatine,Rn Radon,Fr Francium,Ra Radium,Ac Actinium,Th Thorium,Pa Protactinium,U Uranium,Np Neptunium,Pu Plutonium,Am Americium,Cm Curium,Bk Berkelium,Cf Californium,Es Einsteinium,Fm Fermium,Md Mendelevium,No Nobelium,Lr Lawrencium,Rf Rutherfordium,Db Dubnium,Sg Seaborgium,Bh Bohrium,Hs Hassium,Mt Meitnerium,Ds Darmstadtium,Rg Roentgenium,Cn Copernicium,Nh Nihonium,Fl Flerovium,Mc Moscovium,Lv Livermorium,Ts Tennessine,Og Oganesson'.split(',').map((x, i) => { const [s, n] = x.split(' '); return { z: i + 1, s, n }; });
  const MASS = [1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35.5, 40, 39, 40];
  const CAT = { nonmetal: [1, 6, 7, 8, 15, 16, 34], noble: [2, 10, 18, 36, 54, 86, 118], halogen: [9, 17, 35, 53, 85, 117], alkali: [3, 11, 19, 37, 55, 87], alkaline: [4, 12, 20, 38, 56, 88], metalloid: [5, 14, 32, 33, 51, 52], post: [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116] };
  const CAT_NAME = { nonmetal: 'Non-metal', noble: 'Noble gas', halogen: 'Halogen', alkali: 'Alkali metal', alkaline: 'Alkaline earth metal', metalloid: 'Metalloid', post: 'Post-transition metal', transition: 'Transition metal', lanth: 'Lanthanide', act: 'Actinide' };
  const catOf = (z) => { for (const k in CAT) if (CAT[k].includes(z)) return k; if (z >= 57 && z <= 71) return 'lanth'; if (z >= 89 && z <= 103) return 'act'; return 'transition'; };
  function posOf(z) {
    if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
    const P = [[3, 10, 2], [11, 18, 3], [19, 36, 4], [37, 54, 5], [55, 86, 6], [87, 118, 7]];
    for (const [a, b, p] of P) { if (z < a || z > b) continue; const i = z - a;
      if (p <= 3) return [p, i < 2 ? i + 1 : i + 11];
      if (p <= 5) return [p, i + 1];
      if (i < 2) return [p, i + 1];
      if (i <= 16) return [p === 6 ? 9 : 10, i + 2];
      return [p, i - 13]; }
  }
  function periodicTable() {
    const info = h('div', { class: 'cx-el-info' }, h('p', { class: 'cx-note', text: 'Click any element. Use "Play the chant" to light up the first 20 as you sing, or start the "Find it" game.' }));
    const cells = EL.map((e) => { const [r, c] = posOf(e.z), k = catOf(e.z); const b = h('button', { type: 'button', class: 'cx-el ' + k, style: 'grid-row:' + r + ';grid-column:' + c, title: e.n }, h('small', { text: String(e.z) }), h('b', { text: e.s })); b.onclick = () => { if (hunt) return huntPick(e, b); info.replaceChildren(h('div', { class: 'cx-el-big ' + k }, h('small', { text: String(e.z) }), h('b', { text: e.s })), h('div', {}, h('h4', { text: e.n }), h('p', { text: CAT_NAME[k] + ' · Period ' + (e.z >= 57 && e.z <= 71 ? 6 : e.z >= 89 && e.z <= 103 ? 7 : r) + (e.z >= 57 && e.z <= 71 || e.z >= 89 && e.z <= 103 ? ' · f-block' : ' · Group ' + c) }), MASS[e.z - 1] ? h('p', { text: 'Atomic mass ≈ ' + MASS[e.z - 1] + ' u · ' + e.z + ' protons, ' + e.z + ' electrons' }) : h('p', { text: e.z + ' protons and ' + e.z + ' electrons' }))); speak(e.n); }; return b; });
    const grid = h('div', { class: 'cx-ptable' }, cells, h('span', { class: 'cx-pt-gap', style: 'grid-row:8;grid-column:1/19' }));
    let hunt = null; const hud = h('span', { class: 'cx-chip a', text: '' });
    const huntNext = () => { const pool = EL.slice(0, hunt.max); hunt.cur = pool[Math.floor(Math.random() * pool.length)]; hud.textContent = 'Find: ' + hunt.cur.n + ' · score ' + hunt.score + '/' + hunt.n; };
    const huntPick = (e, b) => { hunt.n++; if (e.z === hunt.cur.z) { hunt.score++; b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 500); } if (hunt.n >= 10) { const sc = hunt.score; hud.textContent = 'Done! ' + sc + '/10'; hunt = null; if (sc >= 8) confetti(); return; } huntNext(); };
    const legend = h('div', { class: 'cx-legend' }, Object.entries(CAT_NAME).map(([k, n]) => h('span', { class: 'cx-el ' + k }, n)));
    return h('div', { class: 'cx-card glass' }, h('h3', { text: '⚛️ Periodic table explorer' }),
      h('div', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', type: 'button', text: '🎵 Play the chant (first 20)', onclick: () => { const ch = FUN.find((f) => f.id === 'f-periodic').chant, groups = [[0, 5], [5, 10], [10, 15], [15, 20]]; const fake = ch.map(() => ({ classList: { toggle: () => {}, remove: () => {} } })); let li = 0; const light = () => { cells.forEach((c, k) => c.classList.toggle('lit', k >= groups[li][0] && k < groups[li][1])); }; light(); sing(ch, fake.map((f, k) => ({ classList: { toggle: (cls, on) => { if (on && k !== li) { li = k; if (groups[k]) light(); } }, remove: () => cells.forEach((c) => c.classList.remove('lit')) } }))); } }),
        h('button', { class: 'cx-btn', type: 'button', text: '🎯 Find it (first 20)', onclick: () => { hunt = { max: 20, score: 0, n: 0 }; huntNext(); } }), h('button', { class: 'cx-btn', type: 'button', text: '🎯 Find it (first 36)', onclick: () => { hunt = { max: 36, score: 0, n: 0 }; huntNext(); } }), hud),
      h('div', { class: 'cx-ptwrap' }, grid), legend, info);
  }
  /* brain break: guided 2-minute movement and breathing */
  function brainBreak() {
    const STEPS = [['🙆', 'Stretch up high', 'Reach both arms to the sky and stretch tall.', 15], ['🔄', 'Neck rolls', 'Slowly roll your head in a circle, then the other way.', 15], ['🤸', 'Jumping jacks', 'Do 15 jumping jacks. Land softly!', 20], ['🦵', 'High knees', 'March in place, knees up high.', 20], ['🫁', 'Box breathing', 'Breathe in 4, hold 4, out 4, hold 4.', 32], ['😌', 'Shake it out', 'Shake your hands and feet loose and smile.', 10]];
    const ov = h('div', { id: 'cx-break', role: 'dialog', 'aria-label': 'Brain break' }), card = h('div', { class: 'cx-break-card' }); ov.append(card); document.body.append(ov);
    let i = 0, left = 0, tm = null;
    const close = () => { clearInterval(tm); stopSpeech(); ov.remove(); };
    const show = () => { if (i >= STEPS.length) { card.replaceChildren(h('div', { class: 'cx-break-ic', text: '🌟' }), h('h2', { text: 'Refreshed!' }), h('p', { text: 'Great job. Your brain is ready to learn again.' }), h('button', { class: 'cx-btn pri', type: 'button', text: 'Back to learning', onclick: close })); speak('Great job. Your brain is ready to learn again.'); confetti(); return; }
      const [ic, t, d, s] = STEPS[i]; left = s; speak(t + '. ' + d);
      const sec = h('b', { class: 'cx-break-sec', text: String(left) });
      card.replaceChildren(h('button', { class: 'cx-pop-x', type: 'button', 'aria-label': 'Close', text: '×', onclick: close }), h('small', { class: 'cx-note', text: 'Step ' + (i + 1) + ' of ' + STEPS.length }), h('div', { class: 'cx-break-ic' + (i === 4 ? ' breathe' : ''), text: ic }), h('h2', { text: t }), h('p', { text: d }), sec, h('button', { class: 'cx-btn', type: 'button', text: 'Skip →', onclick: () => { i++; show(); } }));
      clearInterval(tm); tm = setInterval(() => { left--; sec.textContent = String(Math.max(0, left)); if (left <= 0) { clearInterval(tm); i++; show(); } }, 1000); };
    show();
  }

  /* ================= GAMES WITH LEVELS ================= */
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const shuf = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
  const mcq = (q, ans, wrongs) => { const opts = shuf([ans, ...shuf([...new Set(wrongs.map(String))].filter((w) => w !== String(ans))).slice(0, 3)].map(String)); return { q, opts, a: opts.indexOf(String(ans)) }; };
  const numW = (n, spread) => [n + 1, n - 1, n + spread, n - spread, n + 2, n * 2, n + 10].filter((x) => x !== n);
  const STATES = [['Karnataka', 'Bengaluru', 'S'], ['Kerala', 'Thiruvananthapuram', 'S'], ['Tamil Nadu', 'Chennai', 'S'], ['Andhra Pradesh', 'Amaravati', 'S'], ['Telangana', 'Hyderabad', 'S'], ['Goa', 'Panaji', 'W'], ['Maharashtra', 'Mumbai', 'W'], ['Gujarat', 'Gandhinagar', 'W'], ['Rajasthan', 'Jaipur', 'N'], ['Punjab', 'Chandigarh', 'N'], ['Haryana', 'Chandigarh', 'N'], ['Himachal Pradesh', 'Shimla', 'N'], ['Uttarakhand', 'Dehradun', 'N'], ['Uttar Pradesh', 'Lucknow', 'N'], ['Madhya Pradesh', 'Bhopal', 'C'], ['Chhattisgarh', 'Raipur', 'C'], ['Bihar', 'Patna', 'E'], ['Jharkhand', 'Ranchi', 'E'], ['Odisha', 'Bhubaneswar', 'E'], ['West Bengal', 'Kolkata', 'E'], ['Sikkim', 'Gangtok', 'NE'], ['Assam', 'Dispur', 'NE'], ['Arunachal Pradesh', 'Itanagar', 'NE'], ['Nagaland', 'Kohima', 'NE'], ['Manipur', 'Imphal', 'NE'], ['Mizoram', 'Aizawl', 'NE'], ['Tripura', 'Agartala', 'NE'], ['Meghalaya', 'Shillong', 'NE']];
  const WORLD = [['Japan', 'Tokyo'], ['France', 'Paris'], ['Australia', 'Canberra'], ['Canada', 'Ottawa'], ['Brazil', 'Brasília'], ['United States', 'Washington, D.C.'], ['China', 'Beijing'], ['Russia', 'Moscow'], ['United Kingdom', 'London'], ['Germany', 'Berlin'], ['Egypt', 'Cairo'], ['Nepal', 'Kathmandu'], ['Bhutan', 'Thimphu'], ['Bangladesh', 'Dhaka'], ['Italy', 'Rome'], ['Spain', 'Madrid'], ['Kenya', 'Nairobi'], ['Argentina', 'Buenos Aires'], ['Turkey', 'Ankara'], ['Saudi Arabia', 'Riyadh'], ['New Zealand', 'Wellington'], ['Afghanistan', 'Kabul'], ['Maldives', 'Malé'], ['Pakistan', 'Islamabad']];
  const FORMULAS = [['Area of a circle', 'πr²'], ['Circumference', '2πr'], ['Speed', 'd ÷ t'], ['Ohm\'s law', 'V = IR'], ['Force', 'F = ma'], ['Density', 'm ÷ V'], ['Pressure', 'F ÷ A'], ['Pythagoras', 'a² + b² = c²'], ['Volume of cylinder', 'πr²h'], ['(a + b)²', 'a² + 2ab + b²'], ['Simple interest', 'PRT ÷ 100'], ['Power of a lens', '1 ÷ f'], ['Euler\'s formula', 'F + V − E = 2'], ['Work', 'W = F × s'], ['Water', 'H₂O'], ['Photosynthesis gas out', 'O₂']];
  const GAMES = [
    { id: 'math', title: 'Maths Sprint', icon: '⚡', subj: 'Maths', desc: 'Fast mental maths. 10 levels from adding to solving for x.', levels: ['Add within 20', 'Subtract within 50', 'Tables 2–5', 'Tables 6–12', 'Mixed + − ×', 'Two-digit addition', 'Squares 1–20', 'Percentages', 'Negative numbers', 'Solve for x'],
      gen(L) { let a, b, q, ans; switch (L) {
        case 1: a = ri(1, 10); b = ri(1, 10); q = a + ' + ' + b; ans = a + b; break;
        case 2: a = ri(10, 50); b = ri(1, a); q = a + ' − ' + b; ans = a - b; break;
        case 3: a = ri(2, 5); b = ri(2, 10); q = a + ' × ' + b; ans = a * b; break;
        case 4: a = ri(6, 12); b = ri(2, 12); q = a + ' × ' + b; ans = a * b; break;
        case 5: { const op = ri(0, 2); a = ri(2, 20); b = ri(2, 12); q = a + [' + ', ' − ', ' × '][op] + b; ans = [a + b, a - b, a * b][op]; break; }
        case 6: a = ri(11, 99); b = ri(11, 99); q = a + ' + ' + b; ans = a + b; break;
        case 7: a = ri(1, 20); q = a + '²'; ans = a * a; break;
        case 8: { const p = [10, 20, 25, 50, 75][ri(0, 4)]; b = ri(1, 20) * 20; q = p + '% of ' + b; ans = p * b / 100; break; }
        case 9: a = ri(-15, 15); b = ri(-15, 15); q = '(' + a + ') + (' + b + ')'; ans = a + b; break;
        default: { const x = ri(-9, 12), m = ri(2, 9), c = ri(-20, 20); q = m + 'x ' + (c < 0 ? '− ' : '+ ') + Math.abs(c) + ' = ' + (m * x + c) + '  →  x = ?'; ans = x; } }
        return mcq(q + (L < 10 ? ' = ?' : ''), ans, numW(ans, L > 6 ? 10 : 3)); } },
    { id: 'elements', title: 'Element Hunter', icon: '⚛️', subj: 'Chemistry', desc: 'Match element names and symbols. Each level adds 10 more elements.', levels: ['Elements 1–10', '1–20', '1–30', '1–40', '1–54', '1–86'],
      gen(L) { const max = [10, 20, 30, 40, 54, 86][L - 1], e = EL[ri(0, max - 1)], pool = EL.slice(0, max).filter((x) => x !== e); return Math.random() < 0.5 ? mcq('Symbol of ' + e.n + '?', e.s, shuf(pool).map((x) => x.s)) : mcq('Which element has the symbol "' + e.s + '"?', e.n, shuf(pool).map((x) => x.n)); } },
    { id: 'binary', title: 'Binary Blaster', icon: '💡', subj: 'Computers', desc: 'Convert between binary and decimal. More bits each level.', levels: ['3 bits', '4 bits', '5 bits', '6 bits', '8 bits'],
      gen(L) { const bits = [3, 4, 5, 6, 8][L - 1], n = ri(1, 2 ** bits - 1), b = n.toString(2).padStart(bits, '0'); if (Math.random() < 0.5) return mcq('(' + b + ')₂ = ? in decimal', n, numW(n, 4).filter((x) => x > 0)); const w = numW(n, 3).filter((x) => x > 0 && x < 2 ** bits).map((x) => x.toString(2).padStart(bits, '0')); return mcq(n + ' in binary = ?', b, w.concat([(n ^ 1).toString(2).padStart(bits, '0'), (n ^ 2).toString(2).padStart(bits, '0')])); } },
    { id: 'capitals', title: 'Map Master', icon: '🗺️', subj: 'Social Science', desc: 'Capitals of Indian states, then the world.', levels: ['South India', 'North and Central India', 'East and North-East', 'All states', 'World capitals'],
      gen(L) { const pool = L === 5 ? WORLD : STATES.filter((s) => L === 4 || (L === 1 ? ['S', 'W'].includes(s[2]) : L === 2 ? ['N', 'C'].includes(s[2]) : ['E', 'NE'].includes(s[2]))); const x = pool[ri(0, pool.length - 1)], all = L === 5 ? WORLD : STATES; return mcq('Capital of ' + x[0] + '?', x[1], shuf(all).map((y) => y[1]).filter((c) => c !== x[1])); } },
    { id: 'quest', title: 'Quiz Quest', icon: '🏆', subj: 'All subjects', desc: 'Mixed questions from every subject, climbing class by class.', levels: ['Up to Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Champion (all)'],
      gen(L) { const maxC = [6, 7, 8, 9, 10, 12][L - 1], minC = L === 6 ? 0 : L === 1 ? 0 : maxC; const bank = Object.values(STOPIC).filter((t) => t.cls <= maxC && t.cls >= minC).flatMap((t) => t.quiz.map((q) => [t.subject, q])); const pool = bank.length ? bank : Object.values(STOPIC).flatMap((t) => t.quiz.map((q) => [t.subject, q])); const [s, q] = pool[ri(0, pool.length - 1)]; return { q: q[0], opts: q[1], a: q[2], tag: s }; } },
    { id: 'flip', title: 'Formula Flip', icon: '🃏', subj: 'Maths & Science', desc: 'Memory game: flip cards and match each name to its formula.', levels: ['4 pairs', '6 pairs', '8 pairs'], memory: true },
  ];
  const gState = (id) => (S.games[id] = S.games[id] || { lv: 1, stars: {}, xp: 0 });
  const totalStars = () => Object.values(S.games).reduce((a, g) => a + Object.values(g.stars || {}).reduce((x, y) => x + y, 0), 0);
  function tone(ok) { try { const ac = (window.__cxAC = window.__cxAC || new (window.AudioContext || window.webkitAudioContext)()), o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = ok ? 'triangle' : 'sawtooth'; o.frequency.setValueAtTime(ok ? 660 : 160, t); if (ok) o.frequency.setValueAtTime(880, t + 0.08); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.26); } catch (e) {} }
  function renderGames(main) {
    const gsel = S.gameSel && GAMES.find((g) => g.id === S.gameSel);
    if (gsel) return renderGame(main, gsel);
    main.append(h('div', { class: 'cx-fun-hero' }, h('span', { class: 'eyebrow', text: 'Games' }), h('h1', { html: 'Level up your <em>brain</em>' }), h('p', { class: 'cx-lead', text: 'Pass a level with 7 out of 10 to unlock the next one. Earn up to 3 stars per level.' }), h('div', { class: 'cx-row' }, h('span', { class: 'cx-chip a', text: '⭐ ' + totalStars() + ' stars' }), h('span', { class: 'cx-chip', text: Object.values(S.games).reduce((a, g) => a + (g.xp || 0), 0) + ' game XP' }), h('button', { class: 'cx-btn', type: 'button', text: '🎵 Fun Zone', onclick: () => { location.hash = '#/campus/fun'; } }))));
    main.append(h('div', { class: 'cx-game-grid' }, GAMES.map((g) => { const st = gState(g.id), stars = Object.values(st.stars).reduce((a, b) => a + b, 0); return h('button', { type: 'button', class: 'cx-gamecard', onclick: () => { S.gameSel = g.id; save(); C.render(); } }, h('span', { class: 'ic', text: g.icon }), h('b', { text: g.title }), h('small', { text: g.subj }), h('p', { text: g.desc }), h('div', { class: 'cx-levels' }, g.levels.map((_, i) => h('i', { class: i + 1 <= st.lv ? (st.stars[i + 1] ? 'won' : 'open') : '', title: 'Level ' + (i + 1) }))), h('span', { class: 'cx-chip a', text: '⭐ ' + stars + ' / ' + g.levels.length * 3 })); })));
  }
  function renderGame(main, g) {
    const st = gState(g.id);
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('button', { class: 'cx-back', type: 'button', text: '← All games', onclick: () => { S.gameSel = null; save(); C.render(); } }), h('span', { class: 'eyebrow', style: 'display:block;margin-top:10px', text: g.subj }), h('h1', { text: g.icon + ' ' + g.title }))));
    const stage = h('div', { class: 'cx-card glass cx-game' });
    const pickLevel = () => stage.replaceChildren(h('h3', { text: 'Choose a level' }), h('div', { class: 'cx-lvgrid' }, g.levels.map((name, i) => { const L = i + 1, open = L <= st.lv, s = st.stars[L] || 0; return h('button', { type: 'button', class: 'cx-lv' + (open ? '' : ' locked'), disabled: !open, onclick: () => (g.memory ? playMemory(L) : play(L)) }, h('b', { text: open ? 'Level ' + L : '🔒 Level ' + L }), h('small', { text: name }), h('span', { class: 'st', text: '★'.repeat(s) + '☆'.repeat(3 - s) })); })));
    const finish = (L, correct, total) => {
      const pass = correct >= Math.ceil(total * 0.7), stars = correct >= total ? 3 : correct >= Math.ceil(total * 0.85) ? 2 : pass ? 1 : 0;
      st.xp += correct * 10; if (stars > (st.stars[L] || 0)) st.stars[L] = stars; if (pass && L === st.lv && L < g.levels.length) st.lv = L + 1; save();
      if (pass) { confetti(); tone(true); if (L === g.levels.length) notify('parent', S.child.name + ' cleared every level of ' + g.title + '!', 'learning'); }
      stage.replaceChildren(h('div', { class: 'cx-result' }, h('div', { class: 'cx-bigstars', text: '★'.repeat(stars) + '☆'.repeat(3 - stars) }), h('h3', { text: pass ? (L < g.levels.length ? 'Level ' + L + ' cleared! Level ' + (L + 1) + ' unlocked.' : 'You cleared the final level!') : 'Almost! You need ' + Math.ceil(total * 0.7) + ' to pass.' }), h('p', { text: correct + ' / ' + total + ' correct · +' + correct * 10 + ' XP' }),
        h('div', { class: 'cx-row', style: 'justify-content:center' }, h('button', { class: 'cx-btn', type: 'button', text: 'Retry', onclick: () => (g.memory ? playMemory(L) : play(L)) }), pass && L < g.levels.length ? h('button', { class: 'cx-btn pri', type: 'button', text: 'Next level →', onclick: () => (g.memory ? playMemory(L + 1) : play(L + 1)) }) : null, h('button', { class: 'cx-btn', type: 'button', text: 'Levels', onclick: pickLevel }))));
    };
    function play(L) {
      const N = 10; let i = 0, correct = 0, streak = 0, left = 75 + (L > 6 ? 30 : 0), lock = false, tm = null;
      const bar = h('div', { class: 'cx-gbar' }, h('i')), hud = h('div', { class: 'cx-ghud' }), qEl = h('div', { class: 'cx-gq' }), opts = h('div', { class: 'cx-gopts' });
      stage.replaceChildren(hud, bar, qEl, opts);
      const ask = () => {
        if (i >= N) { clearInterval(tm); finish(L, correct, N); return; }
        const Q = g.gen(L); lock = false; hud.replaceChildren(h('span', { text: 'Level ' + L + ' · Q' + (i + 1) + '/' + N }), h('span', { text: '✔ ' + correct + (streak >= 3 ? '  🔥×' + streak : '') }), h('span', { class: 'cx-gtime', text: '⏱ ' + left + 's' })); bar.firstChild.style.width = (i / N * 100) + '%';
        qEl.replaceChildren(...[Q.tag ? h('small', { class: 'cx-chip', text: Q.tag }) : null, h('p', { text: Q.q })].filter(Boolean));
        opts.replaceChildren(...Q.opts.map((o, k) => h('button', { type: 'button', class: 'cx-gopt', text: o, onclick: (e) => { if (lock) return; lock = true; const ok = k === Q.a; tone(ok); if (ok) { correct++; streak++; e.target.classList.add('right'); } else { streak = 0; e.target.classList.add('wrong'); opts.children[Q.a].classList.add('right'); } i++; setTimeout(ask, ok ? 450 : 1100); } })));
      };
      tm = setInterval(() => { if (!stage.isConnected) { clearInterval(tm); return; } left--; const t = $('.cx-gtime', stage); if (t) t.textContent = '⏱ ' + left + 's'; if (left <= 0) { clearInterval(tm); finish(L, correct, N); } }, 1000);
      ask();
    }
    function playMemory(L) {
      const pairs = [4, 6, 8][L - 1], set = shuf(FORMULAS).slice(0, pairs), cards = shuf(set.flatMap(([a, b], k) => [{ k, t: a, kind: 'name' }, { k, t: b, kind: 'form' }]));
      let open = [], matched = 0, moves = 0, lock = false; const hud = h('div', { class: 'cx-ghud' }), grid = h('div', { class: 'cx-mem', style: '--cols:' + (pairs <= 4 ? 4 : pairs <= 6 ? 4 : 4) });
      const upd = () => hud.replaceChildren(h('span', { text: 'Level ' + L + ' · ' + pairs + ' pairs' }), h('span', { text: 'Moves ' + moves }), h('span', { text: 'Matched ' + matched + '/' + pairs }));
      cards.forEach((c) => { const b = h('button', { type: 'button', class: 'cx-mcard ' + c.kind }, h('span', { class: 'front', text: '?' }), h('span', { class: 'back', text: c.t })); c.b = b; b.onclick = () => { if (lock || b.classList.contains('up')) return; b.classList.add('up'); open.push(c); if (open.length === 2) { moves++; lock = true; const [x, y] = open; if (x.k === y.k && x.kind !== y.kind) { matched++; tone(true); x.b.classList.add('done'); y.b.classList.add('done'); open = []; lock = false; upd(); if (matched === pairs) { const score = Math.max(0, 10 - Math.max(0, moves - pairs)); setTimeout(() => finish(L, Math.max(7, Math.min(10, score)), 10), 500); } } else { tone(false); setTimeout(() => { x.b.classList.remove('up'); y.b.classList.remove('up'); open = []; lock = false; upd(); }, 900); } } }; grid.append(b); });
      upd(); stage.replaceChildren(hud, grid);
    }
    pickLevel(); main.append(stage);
  }
  /* ================= REGISTER ================= */
  C.registerTab('labs', '3D Labs', renderLabs, { first: true, lockOk: true });
  C.registerTab('subjects', 'Subjects', renderSubjects, { first: true, lockOk: true });
  C.registerTab('today', 'Today', renderToday, { first: true, roles: ['student', 'parent'], lockOk: true });
  C.registerTab('assign', 'Assignments', renderAssign, { after: 'labs', roles: ['teacher', 'parent'] });
  C.registerTab('study', 'Study Hub', renderStudy, { after: 'today', lockOk: true });
  C.registerTab('fun', 'Fun Zone', renderFun, { after: 'labs', lockOk: true });
  C.registerTab('games', 'Games', renderGames, { after: 'fun' });
  labRoute();
  window.INSTITUTION_LABS = { open: goLab, LABS, AI, SUBJECTS, current: () => LAB };
  }
})();
