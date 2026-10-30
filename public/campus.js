/* INSTITUTION Campus add-on
   Bus tracking (all buses, driver and conductor apps, each student's journey),
   co-curricular activities, a video lesson for every topic, messages for
   parents / teachers / principal, and a parent-controlled study lock.

   It is loaded like panic-button.js (see index.html), so it works with the
   existing build without rebuilding. Everything is saved in this browser
   (localStorage + IndexedDB for uploaded videos) until a server is added. */
(() => {
  if (window.__campusLoaded) return;
  window.__campusLoaded = true;

  /* ================= 1. SETTINGS: edit these for your school ================= */
  const CAMPUS = {
    school: 'INSTITUTION',
    transportOfficePhone: '',          // shown to parents, e.g. '080 1234 5678'
    // Optional: your server address. Every alert is POSTed here as JSON
    // ({to, text, kind, urgent, at, child}) so the server can send it by SMS / WhatsApp.
    notifyWebhook: '',
    // Optional: recorded videos per topic id, placed in public/assets/videos/
    // e.g. { heart: './assets/videos/heart.mp4', brain: './assets/videos/brain.mp4' }
    lessonVideos: {},
    storageKey: 'institution.campus.v1',
    appStorageKey: 'institution.pro.v1', // the main app's saved progress (role, name, class)
  };

  /* ================= 2. TOPICS (copied from src/data/topics.js) ================= */
  const TOPICS = [{"id": "flower", "cls": 6, "ch": "Getting to Know Plants", "title": "Parts of a Flower", "icon": "🌸", "hue": "#ff7fb0", "summary": "A flower is the reproductive part of a plant. Its four whorls — sepals, petals, stamens and pistil — each have a job in making seeds.", "learn": ["Calyx (sepals) protects the bud; corolla (petals) attracts insects.", "Stamen = anther + filament (male part). Pistil = stigma + style + ovary (female part).", "Ovules inside the ovary become seeds; the ovary becomes the fruit."]}, {"id": "joints", "cls": 6, "ch": "Body Movements", "title": "Joints & Movement", "icon": "🦴", "hue": "#e8d9a8", "summary": "Where two or more bones meet we have a joint. Different joints allow different kinds of movement.", "learn": ["Ball-and-socket joints (shoulder, hip) move in all directions.", "Hinge joints (elbow, knee) move in one plane only.", "Pivot joints (neck) allow rotation."]}, {"id": "digestive", "cls": 7, "ch": "Nutrition in Animals", "title": "Human Digestive System", "icon": "🍽️", "hue": "#ffb36b", "summary": "Food travels through the alimentary canal where it is broken down, absorbed and the waste egested, helped by the liver and pancreas.", "learn": ["Mouth → oesophagus → stomach → small intestine → large intestine → anus.", "Most digestion and absorption happens in the small intestine (villi).", "Bile (liver) emulsifies fats; pancreatic juice has enzymes for all foods."]}, {"id": "lungs", "cls": 7, "ch": "Respiration in Organisms", "title": "Breathing & the Lungs", "icon": "🫁", "hue": "#ff9aa8", "summary": "We breathe in with the help of the ribs and diaphragm. Air pressure changes pull air into the lungs and push it out.", "learn": ["Inhalation: ribs move up and out, diaphragm flattens, chest volume rises.", "Exhalation: ribs move down, diaphragm relaxes upward.", "Air path: nostrils → trachea → bronchi → bronchioles → alveoli."]}, {"id": "animalCell", "cls": 8, "ch": "Cell — Structure and Functions", "title": "Animal Cell", "icon": "🔬", "hue": "#7cc8ff", "summary": "The cell is the basic structural and functional unit of life. Organelles divide the work inside the cell.", "learn": ["Nucleus holds DNA and controls the cell.", "Mitochondria release energy (the powerhouse).", "Cell membrane controls what enters and leaves."]}, {"id": "embryo", "cls": 8, "ch": "Reproduction in Animals", "title": "Fertilisation & Early Embryo", "icon": "🥚", "hue": "#ffd0a0", "summary": "Fertilisation joins sperm and ovum to form a zygote. Repeated cell division then forms a ball of cells that implants in the uterus.", "learn": ["Internal fertilisation in humans happens in the oviduct.", "Zygote → cleavage → morula → blastocyst → implantation.", "Cleavage is cell division with no growth."]}, {"id": "plantCell", "cls": 9, "ch": "The Fundamental Unit of Life", "title": "Plant Cell", "icon": "🌿", "hue": "#7fe08a", "summary": "Plant cells have a rigid cell wall, a large central vacuole and plastids such as chloroplasts which animal cells lack.", "learn": ["Cell wall (cellulose) gives shape and support.", "Large vacuole keeps the cell turgid.", "Chloroplasts make food by photosynthesis."]}, {"id": "heart", "cls": 10, "ch": "Life Processes — Transportation", "title": "The Human Heart", "icon": "❤️", "hue": "#ff4d6a", "summary": "The four-chambered heart pumps blood in a double circulation: right side to the lungs, left side to the body.", "learn": ["Right atrium → right ventricle → lungs → left atrium → left ventricle → body.", "Valves prevent backflow of blood.", "Oxygen-rich and oxygen-poor blood never mix."]}, {"id": "neuron", "cls": 10, "ch": "Control and Coordination", "title": "Neuron & Nerve Impulse", "icon": "⚡", "hue": "#8c9bff", "summary": "Neurons are the units of the nervous system. They carry electrical impulses and pass them across synapses using chemicals.", "learn": ["Dendrites receive information; axon carries it away.", "Myelin sheath speeds up conduction (saltatory).", "At the synapse neurotransmitters carry the signal."]}, {"id": "brain", "cls": 10, "ch": "Control and Coordination", "title": "The Human Brain", "icon": "🧠", "hue": "#c79bff", "summary": "The brain has the forebrain (cerebrum), midbrain and hindbrain. Each region controls different activities.", "learn": ["Cerebrum: thinking, memory, voluntary actions, senses.", "Cerebellum: balance and posture.", "Medulla: involuntary actions like heartbeat and breathing."]}, {"id": "kidney", "cls": 10, "ch": "Life Processes — Excretion", "title": "Kidney & Nephron", "icon": "🫘", "hue": "#e0735a", "summary": "Kidneys filter blood to remove nitrogenous waste as urine. The nephron is the filtering unit.", "learn": ["Filtration in the glomerulus.", "Selective reabsorption in the tubule.", "Urine: kidney → ureter → bladder → urethra."]}, {"id": "pollination", "cls": 10, "ch": "How Do Organisms Reproduce?", "title": "Pollination & Fertilisation in Plants", "icon": "🐝", "hue": "#ffd54a", "summary": "Pollen moves from anther to stigma. The pollen tube then grows through the style to deliver male gametes to the ovule.", "learn": ["Pollination can be self or cross; agents: wind, insects, water.", "Pollen tube carries male gametes down the style.", "Zygote → embryo; ovule → seed; ovary → fruit."]}, {"id": "eye", "cls": 10, "ch": "Human Eye and the Colourful World", "title": "The Human Eye", "icon": "👁️", "hue": "#69c9ff", "summary": "The eye lens forms an inverted real image on the retina. The ciliary muscles change its focal length (accommodation).", "learn": ["Cornea does most refraction; lens fine-tunes focus.", "Myopia is corrected with a concave lens; hypermetropia with a convex lens.", "Retina has rods (dim light) and cones (colour)."]}, {"id": "mendel", "cls": 10, "ch": "Heredity", "title": "Mendel’s Monohybrid Cross", "icon": "🧬", "hue": "#b6e36a", "summary": "Mendel crossed pea plants and found that traits are inherited as factors (genes) in the ratio 3 : 1 in F₂.", "learn": ["Dominant trait masks the recessive.", "Alleles separate in gametes (law of segregation).", "Tt × Tt gives phenotype 3 : 1 and genotype 1 : 2 : 1."]}, {"id": "fission", "cls": 10, "ch": "How Do Organisms Reproduce?", "title": "Asexual Reproduction", "icon": "🦠", "hue": "#7fe0c0", "summary": "One parent produces offspring without gametes. The young are genetically identical clones.", "learn": ["Binary fission: Amoeba; multiple fission: Plasmodium.", "Budding: Hydra and yeast.", "No variation, rapid multiplication."]}, {"id": "mitosis", "cls": 11, "ch": "Cell Cycle and Cell Division", "title": "Mitosis", "icon": "🧫", "hue": "#ff9ad5", "summary": "Mitosis divides one nucleus into two identical nuclei. The stages are prophase, metaphase, anaphase and telophase.", "learn": ["Prophase: chromosomes condense, spindle forms.", "Metaphase: chromosomes line up at the equator.", "Anaphase: sister chromatids are pulled apart."]}, {"id": "chloroplast", "cls": 11, "ch": "Photosynthesis in Higher Plants", "title": "Chloroplast & Photosynthesis", "icon": "☀️", "hue": "#58d86a", "summary": "Light reactions in the thylakoids make ATP and NADPH; the Calvin cycle in the stroma fixes CO₂ into sugar.", "learn": ["Light reaction in grana; dark reaction in stroma.", "Water splits and releases O₂.", "6CO₂ + 12H₂O → C₆H₁₂O₆ + 6O₂ + 6H₂O."]}, {"id": "alveoli", "cls": 11, "ch": "Breathing and Exchange of Gases", "title": "Gas Exchange in Alveoli", "icon": "💨", "hue": "#ffa6b8", "summary": "O₂ and CO₂ move across the thin alveolar wall by simple diffusion down their partial pressure gradients.", "learn": ["Alveoli: thin walls, rich capillary network, huge surface area.", "O₂ binds haemoglobin; most CO₂ travels as bicarbonate.", "Exchange is by diffusion."]}, {"id": "dnaStructure", "cls": 12, "ch": "Molecular Basis of Inheritance", "title": "DNA Structure", "icon": "🧬", "hue": "#6ad0ff", "summary": "DNA is a double helix of two antiparallel strands held by hydrogen bonds between A–T and G–C.", "learn": ["Watson & Crick, 1953.", "A pairs with T (2 bonds), G with C (3 bonds).", "Sugar-phosphate backbone, 10 bp per turn (34 Å)."]}, {"id": "dnaReplication", "cls": 12, "ch": "Molecular Basis of Inheritance", "title": "DNA Replication", "icon": "🔁", "hue": "#52e0c8", "summary": "Replication is semi-conservative: each new DNA has one old and one new strand.", "learn": ["Helicase unwinds; DNA polymerase adds nucleotides 5′→3′.", "Leading strand is continuous; lagging strand forms Okazaki fragments.", "Ligase joins the fragments."]}, {"id": "translation", "cls": 12, "ch": "Molecular Basis of Inheritance", "title": "Translation", "icon": "🧵", "hue": "#ffb86b", "summary": "Ribosomes read mRNA codons; tRNAs bring matching amino acids to build a polypeptide.", "learn": ["Codon = 3 bases; AUG is the start codon.", "tRNA anticodon pairs with the codon.", "Stop codons: UAA, UAG, UGA."]}, {"id": "repro", "cls": 12, "ch": "Human Reproduction", "title": "Human Reproductive System", "icon": "👪", "hue": "#ff8fa3", "summary": "Male and female systems produce gametes, enable fertilisation and support the embryo.", "learn": ["Testes make sperm and testosterone; ovaries make ova, oestrogen and progesterone.", "Sperm path: testis → epididymis → vas deferens → urethra.", "Fertilisation in the ampulla; implantation in the uterus."]}, {"id": "cycle", "cls": 12, "ch": "Human Reproduction", "title": "Menstrual Cycle", "icon": "🌙", "hue": "#ff6f91", "summary": "A 28-day cycle controlled by FSH, LH, oestrogen and progesterone prepares the uterus for pregnancy.", "learn": ["Ovulation on about day 14 after an LH surge.", "Corpus luteum secretes progesterone.", "If no fertilisation the endometrium is shed."]}, {"id": "embryosac", "cls": 12, "ch": "Sexual Reproduction in Flowering Plants", "title": "Double Fertilisation", "icon": "🌱", "hue": "#d9ff6a", "summary": "Two male gametes enter the embryo sac: one fuses with the egg, the other with the two polar nuclei.", "learn": ["Embryo sac is 7-celled and 8-nucleate.", "Syngamy → zygote (2n); triple fusion → PEN (3n).", "Zygote → embryo; PEN → endosperm."]}];

  /* ================= 3. HELPERS ================= */
  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(9).forEach((c) => { if (c !== null && c !== undefined && c !== false) e.append(c); });
    return e;
  };
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const hm = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const when = (t) => new Date(t).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const inputFocused = () => { const a = document.activeElement; return !!a && /INPUT|TEXTAREA|SELECT/.test(a.tagName); };
  const appState = () => { try { return JSON.parse(localStorage.getItem(CAMPUS.appStorageKey) || '{}'); } catch (e) { return {}; } };
  const clsLabel = (c) => (+c === 11 ? '1st PUC' : +c === 12 ? '2nd PUC' : 'Class ' + c);

  /* ================= 4. STATE ================= */
  const ROUTES = ROUTES_DEF();
  const SCHOOL = [310, 122];
  const TRIP_SECS = 110;          // demo: a whole route takes about 2 minutes
  const REAL_TRIP_MIN = 35;       // used to turn demo time into a realistic ETA
  const DWELL = 4000;             // bus waits 4 s at each stop in the demo

  function fresh() {
    const a = appState();
    return {
      role: ['student', 'parent', 'teacher'].includes(a.role) ? a.role : 'parent',
      tRole: 'manager', tBus: 'B2',
      child: { name: a.name && a.name !== 'Student' ? a.name : 'Ananya', cls: String(a.cls || 10), section: 'A', parentPhone: '' },
      inbox: [], fleet: SEED_FLEET(), acts: SEED_ACTS(), actReq: {}, actAtt: {}, achv: [],
      vprog: {}, vfiles: {}, vlinks: {},
      lock: { pin: '', on: false, start: 0, end: 0, min: 0, cur: null, sessions: [], notifyAfter: 3, schedule: { on: false, from: '18:00', to: '20:00' } },
      log: [],
    };
  }
  let S;
  try { const saved = JSON.parse(localStorage.getItem(CAMPUS.storageKey) || 'null'); S = saved ? Object.assign(fresh(), saved) : fresh(); } catch (e) { S = fresh(); }
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(CAMPUS.storageKey, JSON.stringify(S)); } catch (e) {} }, 400); };
  const log = (t) => { S.log.unshift({ at: Date.now(), t }); S.log = S.log.slice(0, 200); save(); };

  /* ================= 5. MESSAGES ================= */
  const ROLES = [['student', 'Student'], ['parent', 'Parent'], ['teacher', 'Class teacher'], ['principal', 'Principal'], ['transport', 'Transport']];
  function notify(to, text, kind, urgent) {
    text = String(text).replace(/\.\.(?=\s|$)/g, '.');
    const m = { id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), at: Date.now(), to, text, kind: kind || 'info', urgent: !!urgent, read: false };
    S.inbox.unshift(m); S.inbox = S.inbox.slice(0, 400); save();
    if (CAMPUS.notifyWebhook) {
      try { fetch(CAMPUS.notifyWebhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, child: S.child.name, school: CAMPUS.school }), keepalive: true }).catch(() => {}); } catch (e) {}
    }
    if (to === S.role && (urgent || !$('#campus-root') || $('#campus-root').hidden)) toast(text, urgent);
    badges();
  }
  const unread = (role) => S.inbox.filter((m) => m.to === role && !m.read).length;

  /* ================= 6. FLEET DATA ================= */
  function ROUTES_DEF() {
    return [
      { id: 'B1', no: 'KA-01-F-2101', name: 'Jayanagar', color: '#7c8cff', driver: 'Ramesh K.', conductor: 'Lakshmi M.',
        stops: [['Jayanagar 4th Block', [40, 40]], ['South End Circle', [110, 58]], ['Lalbagh West Gate', [180, 78]], ['Shanti Nagar', [245, 100]]] },
      { id: 'B2', no: 'KA-01-F-2102', name: 'Market Circle', color: '#ffd54a', driver: 'Suresh P.', conductor: 'Anita R.',
        stops: [['Green Park Gate', [40, 205]], ['Lake Road', [110, 188]], ['Market Circle', [180, 165]], ['Temple Street', [245, 142]]] },
      { id: 'B3', no: 'KA-01-F-2103', name: 'Indiranagar', color: '#5ee6c8', driver: 'Manjunath S.', conductor: 'Fatima B.',
        stops: [['Indiranagar 100 ft Road', [585, 40]], ['Domlur', [520, 58]], ['Richmond Road', [450, 80]], ['Museum Road', [380, 102]]] },
      { id: 'B4', no: 'KA-01-F-2104', name: 'Koramangala', color: '#ff6f91', driver: 'Prakash N.', conductor: 'Shobha T.',
        stops: [['Koramangala 5th Block', [585, 205]], ['Ejipura', [515, 188]], ['Vivek Nagar', [445, 166]], ['Langford Town', [375, 142]]] },
    ];
  }
  // 'own' = same class as your child (the class teacher's class). 'me' = your child.
  function RIDERS_DEF() {
    return [['me', 'B2', 2, 'own'], ['Diya S.', 'B1', 0, 'own'], ['Kabir M.', 'B2', 1, 'own'], ['Meera P.', 'B2', 2, 'own'], ['Rohan K.', 'B3', 1, 'own'],
      ['Sana A.', 'B4', 0, 'own'], ['Arjun N.', 'B4', 2, 'own'], ['Isha T.', 'B1', 2, '9'], ['Vikram R.', 'B1', 3, '8'], ['Nisha G.', 'B3', 0, '7'],
      ['Rahul D.', 'B3', 3, '11'], ['Pooja L.', 'B4', 3, '6'], ['Farhan Q.', 'B2', 3, '12'], ['Kavya S.', 'B1', 1, '12']];
  }
  function SEED_FLEET() {
    const buses = {}, staff = {}, riders = {};
    ROUTES_DEF().forEach((r) => {
      buses[r.id] = { trip: 'am', t: 0, rep: 0, running: false, gps: true, fix: 0, delay: 0, dwell: 0, leaving: null, at: '', done: false, empty: null, emptyDue: 0, emptyAlert: false };
      staff[r.id] = { driver: r.driver, conductor: r.conductor };
    });
    RIDERS_DEF().forEach(([id, bus, stop, cls]) => { riders[id] = { bus, stop, cls }; });
    return { auto: true, buses, staff, riders, st: {} };
  }
  const F = () => S.fleet;
  const routeOf = (id) => ROUTES.find((r) => r.id === id);
  const busLabel = (id) => 'Bus ' + id.slice(1) + ' (' + routeOf(id).no + ')';
  const nm = (id) => (id === 'me' ? S.child.name : id);
  const clsOf = (id) => { const r = F().riders[id]; return r.cls === 'own' ? S.child.cls : r.cls; };
  const inMyClass = (id) => F().riders[id] && F().riders[id].cls === 'own';
  const ridersOn = (bus) => Object.keys(F().riders).filter((n) => F().riders[n].bus === bus);
  const ridersAt = (bus, stop) => ridersOn(bus).filter((n) => F().riders[n].stop === stop);
  const stOf = (n) => (F().st[n] = F().st[n] || { am: {}, pm: {} });
  const tripName = (t) => (t === 'am' ? 'morning' : 'afternoon');
  const handTo = (n) => (+clsOf(n) >= 11 ? 'self (PUC student, permission on file)' : 'parent / guardian');
  const myBus = () => F().riders.me.bus;
  const myStopName = () => routeOf(myBus()).stops[F().riders.me.stop][0];

  function pathOf(id, trip) {
    const r = routeOf(id), pts = r.stops.map((s) => s[1]), names = r.stops.map((s) => s[0]), idx = names.map((_, i) => i);
    return trip === 'am'
      ? { pts: [...pts, SCHOOL], names: [...names, 'School'], idx: [...idx, -1] }
      : { pts: [SCHOOL, ...pts.slice().reverse()], names: ['School', ...names.slice().reverse()], idx: [-1, ...idx.slice().reverse()] };
  }
  function fracs(pts) {
    const L = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])), T = L.reduce((a, b) => a + b, 0), f = [0];
    let acc = 0; L.forEach((x) => { acc += x; f.push(acc / T); });
    return { L, T, f };
  }
  function posOn(pts, fr) {
    const { L, T } = fracs(pts); let d = fr * T;
    for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const a = pts[i], b = pts[i + 1], t = L[i] ? d / L[i] : 0; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; } d -= L[i]; }
    return pts[pts.length - 1];
  }
  function onBoard(id) {
    const B = F().buses[id];
    return ridersOn(id).filter((n) => { const s = stOf(n)[B.trip]; return B.trip === 'am' ? s.b && !s.s : s.b && !s.d; }).length;
  }
  function busStatus(id) {
    const B = F().buses[id];
    if (B.running) {
      if (B.dwell > Date.now()) return cap(tripName(B.trip)) + ' trip · at ' + B.at;
      const P = pathOf(id, B.trip), fr = fracs(P.pts).f, i = fr.findIndex((x) => x > B.t + 1e-9);
      return cap(tripName(B.trip)) + ' trip · next: ' + (i >= 0 ? P.names[i] : '—');
    }
    if (B.done) return cap(tripName(B.trip)) + ' trip finished' + (B.empty ? ' · checked empty' : ' · empty check pending');
    return 'Not started';
  }
  const gpsStale = (B) => B.running && (!B.gps || Date.now() - B.fix > 15000);

  /* ================= 7. FLEET EVENTS ================= */
  function riderEvent(n, id, what, place, extra) {
    const s = stOf(n), B = F().buses[id], tr = B.trip, st = F().staff[id], me = n === 'me', child = S.child.name;
    if (what === 'board') {
      s[tr].b = Date.now(); delete s[tr].x;
      if (me) notify('parent', tr === 'am'
        ? child + ' boarded ' + busLabel(id) + ' at ' + place + ', ' + hm(Date.now()) + '. Driver ' + st.driver + ', conductor ' + st.conductor + '.'
        : child + ' boarded ' + busLabel(id) + ' at school for the trip home, ' + hm(Date.now()) + '.', 'bus');
    }
    if (what === 'absent') {
      s[tr].x = Date.now();
      if (me) notify('parent', child + ' was not at ' + place + ' when ' + busLabel(id) + ' arrived (' + hm(Date.now()) + '). If ' + child + ' should be on the bus, please call the school transport office.', 'bus', true);
      if (inMyClass(n)) notify('teacher', nm(n) + ' was not at the bus stop this ' + tripName(tr) + ' (' + busLabel(id) + ', ' + place + ').', 'bus');
    }
    if (what === 'drop') {
      s.pm.d = Date.now(); s.pm.h = extra || handTo(n);
      if (me) notify('parent', child + ' got off ' + busLabel(id) + ' at ' + place + ' at ' + hm(Date.now()) + ', received by ' + s.pm.h + '.', 'bus');
    }
    if (what === 'stay') {
      s.pm.x = Date.now(); s.pm.h = 'picked up at school';
      if (me) notify('parent', child + ' did not take ' + busLabel(id) + ' home: marked as picked up at school, ' + hm(Date.now()) + '.', 'bus');
      if (inMyClass(n)) notify('teacher', nm(n) + ' did not take the bus home: picked up at school.', 'bus');
    }
    log(nm(n) + ': ' + what + ' (' + busLabel(id) + ', ' + place + ')');
    save();
  }
  function oneStopAway(id, i) {
    const B = F().buses[id], P = pathOf(id, B.trip), nxt = P.idx[i + 1];
    if (myBus() !== id || nxt === undefined || nxt !== F().riders.me.stop) return;
    const s = stOf('me')[B.trip];
    if (B.trip === 'am' && !s.x) notify('parent', busLabel(id) + ' is at ' + P.names[i] + ', one stop before ' + myStopName() + '. Please have ' + S.child.name + ' ready.', 'bus');
    if (B.trip === 'pm' && s.b && !s.d) notify('parent', busLabel(id) + ' is one stop away from ' + myStopName() + '. Please be there to receive ' + S.child.name + '.', 'bus');
  }
  function startTrip(id, trip) {
    const B = F().buses[id], st = F().staff[id];
    Object.assign(B, { trip, t: 0, rep: 0, running: true, done: false, dwell: 0, leaving: null, at: '', empty: null, emptyDue: 0, emptyAlert: false, fix: Date.now(), delay: 0 });
    ridersOn(id).forEach((n) => { stOf(n)[trip] = {}; });
    if (myBus() === id) notify('parent', busLabel(id) + ' started its ' + tripName(trip) + ' trip. Driver ' + st.driver + ', conductor ' + st.conductor + '.', 'bus');
    log(busLabel(id) + ' started ' + tripName(trip) + ' trip');
    if (trip === 'am') { arriveStop(id, 0); }
    else {
      B.at = 'School'; B.dwell = Date.now() + DWELL; B.leaving = 0;
      ridersOn(id).forEach((n) => {
        const am = stOf(n).am;
        if (am.x) { stOf(n).pm.x = Date.now(); stOf(n).pm.h = 'absent today'; }
        else if (F().auto) riderEvent(n, id, 'board', 'School');
      });
      oneStopAway(id, 0);
    }
    save();
  }
  function arriveStop(id, i) {
    const B = F().buses[id], P = pathOf(id, B.trip), place = P.names[i], si = P.idx[i], last = i === P.pts.length - 1;
    B.at = place; B.dwell = Date.now() + DWELL; B.leaving = i;
    if (si >= 0) {
      const here = ridersAt(id, si);
      if (F().auto) here.forEach((n) => {
        const s = stOf(n)[B.trip];
        if (B.trip === 'am' && !s.b && !s.x) riderEvent(n, id, n === 'Sana A.' ? 'absent' : 'board', place);
        if (B.trip === 'pm' && s.b && !s.d) riderEvent(n, id, 'drop', place, handTo(n));
      });
      oneStopAway(id, i);
    }
    if (B.trip === 'am' && last) arriveSchool(id);
  }
  function leaveStop(id, i) {
    const B = F().buses[id], P = pathOf(id, B.trip), si = P.idx[i], place = P.names[i], last = i === P.pts.length - 1;
    if (B.trip === 'am' && si >= 0) ridersAt(id, si).forEach((n) => {
      const s = stOf(n).am;
      if (!s.b && !s.x) {
        s.miss = Date.now();
        if (n === 'me') notify('parent', busLabel(id) + ' left ' + place + ' and ' + S.child.name + ' was not marked as boarded. Please call the school transport office if ' + S.child.name + ' should be on the bus.', 'bus', true);
        notify('principal', 'Not confirmed: ' + nm(n) + ' was not marked at ' + place + ' (' + busLabel(id) + ', morning).', 'bus');
      }
    });
    if (B.trip === 'pm' && i === 0) ridersOn(id).forEach((n) => {
      const s = stOf(n).pm;
      if (!s.b && !s.x) {
        notify('principal', nm(n) + ' did not board ' + busLabel(id) + ' at school and is not marked as picked up. Check with the class teacher.', 'bus', true);
        if (inMyClass(n)) notify('teacher', nm(n) + ' did not board ' + busLabel(id) + ' at school. Please confirm where the student is.', 'bus', true);
        if (n === 'me') notify('parent', S.child.name + ' was not marked on ' + busLabel(id) + ' when it left school. The school is checking now.', 'bus', true);
      }
    });
    if (B.trip === 'pm' && si >= 0) ridersAt(id, si).forEach((n) => {
      const s = stOf(n).pm;
      if (s.b && !s.d) {
        s.missed = Date.now();
        notify('principal', 'Check now: ' + nm(n) + ' was not marked as getting off at ' + place + ' (' + busLabel(id) + ').', 'bus', true);
        if (n === 'me') notify('parent', S.child.name + ' was not marked as getting off at ' + place + '. The school has been alerted and is checking with the conductor.', 'bus', true);
      }
    });
    if (last) {
      B.running = false; B.done = true; B.emptyDue = Date.now() + 60000;
      if (B.trip === 'pm') finishPm(id);
      log(busLabel(id) + ' finished ' + tripName(B.trip) + ' trip');
    }
  }
  function arriveSchool(id) {
    const now = Date.now(), rs = ridersOn(id), came = rs.filter((n) => stOf(n).am.b);
    came.forEach((n) => { stOf(n).am.s = now; if (n === 'me') notify('parent', S.child.name + ' reached school safely at ' + hm(now) + ' on ' + busLabel(id) + '.', 'bus'); });
    const mine = rs.filter(inMyClass);
    if (mine.length) notify('teacher', busLabel(id) + ' reached school at ' + hm(now) + '. Your class: ' + mine.map((n) => nm(n) + (stOf(n).am.s ? ' arrived' : stOf(n).am.x ? ' not at stop' : ' not confirmed')).join(', ') + '.', 'bus');
    const miss = rs.filter((n) => !stOf(n).am.b);
    notify('principal', busLabel(id) + ' reached school at ' + hm(now) + ' with ' + came.length + ' of ' + rs.length + ' students' + (miss.length ? '. Not on the bus: ' + miss.map(nm).join(', ') : '') + '.', 'bus');
  }
  function finishPm(id) {
    const left = ridersOn(id).filter((n) => { const s = stOf(n).pm; return s.b && !s.d; });
    if (left.length) {
      notify('principal', 'URGENT: ' + left.map(nm).join(', ') + ' still marked on ' + busLabel(id) + ' after the last stop. Call the driver now.', 'bus', true);
      if (left.some(inMyClass)) notify('teacher', 'URGENT: ' + left.filter(inMyClass).map(nm).join(', ') + ' still marked on ' + busLabel(id) + ' after the last stop.', 'bus', true);
      if (left.includes('me')) notify('parent', S.child.name + ' is still marked on the bus after the last stop. The school is checking with the driver and conductor now.', 'bus', true);
    } else notify('principal', busLabel(id) + ' finished drop-off at ' + hm(Date.now()) + '. Every student got off.', 'bus');
  }
  function confirmEmpty(id, by) {
    const B = F().buses[id]; B.empty = { by, at: Date.now() };
    notify('principal', busLabel(id) + ' checked empty by ' + by + ' after the ' + tripName(B.trip) + ' trip.', 'bus');
    log(busLabel(id) + ' checked empty by ' + by); save();
  }
  function reportDelay(id, min) {
    const B = F().buses[id]; B.delay = min;
    if (myBus() === id) notify('parent', busLabel(id) + ' is running about ' + min + ' minutes late.', 'bus');
    if (ridersOn(id).some(inMyClass)) notify('teacher', busLabel(id) + ' is running about ' + min + ' minutes late.', 'bus');
    notify('principal', busLabel(id) + ' delay reported by the driver: about ' + min + ' minutes.', 'bus');
    log(busLabel(id) + ' delay ' + min + ' min'); save();
  }
  function busEmergency(id) {
    notify('principal', 'EMERGENCY on ' + busLabel(id) + ' raised by driver ' + F().staff[id].driver + '. Call the driver now.', 'bus', true);
    notify('transport', 'Emergency raised on ' + busLabel(id) + '.', 'bus', true);
    if (myBus() === id) notify('parent', 'The driver of ' + busLabel(id) + ' reported a problem. The school transport team is handling it and will update you.', 'bus', true);
    log('Emergency on ' + busLabel(id)); save();
  }
  function resetDay() {
    const keep = { staff: F().staff, riders: F().riders, auto: F().auto };
    S.fleet = Object.assign(SEED_FLEET(), keep); log('Bus day reset'); save();
  }

  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(3, (now - lastTick) / 1000); lastTick = now;
    let moved = false, event = false;
    for (const id in F().buses) {
      const B = F().buses[id];
      if (B.done && !B.empty) {
        if (F().auto && Date.now() > B.emptyDue - 54000) { confirmEmpty(id, F().staff[id].conductor + ' (demo auto)'); event = true; }
        else if (Date.now() > B.emptyDue && !B.emptyAlert) { B.emptyAlert = true; notify('principal', busLabel(id) + ': the conductor has not confirmed the bus is empty after the ' + tripName(B.trip) + ' trip. Check the bus now.', 'bus', true); event = true; }
      }
      if (!B.running) continue;
      moved = true;
      if (B.gps) B.fix = Date.now();
      if (B.dwell > Date.now()) continue;
      if (B.leaving !== null && B.leaving !== undefined) { const i = B.leaving; B.leaving = null; leaveStop(id, i); event = true; if (!B.running) continue; }
      const P = pathOf(id, B.trip), fr = fracs(P.pts).f, prev = B.t;
      B.t = Math.min(1, B.t + dt / TRIP_SECS); if (B.gps) B.rep = B.t;
      for (let i = 1; i < fr.length; i++) if (prev < fr[i] - 1e-9 && B.t >= fr[i] - 1e-9) { B.t = fr[i]; if (B.gps) B.rep = B.t; arriveStop(id, i); event = true; break; }
    }
    if (moved || event || pendingRender) { save(); refreshLive(event); }
  }, 1000);

  /* ================= 8. FLEET MAP ================= */
  const NS = 'http://www.w3.org/2000/svg';
  function fleetSvg(focus) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 620 245'); svg.setAttribute('class', 'cx-map'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Map of all school bus routes');
    const mk = (t, a, parent) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); (parent || svg).append(e); return e; };
    for (let x = 0; x <= 620; x += 40) mk('line', { x1: x, y1: 0, x2: x, y2: 245, stroke: 'rgba(160,190,255,.06)' });
    for (let y = 0; y <= 245; y += 40) mk('line', { x1: 0, y1: y, x2: 620, y2: y, stroke: 'rgba(160,190,255,.06)' });
    ROUTES.forEach((r) => {
      const g = mk('g', { opacity: focus && focus !== r.id ? '0.28' : '1' }), P = pathOf(r.id, 'am');
      mk('polyline', { points: P.pts.map((p) => p.join(',')).join(' '), fill: 'none', stroke: r.color, 'stroke-width': '4', 'stroke-opacity': '.55', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      r.stops.forEach(([name, p], i) => {
        const mine = r.id === myBus() && i === F().riders.me.stop;
        mk('circle', { cx: p[0], cy: p[1], r: mine ? 8 : 5, fill: mine ? '#ffd54a' : '#0b1020', stroke: mine ? '#fff' : r.color, 'stroke-width': '2' }, g);
        if (!focus || focus === r.id || mine) {
          const t = mk('text', { x: p[0], y: p[1] + (p[1] < 122 ? -11 : 19), 'text-anchor': 'middle', 'font-size': '10.5', fill: mine ? '#ffd54a' : '#c7d2ee', 'font-family': 'Inter, system-ui, sans-serif', 'font-weight': mine ? '700' : '400' }, g);
          t.textContent = mine ? name + ' (' + S.child.name + ')' : name;
        }
      });
    });
    mk('rect', { x: SCHOOL[0] - 30, y: SCHOOL[1] - 18, width: 60, height: 36, rx: 8, fill: 'rgba(94,230,200,.16)', stroke: '#5ee6c8', 'stroke-width': '2' });
    const st = mk('text', { x: SCHOOL[0], y: SCHOOL[1] + 4, 'text-anchor': 'middle', 'font-size': '11', 'font-weight': '700', fill: '#5ee6c8', 'font-family': 'JetBrains Mono, monospace' }); st.textContent = 'SCHOOL';
    ROUTES.forEach((r) => {
      const B = F().buses[r.id]; if (!B.running && !B.done) return;
      const p = posOn(pathOf(r.id, B.trip).pts, B.rep), stale = gpsStale(B), g = mk('g', { opacity: focus && focus !== r.id ? '0.4' : '1' });
      if (!stale && B.running) mk('circle', { cx: p[0], cy: p[1], r: 15, fill: r.color, opacity: '.18' }, g);
      mk('rect', { x: p[0] - 13, y: p[1] - 9, width: 26, height: 18, rx: 5, fill: stale ? '#5b647a' : r.color, stroke: '#05070d', 'stroke-width': '2' }, g);
      const t = mk('text', { x: p[0], y: p[1] + 4, 'text-anchor': 'middle', 'font-size': '10', 'font-weight': '800', fill: '#05070d', 'font-family': 'JetBrains Mono, monospace' }, g);
      t.textContent = r.id;
    });
    return svg;
  }
  function etaMin() {
    const id = myBus(), B = F().buses[id];
    if (!B.running || gpsStale(B)) return null;
    const P = pathOf(id, B.trip), k = P.idx.indexOf(F().riders.me.stop), fr = fracs(P.pts).f[k];
    const s = stOf('me')[B.trip];
    if (B.trip === 'am' && (s.b || s.x)) return null;
    if (B.trip === 'pm' && (!s.b || s.d)) return null;
    if (fr <= B.rep) return null;
    return Math.max(1, Math.round(((fr - B.rep) * TRIP_SECS / TRIP_SECS) * REAL_TRIP_MIN));
  }
  function fleetTable() {
    return h('div', { class: 'cx-table-wrap' }, h('table', { class: 'cx-table' },
      h('thead', {}, h('tr', {}, ['Bus', 'Route', 'Driver · Conductor', 'Status', 'On board', 'GPS', 'Delay', 'Empty check'].map((t) => h('th', { text: t })))),
      h('tbody', {}, ROUTES.map((r) => {
        const B = F().buses[r.id], st = F().staff[r.id];
        return h('tr', { class: r.id === myBus() ? 'me' : '' },
          h('td', {}, h('b', { text: 'Bus ' + r.id.slice(1), style: 'color:' + r.color }), h('div', { class: 'cx-note cx-num', text: r.no })),
          h('td', { text: r.name }), h('td', { text: st.driver + ' · ' + st.conductor }), h('td', { text: busStatus(r.id) }),
          h('td', { class: 'cx-num', text: (B.running || B.done ? onBoard(r.id) : 0) + ' / ' + ridersOn(r.id).length }),
          h('td', {}, h('span', { class: 'cx-chip ' + (!B.running ? '' : gpsStale(B) ? 'bad' : 'ok'), text: !B.running ? '—' : gpsStale(B) ? 'Lost' : 'Live' })),
          h('td', { text: B.delay ? B.delay + ' min' : '—' }),
          h('td', {}, B.done ? h('span', { class: 'cx-chip ' + (B.empty ? 'ok' : 'warn'), text: B.empty ? 'Done' : 'Pending' }) : '—'));
      }))));
  }
  function demoBar(extra) {
    return h('div', { class: 'cx-demo' },
      h('span', { text: 'Demo: buses move on simulated GPS. A real school needs a GPS device or the driver app on a phone.' }),
      h('button', { class: 'cx-btn', text: 'Start all morning trips', onclick: () => { ROUTES.forEach((r) => startTrip(r.id, 'am')); render(); } }),
      h('button', { class: 'cx-btn', text: 'Start all afternoon trips', onclick: () => { ROUTES.forEach((r) => startTrip(r.id, 'pm')); render(); } }),
      h('button', { class: 'cx-btn', text: 'Reset the day', onclick: () => { resetDay(); render(); } }),
      extra || null);
  }

  /* ================= 9. BUS VIEWS ================= */
  function journey(n) {
    const s = stOf(n), stop = n === 'me' ? myStopName() : routeOf(F().riders[n].bus).stops[F().riders[n].stop][0], id = F().riders[n].bus, B = F().buses[id];
    const am = s.am, pm = s.pm, live = (trip) => B.running && B.trip === trip;
    const step = (cls, t, sub, right) => h('li', {}, h('span', { class: 'd ' + cls }), h('span', {}, t, sub ? h('small', { text: sub }) : null), h('span', { class: 'cx-note cx-num', text: right || '' }));
    return h('ol', { class: 'cx-steps' },
      step(am.b || am.x ? (am.x ? 'bad' : 'on') : live('am') ? 'now' : '', 'Morning: waiting at ' + stop, live('am') && !am.b && !am.x ? 'Bus ' + id.slice(1) + ' is on the way' : null),
      step(am.x ? 'bad' : am.b ? 'on' : '', am.x ? 'Not at the stop when the bus came' : 'Boarded the bus', am.b ? 'Marked by the conductor' : null, am.b ? hm(am.b) : am.x ? hm(am.x) : ''),
      step(am.s ? 'on' : '', 'Reached school', am.s ? 'Checked in at the school gate' : null, am.s ? hm(am.s) : ''),
      step(pm.b ? 'on' : pm.x ? 'bad' : live('pm') ? 'now' : '', pm.x ? (pm.h === 'absent today' ? 'Absent today' : 'Picked up at school') : 'Afternoon: boarded at school', null, pm.b ? hm(pm.b) : pm.x ? hm(pm.x) : ''),
      step(pm.d ? 'on' : pm.missed ? 'bad' : '', 'Got off at ' + stop, pm.d ? 'Received by ' + pm.h : pm.missed ? 'Not marked: school alerted' : null, pm.d ? hm(pm.d) : ''));
  }
  function busFamily(main) {
    const id = myBus(), r = routeOf(id), B = F().buses[id], st = F().staff[id], who = S.role === 'student' ? 'your' : S.child.name + '\'s';
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Bus tracking' }), h('h1', { html: 'Where is <em>' + (S.role === 'student' ? 'my' : who) + '</em> bus?' }))));
    main.append(demoBar());
    const eta = etaMin(), age = B.fix ? Math.round((Date.now() - B.fix) / 1000) : null;
    main.append(h('div', { class: 'cx-grid2' },
      h('div', { class: 'cx-card glass' }, h('h3', { text: busLabel(id) }),
        h('dl', { class: 'cx-kv', 'data-cx': 'buskv' },
          h('dt', { text: 'Route' }), h('dd', { text: r.name }),
          h('dt', { text: 'Stop' }), h('dd', { text: myStopName() }),
          h('dt', { text: 'Driver' }), h('dd', { text: st.driver }),
          h('dt', { text: 'Conductor' }), h('dd', { text: st.conductor }),
          h('dt', { text: 'Transport office' }), h('dd', { text: CAMPUS.transportOfficePhone || 'Number on the school ID card' }),
          h('dt', { text: 'Status' }), h('dd', { text: busStatus(id) }),
          h('dt', { text: 'GPS' }), h('dd', {}, h('span', { class: 'cx-chip ' + (!B.running ? '' : gpsStale(B) ? 'bad' : 'ok'), text: !B.running ? 'Not tracking (bus not running)' : gpsStale(B) ? 'Signal lost: last known position' : 'Live · updated ' + age + ' s ago' })),
          h('dt', { text: 'Arrival at your stop' }), h('dd', { text: eta ? 'about ' + eta + ' min' + (B.delay ? ' (+' + B.delay + ' min delay)' : '') : '—' })),
        h('p', { class: 'cx-note', style: 'margin-top:10px', text: 'Arrival times are estimates. If the GPS signal is lost, we say so and show the last known position instead of guessing.' })),
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Today\'s journey' }), h('div', { 'data-cx': 'journey' }, journey('me')))));
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'All buses' }), h('div', { 'data-cx': 'map' }, fleetSvg(id)),
      h('p', { class: 'cx-note', style: 'margin-top:8px', text: 'Your bus is highlighted. The yellow circle is your stop.' })));
    if (S.role === 'parent') main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Bus alerts' }), msgList(S.inbox.filter((m) => m.to === 'parent' && m.kind === 'bus').slice(0, 10), 'No bus alerts yet. Start a trip with the demo buttons above.')));
  }
  function busTeacher(main) {
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Class teacher · ' + clsLabel(S.child.cls) + ' ' + S.child.section }), h('h1', { html: 'Bus riders in <em>your class</em>' }))));
    main.append(demoBar());
    const mine = Object.keys(F().riders).filter(inMyClass);
    const am = (n) => { const s = stOf(n).am; return s.s ? ['ok', 'At school ' + hm(s.s)] : s.b ? ['a', 'On the bus ' + hm(s.b)] : s.x ? ['bad', 'Not at stop'] : s.miss ? ['bad', 'Not confirmed'] : ['', 'Waiting']; };
    const pm = (n) => { const s = stOf(n).pm; return s.d ? ['ok', 'Home ' + hm(s.d)] : s.missed ? ['bad', 'Not marked off'] : s.b ? ['a', 'On the bus'] : s.x ? ['warn', s.h] : ['', '—']; };
    main.append(h('div', { class: 'cx-card glass' }, h('div', { 'data-cx': 'teachtable' }, h('div', { class: 'cx-table-wrap' }, h('table', { class: 'cx-table' },
      h('thead', {}, h('tr', {}, ['Student', 'Bus', 'Stop', 'Morning', 'Afternoon'].map((t) => h('th', { text: t })))),
      h('tbody', {}, mine.map((n) => { const r = F().riders[n], a = am(n), p = pm(n); return h('tr', { class: n === 'me' ? 'me' : '' }, h('td', { text: nm(n) + (n === 'me' ? ' (live demo child)' : '') }), h('td', { text: 'Bus ' + r.bus.slice(1) }), h('td', { text: routeOf(r.bus).stops[r.stop][0] }), h('td', {}, h('span', { class: 'cx-chip ' + a[0], text: a[1] })), h('td', {}, h('span', { class: 'cx-chip ' + p[0], text: p[1] }))); })))))));
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Bus messages for you' }), msgList(S.inbox.filter((m) => m.to === 'teacher' && m.kind === 'bus').slice(0, 10), 'No bus messages yet.')));
  }
  function busPrincipal(main) {
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Principal' }), h('h1', { html: 'School <em>fleet</em>' }))));
    main.append(demoBar());
    const urgent = S.inbox.filter((m) => m.to === 'principal' && m.kind === 'bus' && m.urgent).slice(0, 6);
    if (urgent.length) main.append(h('div', { class: 'cx-card glass', style: 'border-color:rgba(255,92,122,.5)' }, h('h3', { text: 'Needs attention' }), msgList(urgent, '')));
    main.append(h('div', { class: 'cx-card glass' }, h('div', { 'data-cx': 'map' }, fleetSvg(null)), h('div', { 'data-cx': 'fleettable', style: 'margin-top:12px' }, fleetTable())));
    const busSel = h('select', { id: 'cx-bc-bus' }, ROUTES.map((r) => h('option', { value: r.id, text: 'Parents on Bus ' + r.id.slice(1) + ' · ' + r.name })));
    const txt = h('textarea', { id: 'cx-bc-txt', placeholder: 'e.g. Due to rain, buses will leave 20 minutes late today.' });
    main.append(h('div', { class: 'cx-grid2' },
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Message parents on a bus' }), h('div', { class: 'cx-row', style: 'margin-bottom:8px' }, busSel), txt,
        h('div', { class: 'cx-row', style: 'margin-top:10px' }, h('button', { class: 'cx-btn pri', text: 'Send', onclick: () => {
          if (!txt.value.trim()) return; const id = busSel.value, n = ridersOn(id).length;
          if (myBus() === id) notify('parent', 'From the principal (' + busLabel(id) + '): ' + txt.value.trim(), 'bus');
          log('Principal messaged parents on ' + busLabel(id)); txt.value = ''; toast('Sent to the parents of ' + n + ' students on ' + busLabel(id) + '.');
        } })),
        h('p', { class: 'cx-note', style: 'margin-top:8px', text: 'In this demo only your demo parent account receives it. With a server connected (see README-CAMPUS), every parent on the bus gets it by SMS or WhatsApp.' })),
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Latest bus messages' }), msgList(S.inbox.filter((m) => m.to === 'principal' && m.kind === 'bus').slice(0, 8), 'No bus messages yet.'))));
  }
  function busTransport(main) {
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Transport' }), h('h1', { html: 'Fleet, driver and <em>conductor</em>' }))));
    main.append(h('div', { class: 'cx-row' }, h('div', { class: 'seg', style: 'max-width:520px' }, [['manager', 'Fleet manager'], ['driver', 'Driver app'], ['conductor', 'Conductor app']].map(([k, t]) => h('button', { class: S.tRole === k ? 'on' : '', text: t, onclick: () => { S.tRole = k; save(); render(); } })))));
    if (S.tRole !== 'manager') main.append(h('div', { class: 'cx-row' }, h('span', { class: 'cx-note', text: 'Bus:' }), ROUTES.map((r) => h('button', { class: 'cx-btn' + (S.tBus === r.id ? ' on' : ''), text: 'Bus ' + r.id.slice(1) + ' · ' + r.name, onclick: () => { S.tBus = r.id; save(); render(); } }))));
    if (S.tRole === 'manager') return transportManager(main);
    if (S.tRole === 'driver') return transportDriver(main);
    return transportConductor(main);
  }
  function transportManager(main) {
    main.append(demoBar(h('label', { class: 'cx-row', style: 'gap:6px' }, h('input', { type: 'checkbox', id: 'cx-auto', checked: F().auto, onchange: (e) => { F().auto = e.target.checked; save(); } }), 'Conductors mark students automatically')));
    main.append(h('div', { class: 'cx-card glass' }, h('div', { 'data-cx': 'map' }, fleetSvg(null)), h('div', { 'data-cx': 'fleettable', style: 'margin-top:12px' }, fleetTable())));
    const staff = h('div', { class: 'cx-table-wrap' }, h('table', { class: 'cx-table' }, h('thead', {}, h('tr', {}, ['Bus', 'Driver', 'Conductor'].map((t) => h('th', { text: t })))),
      h('tbody', {}, ROUTES.map((r) => { const st = F().staff[r.id];
        const d = h('input', { id: 'cx-d-' + r.id, value: st.driver }), c = h('input', { id: 'cx-c-' + r.id, value: st.conductor });
        d.oninput = () => { st.driver = d.value; save(); }; c.oninput = () => { st.conductor = c.value; save(); };
        return h('tr', {}, h('td', { text: 'Bus ' + r.id.slice(1) + ' · ' + r.no }), h('td', {}, d), h('td', {}, c)); }))));
    const riders = h('div', { class: 'cx-table-wrap' }, h('table', { class: 'cx-table' }, h('thead', {}, h('tr', {}, ['Student', 'Class', 'Bus', 'Stop'].map((t) => h('th', { text: t })))),
      h('tbody', {}, Object.keys(F().riders).map((n) => { const r = F().riders[n];
        const bs = h('select', { id: 'cx-rb-' + n.replace(/\W/g, '') }, ROUTES.map((x) => h('option', { value: x.id, text: 'Bus ' + x.id.slice(1), selected: x.id === r.bus })));
        const ss = h('select', { id: 'cx-rs-' + n.replace(/\W/g, '') }, routeOf(r.bus).stops.map((s, i) => h('option', { value: String(i), text: s[0], selected: i === r.stop })));
        bs.onchange = () => { r.bus = bs.value; r.stop = 0; log(nm(n) + ' moved to ' + busLabel(r.bus)); save(); render(); };
        ss.onchange = () => { r.stop = +ss.value; save(); };
        return h('tr', { class: n === 'me' ? 'me' : '' }, h('td', { text: nm(n) }), h('td', { text: clsLabel(clsOf(n)) }), h('td', {}, bs), h('td', {}, ss)); }))));
    main.append(h('div', { class: 'cx-grid2' }, h('div', { class: 'cx-card glass' }, h('h3', { text: 'Drivers and conductors' }), staff), h('div', { class: 'cx-card glass' }, h('h3', { text: 'Students and stops' }), riders)));
  }
  function transportDriver(main) {
    const id = S.tBus, B = F().buses[id], st = F().staff[id];
    const dm = h('input', { type: 'number', id: 'cx-delay', min: '1', max: '90', value: '10', style: 'width:90px' });
    main.append(h('div', { class: 'cx-grid2' },
      h('div', { class: 'cx-card glass' }, h('span', { class: 'eyebrow', text: busLabel(id) + ' · Driver ' + st.driver }),
        h('p', { 'data-cx': 'drvstatus', style: 'font:400 28px var(--serif,serif);margin:8px 0 14px', text: busStatus(id) }),
        h('div', { class: 'cx-row' },
          B.running ? null : h('button', { class: 'cx-btn pri big', text: 'Start morning trip', onclick: () => { startTrip(id, 'am'); render(); } }),
          B.running ? null : h('button', { class: 'cx-btn pri big', text: 'Start afternoon trip', onclick: () => { startTrip(id, 'pm'); render(); } }),
          h('button', { class: 'cx-btn big', text: B.gps ? 'Test: GPS signal lost' : 'GPS signal back', onclick: () => { B.gps = !B.gps; if (B.gps) B.fix = Date.now(); log(busLabel(id) + ' GPS ' + (B.gps ? 'restored' : 'lost (test)')); save(); render(); } })),
        h('p', { class: 'cx-note', style: 'margin-top:12px', text: 'Use the driver app only when stopped. The phone sends the bus location while a trip is running.' })),
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Report' }),
        h('div', { class: 'cx-row' }, dm, h('span', { text: 'minutes late' }), h('button', { class: 'cx-btn', text: 'Send delay notice', onclick: () => { reportDelay(id, +dm.value || 10); toast('Parents, class teachers and the principal were told.'); render(); } })),
        h('h4', { text: 'Emergency' }), h('p', { class: 'cx-note', text: 'Breakdown, accident or a student unwell. Call 112 first if anyone is in danger.' }),
        h('button', { class: 'cx-btn danger big', text: 'Alert the school', onclick: () => { busEmergency(id); toast('The principal and transport team were alerted.', true); } }))));
    main.append(h('div', { class: 'cx-card glass' }, h('div', { 'data-cx': 'map' }, fleetSvg(id))));
  }
  function transportConductor(main) {
    const id = S.tBus, B = F().buses[id], P = pathOf(id, B.trip), tr = B.trip, st = F().staff[id];
    main.append(h('div', { class: 'cx-card glass' }, h('span', { class: 'eyebrow', text: busLabel(id) + ' · Conductor ' + st.conductor }),
      h('p', { 'data-cx': 'drvstatus', style: 'font:400 26px var(--serif,serif);margin:8px 0 6px', text: busStatus(id) }),
      h('p', { class: 'cx-note', text: 'Mark every student as they get on and off. Parents are told straight away. Only the names and stops of students on this bus are shown here.' }),
      F().auto ? h('p', { class: 'cx-note', style: 'color:#ffd9a3', text: 'Demo: automatic marking is on (Fleet manager). Turn it off to mark students yourself.' }) : null));
    const rows = h('div', { class: 'cx-card glass' }, h('h3', { text: cap(tripName(tr)) + ' trip checklist' }));
    P.names.forEach((place, i) => {
      const si = P.idx[i];
      const list = si >= 0 ? ridersAt(id, si) : tr === 'pm' ? ridersOn(id) : [];
      if (!list.length) return;
      rows.append(h('h4', { text: place }));
      list.forEach((n) => {
        const s = stOf(n)[tr];
        let right;
        if (tr === 'am') right = s.b ? h('span', { class: 'cx-chip ok', text: 'Boarded ' + hm(s.b) }) : s.x ? h('span', { class: 'cx-chip bad', text: 'Not at stop' })
          : h('span', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', disabled: !B.running, text: 'Boarded', onclick: () => { riderEvent(n, id, 'board', place); render(); } }), h('button', { class: 'cx-btn', disabled: !B.running, text: 'Not at stop', onclick: () => { riderEvent(n, id, 'absent', place); render(); } }));
        else if (si < 0) right = s.b ? h('span', { class: 'cx-chip ok', text: 'On bus ' + hm(s.b) }) : s.x ? h('span', { class: 'cx-chip warn', text: s.h }) :
          h('span', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', disabled: !B.running, text: 'Boarded', onclick: () => { riderEvent(n, id, 'board', 'School'); render(); } }), h('button', { class: 'cx-btn', disabled: !B.running, text: 'Picked up at school', onclick: () => { riderEvent(n, id, 'stay', 'School'); render(); } }));
        else {
          const ho = h('select', { id: 'cx-ho-' + n.replace(/\W/g, '') }, ['parent', 'guardian on file', 'self (PUC, permission on file)'].map((x) => h('option', { value: x, text: 'Handed to ' + x })));
          right = s.d ? h('span', { class: 'cx-chip ok', text: 'Got off ' + hm(s.d) + ' · ' + s.h }) : !s.b ? h('span', { class: 'cx-chip', text: s.x ? s.h : 'Not on bus' }) :
            h('span', { class: 'cx-row' }, ho, h('button', { class: 'cx-btn pri', disabled: !B.running, text: 'Got off', onclick: () => { riderEvent(n, id, 'drop', place, ho.value); render(); } }));
        }
        rows.append(h('div', { class: 'cx-row', style: 'justify-content:space-between;padding:8px 0;border-top:1px solid var(--cx-line)' }, h('span', { text: nm(n) + ' · ' + clsLabel(clsOf(n)) }), right));
      });
    });
    main.append(rows);
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'End of trip' }),
      h('p', { class: 'cx-note', text: 'Walk to the back of the bus and check every seat before confirming. If this is not confirmed within a minute of the last stop, the principal is alerted.' }),
      B.empty ? h('span', { class: 'cx-chip ok', text: 'Checked empty by ' + B.empty.by + ' at ' + hm(B.empty.at) }) :
        h('button', { class: 'cx-btn pri big', disabled: !B.done, text: 'Bus checked: no student left on board', onclick: () => { confirmEmpty(id, st.conductor); render(); } })));
  }
  function renderBus(main) {
    if (S.role === 'teacher') return busTeacher(main);
    if (S.role === 'principal') return busPrincipal(main);
    if (S.role === 'transport') return busTransport(main);
    return busFamily(main);
  }
  let pendingRender = false, lastPtr = 0;
  document.addEventListener('pointerdown', () => { lastPtr = Date.now(); }, true);
  function refreshLive(event) {
    const root = $('#campus-root');
    if (!root || root.hidden || tab !== 'bus') return;
    if (event) pendingRender = true;
    if (pendingRender && !inputFocused() && Date.now() - lastPtr > 1500) { pendingRender = false; render(); return; }
    root.querySelectorAll('[data-cx="map"]').forEach((m) => m.replaceChildren(fleetSvg(S.role === 'transport' && S.tRole !== 'manager' ? S.tBus : S.role === 'student' || S.role === 'parent' ? myBus() : null)));
    root.querySelectorAll('[data-cx="fleettable"]').forEach((m) => m.replaceChildren(fleetTable()));
    const ds = root.querySelector('[data-cx="drvstatus"]'); if (ds) ds.textContent = busStatus(S.tBus);
    if ((S.role === 'student' || S.role === 'parent') && !inputFocused()) {
      const kv = root.querySelector('[data-cx="buskv"]');
      if (kv) { const tmp = h('div'); busFamily(tmp); const nkv = tmp.querySelector('[data-cx="buskv"]'); if (nkv) kv.replaceWith(nkv); }
    }
  }

  /* ================= 10. ACTIVITIES ================= */
  function SEED_ACTS() {
    const L = [
      ['cricket', 'Cricket', 'Sports', 'Mon, Thu', '4:00–5:30 pm', 'Mr. Shetty', 30, 6, 12, 24], ['football', 'Football', 'Sports', 'Tue, Fri', '4:00–5:30 pm', 'Mr. Shetty', 30, 6, 12, 19],
      ['kabaddi', 'Kabaddi', 'Sports', 'Wed', '4:00–5:00 pm', 'Ms. Gowda', 24, 6, 12, 11], ['athletics', 'Athletics', 'Sports', 'Mon, Wed', '7:00–8:00 am', 'Mr. Shetty', 40, 6, 12, 27],
      ['yoga', 'Yoga', 'Sports', 'Sat', '8:00–9:00 am', 'Mrs. Rao', 40, 6, 12, 18], ['music', 'Carnatic vocal music', 'Arts', 'Tue', '3:30–4:30 pm', 'Mrs. Subramanian', 20, 6, 12, 14],
      ['dance', 'Bharatanatyam', 'Arts', 'Wed, Sat', '4:00–5:00 pm', 'Ms. Nair', 20, 6, 12, 17], ['art', 'Drawing and painting', 'Arts', 'Fri', '3:30–4:30 pm', 'Mr. Das', 25, 6, 12, 20],
      ['drama', 'Drama and theatre', 'Arts', 'Thu', '4:00–5:30 pm', 'Ms. Fernandes', 25, 6, 12, 9], ['science', 'Science club', 'Clubs', 'Mon', '3:30–4:30 pm', 'Mr. Iyer', 25, 6, 10, 21],
      ['bio', 'Biology and nature club', 'Clubs', 'Thu', '3:30–4:30 pm', 'Dr. Menon', 25, 8, 12, 12], ['robotics', 'Robotics and coding', 'Clubs', 'Sat', '10:00 am–12:00 pm', 'Ms. Rao', 20, 8, 12, 20],
      ['chess', 'Chess club', 'Clubs', 'Thu', '3:30–4:30 pm', 'Mr. Iyer', 20, 6, 12, 8], ['eco', 'Eco club', 'Clubs', 'Fri', '3:30–4:30 pm', 'Mrs. Khan', 30, 6, 12, 16],
      ['debate', 'Debate and quiz', 'Clubs', 'Tue', '4:00–5:00 pm', 'Mrs. Khan', 25, 8, 12, 13], ['ncc', 'NCC', 'Service', 'Sat', '7:00–9:00 am', 'Lt. Kumar', 40, 8, 12, 31],
      ['scouts', 'Scouts and Guides', 'Service', 'Fri', '4:00–5:30 pm', 'Mrs. Joseph', 40, 6, 10, 22], ['nss', 'NSS', 'Service', 'Sat', '9:00–11:00 am', 'Mr. Hegde', 50, 11, 12, 26],
    ];
    return L.map(([id, name, cat, days, time, inch, seats, min, max, enrolled]) => ({ id, name, cat, days, time, inch, seats, min, max, enrolled, open: true }));
  }
  const ACT_MAX = 3;
  let actCat = 'All';
  const actOf = (id) => S.acts.find((a) => a.id === id);
  const reqOf = (id) => S.actReq[id];
  const activeReqs = () => Object.keys(S.actReq).filter((k) => ['requested', 'approved', 'confirmed'].includes(S.actReq[k].status));
  const eligible = (a) => +S.child.cls >= a.min && +S.child.cls <= a.max;
  const seatsTaken = (a) => a.enrolled + (reqOf(a.id) && reqOf(a.id).status === 'confirmed' ? 1 : 0);
  const reqChip = (st) => ({ requested: ['warn', 'Waiting for parent'], approved: ['a', 'Parent approved · teacher to confirm'], confirmed: ['ok', 'Confirmed'], declined: ['bad', 'Declined'], left: ['', 'Left'] }[st] || ['', '']);
  function setReq(id, status, by) {
    const a = actOf(id), child = S.child.name;
    S.actReq[id] = { status, at: Date.now(), by };
    if (status === 'requested') { notify('parent', child + ' asked to join ' + a.name + ' (' + a.days + ', ' + a.time + '). Please approve or decline in Activities.', 'act'); notify('student', 'Request sent to your parent for ' + a.name + '.', 'act'); }
    if (status === 'approved') { notify('teacher', 'Parent approved ' + child + ' for ' + a.name + '. Please confirm the place.', 'act'); notify('student', 'Your parent approved ' + a.name + '. Waiting for the teacher in charge.', 'act'); }
    if (status === 'confirmed') { notify('parent', child + '\'s place in ' + a.name + ' is confirmed. ' + a.days + ', ' + a.time + ', with ' + a.inch + '.', 'act'); notify('student', 'You\'re in! ' + a.name + ': ' + a.days + ', ' + a.time + '.', 'act'); notify('principal', child + ' joined ' + a.name + '.', 'act'); }
    if (status === 'declined') { notify('student', a.name + ' was declined by your ' + by + '.', 'act'); if (by !== 'parent') notify('parent', a.name + ' could not be confirmed for ' + child + ' (' + by + ').', 'act'); }
    if (status === 'left') { notify('parent', child + ' left ' + a.name + '.', 'act'); notify('teacher', child + ' left ' + a.name + '.', 'act'); }
    log(child + ' · ' + a.name + ': ' + status + ' by ' + by); save();
  }
  function actCard(a) {
    const r = reqOf(a.id), left = a.seats - seatsTaken(a), canAsk = a.open && eligible(a) && left > 0 && (!r || ['declined', 'left'].includes(r.status)) && activeReqs().length < ACT_MAX;
    let action = null;
    if (S.role === 'student') action = r && !['declined', 'left'].includes(r.status) ? h('span', { class: 'cx-chip ' + reqChip(r.status)[0], text: reqChip(r.status)[1] })
      : h('button', { class: 'cx-btn pri', disabled: !canAsk, text: !a.open ? 'Closed' : !eligible(a) ? 'Not for your class' : left <= 0 ? 'Full' : activeReqs().length >= ACT_MAX ? 'Limit of 3 reached' : 'Ask to join', onclick: () => { setReq(a.id, 'requested', 'student'); render(); } });
    if (S.role === 'parent') action = r && !['declined', 'left'].includes(r.status) ? h('span', { class: 'cx-chip ' + reqChip(r.status)[0], text: reqChip(r.status)[1] })
      : h('button', { class: 'cx-btn', disabled: !canAsk, text: !a.open ? 'Closed' : !eligible(a) ? 'Not for this class' : left <= 0 ? 'Full' : 'Enrol ' + S.child.name, onclick: () => { setReq(a.id, 'approved', 'parent'); render(); } });
    return h('div', { class: 'cx-act glass' }, h('span', { class: 'eyebrow', text: a.cat }), h('h4', { text: a.name }),
      h('div', { class: 'meta', text: a.days + ' · ' + a.time }), h('div', { class: 'meta', text: 'Teacher in charge: ' + a.inch + ' · ' + clsLabel(a.min) + '–' + clsLabel(a.max).replace('Class ', '') }),
      h('div', { class: 'cx-seats' }, h('i', { style: 'width:' + Math.min(100, seatsTaken(a) / a.seats * 100) + '%' })), h('div', { class: 'meta', text: Math.max(0, left) + ' of ' + a.seats + ' places left' }),
      h('div', { class: 'foot' }, action));
  }
  function myActs() {
    const ids = Object.keys(S.actReq).filter((k) => S.actReq[k].status !== 'left');
    if (!ids.length) return h('p', { class: 'cx-note', text: 'No activities yet. Pick up to 3 below.' });
    return h('div', {}, ids.map((id) => { const a = actOf(id), r = reqOf(id), c = reqChip(r.status), att = S.actAtt[id] || [];
      return h('div', { class: 'cx-row', style: 'justify-content:space-between;padding:9px 0;border-top:1px solid var(--cx-line)' },
        h('span', {}, h('b', { text: a.name }), h('span', { class: 'cx-note', text: ' · ' + a.days + ', ' + a.time }), att.length ? h('span', { class: 'cx-note', text: ' · attended ' + att.filter((x) => x.s === 'P').length + ' of ' + att.length }) : null),
        h('span', { class: 'cx-row' }, h('span', { class: 'cx-chip ' + c[0], text: c[1] }),
          S.role === 'parent' && r.status === 'requested' ? [h('button', { class: 'cx-btn pri', text: 'Approve', onclick: () => { setReq(id, 'approved', 'parent'); render(); } }), h('button', { class: 'cx-btn', text: 'Decline', onclick: () => { setReq(id, 'declined', 'parent'); render(); } })] : null,
          (S.role === 'parent' || S.role === 'student') && r.status === 'confirmed' ? h('button', { class: 'cx-btn', text: 'Leave', onclick: () => { setReq(id, 'left', S.role); render(); } }) : null)); }));
  }
  function renderActivities(main) {
    const role = S.role;
    if (role === 'teacher') return actsTeacher(main);
    if (role === 'principal') return actsPrincipal(main);
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Co-curricular activities · ' + clsLabel(S.child.cls) }), h('h1', { html: role === 'student' ? 'Choose your <em>activities</em>' : 'Choose activities for <em>' + S.child.name + '</em>' })),
      h('p', { class: 'cx-lead', text: role === 'student' ? 'Ask to join up to 3. Your parent approves, then the teacher in charge confirms your place.' : 'Approve your child\'s requests or enrol directly. The teacher in charge confirms the place.' })));
    main.append(h('div', { class: 'cx-grid2' }, h('div', { class: 'cx-card glass' }, h('h3', { text: role === 'student' ? 'My activities' : S.child.name + '\'s activities' }), myActs()),
      h('div', { class: 'cx-card glass' }, h('h3', { text: 'Achievements' }), S.achv.length ? h('div', {}, S.achv.map((x) => h('div', { class: 'cx-msg' }, h('time', { text: when(x.at) }), h('span', {}, h('b', { text: actOf(x.act) ? actOf(x.act).name + ': ' : '' }), x.text)))) : h('p', { class: 'cx-note', text: 'Certificates and awards added by teachers appear here.' }))));
    const cats = ['All', 'Sports', 'Arts', 'Clubs', 'Service'];
    main.append(h('div', { class: 'seg', style: 'max-width:560px' }, cats.map((c) => h('button', { class: actCat === c ? 'on' : '', text: c, onclick: () => { actCat = c; render(); } }))));
    main.append(h('div', { class: 'cx-grid3' }, S.acts.filter((a) => actCat === 'All' || a.cat === actCat).map(actCard)));
  }
  function actsTeacher(main) {
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Teacher in charge' }), h('h1', { html: 'Activity <em>rosters</em>' }))));
    const pend = Object.keys(S.actReq).filter((k) => S.actReq[k].status === 'approved');
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Waiting for your confirmation' }), pend.length ? h('div', {}, pend.map((id) => { const a = actOf(id);
      return h('div', { class: 'cx-row', style: 'justify-content:space-between;padding:9px 0;border-top:1px solid var(--cx-line)' }, h('span', { text: S.child.name + ' (' + clsLabel(S.child.cls) + ') → ' + a.name }),
        h('span', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', text: 'Confirm place', onclick: () => { setReq(id, 'confirmed', 'teacher'); render(); } }), h('button', { class: 'cx-btn', text: 'Decline', onclick: () => { setReq(id, 'declined', 'teacher in charge'); render(); } }))); })) : h('p', { class: 'cx-note', text: 'Nothing waiting. Requests appear here after a parent approves.' })));
    const conf = Object.keys(S.actReq).filter((k) => S.actReq[k].status === 'confirmed');
    const today = new Date().toISOString().slice(0, 10);
    conf.forEach((id) => {
      const a = actOf(id), att = (S.actAtt[id] = S.actAtt[id] || []), t = att.find((x) => x.d === today);
      const ach = h('input', { id: 'cx-ach-' + id, placeholder: 'e.g. Won 2nd place, inter-school quiz' });
      main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: a.name + ' · ' + a.days + ', ' + a.time }),
        h('div', { class: 'cx-row', style: 'justify-content:space-between;padding:8px 0' }, h('span', { text: S.child.name + ' · today' }),
          t ? h('span', { class: 'cx-chip ' + (t.s === 'P' ? 'ok' : 'bad'), text: t.s === 'P' ? 'Present' : 'Absent' }) :
            h('span', { class: 'cx-row' }, h('button', { class: 'cx-btn pri', text: 'Present', onclick: () => { att.push({ d: today, s: 'P' }); save(); render(); } }), h('button', { class: 'cx-btn', text: 'Absent', onclick: () => { att.push({ d: today, s: 'A' }); notify('parent', S.child.name + ' was marked absent from ' + a.name + ' today.', 'act'); save(); render(); } }))),
        h('p', { class: 'cx-note', text: 'Other members: ' + ['Diya S.', 'Kabir M.', 'Isha T.', 'Vikram R.'].join(', ') + ' (example roster)' }),
        h('h4', { text: 'Add an achievement for ' + S.child.name }), h('div', { class: 'cx-row' }, ach, h('button', { class: 'cx-btn', text: 'Add', onclick: () => { if (!ach.value.trim()) return; S.achv.unshift({ at: Date.now(), act: id, text: ach.value.trim() }); notify('parent', S.child.name + ' — ' + a.name + ': ' + ach.value.trim(), 'act'); notify('student', 'New achievement in ' + a.name + ': ' + ach.value.trim(), 'act'); save(); render(); } }))));
    });
    if (!conf.length) main.append(h('p', { class: 'cx-note', text: 'Confirmed students and attendance appear here.' }));
  }
  function actsPrincipal(main) {
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Principal' }), h('h1', { html: 'Co-curricular <em>programme</em>' }))));
    const byCat = {}; S.acts.forEach((a) => { byCat[a.cat] = (byCat[a.cat] || 0) + seatsTaken(a); });
    main.append(h('div', { class: 'cx-grid3' }, Object.entries(byCat).map(([c, n]) => h('div', { class: 'cx-card glass' }, h('span', { class: 'eyebrow', text: c }), h('div', { class: 'cx-big', text: String(n) }), h('div', { class: 'cx-note', text: 'students enrolled (example numbers + live demo child)' })))));
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Activities' }), h('div', { class: 'cx-table-wrap' }, h('table', { class: 'cx-table' },
      h('thead', {}, h('tr', {}, ['Activity', 'Type', 'When', 'In charge', 'Classes', 'Enrolled', 'Status'].map((t) => h('th', { text: t })))),
      h('tbody', {}, S.acts.map((a) => h('tr', {}, h('td', { text: a.name }), h('td', { text: a.cat }), h('td', { text: a.days + ', ' + a.time }), h('td', { text: a.inch }), h('td', { text: a.min + '–' + a.max }), h('td', { class: 'cx-num', text: seatsTaken(a) + ' / ' + a.seats }),
        h('td', {}, h('button', { class: 'cx-btn' + (a.open ? ' on' : ''), text: a.open ? 'Open' : 'Closed', onclick: () => { a.open = !a.open; log('Activity ' + a.name + (a.open ? ' opened' : ' closed')); save(); render(); } })))))))));
    const f = { name: h('input', { id: 'cx-na-name', placeholder: 'e.g. Photography club' }), cat: h('select', { id: 'cx-na-cat' }, ['Sports', 'Arts', 'Clubs', 'Service'].map((x) => h('option', { text: x }))), days: h('input', { id: 'cx-na-days', placeholder: 'e.g. Wed' }), time: h('input', { id: 'cx-na-time', placeholder: 'e.g. 3:30–4:30 pm' }), inch: h('input', { id: 'cx-na-inch', placeholder: 'Teacher in charge' }), seats: h('input', { id: 'cx-na-seats', type: 'number', value: '25', min: '1' }) };
    main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Add an activity' }), h('div', { class: 'cx-grid3' }, Object.entries({ name: 'Name', cat: 'Type', days: 'Days', time: 'Time', inch: 'In charge', seats: 'Places' }).map(([k, l]) => h('label', { class: 'cx-field' }, l, f[k]))),
      h('div', { class: 'cx-row', style: 'margin-top:12px' }, h('button', { class: 'cx-btn pri', text: 'Add activity', onclick: () => {
        if (!f.name.value.trim() || !f.inch.value.trim()) { toast('Add a name and a teacher in charge.'); return; }
        S.acts.push({ id: 'a' + Date.now(), name: f.name.value.trim(), cat: f.cat.value, days: f.days.value.trim() || 'TBA', time: f.time.value.trim() || 'TBA', inch: f.inch.value.trim(), seats: Math.max(1, +f.seats.value || 25), min: 6, max: 12, enrolled: 0, open: true });
        notify('parent', 'New activity open for sign-up: ' + f.name.value.trim() + '.', 'act'); notify('student', 'New activity: ' + f.name.value.trim() + '. Ask to join in Activities.', 'act'); log('Activity added: ' + f.name.value.trim()); save(); render();
      } }))));
  }

  /* ================= 11. LESSON VIDEOS ================= */
  const VDB = {
    db: null,
    open() { return this.db || (this.db = new Promise((res, rej) => { try { const r = indexedDB.open('institution-campus-videos', 1); r.onupgradeneeded = () => r.result.createObjectStore('v'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } })); },
    async get(k) { try { const db = await this.open(); return await new Promise((res) => { const q = db.transaction('v').objectStore('v').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } },
    async put(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('v', 'readwrite'); t.objectStore('v').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async del(k) { try { const db = await this.open(); return await new Promise((res) => { const t = db.transaction('v', 'readwrite'); t.objectStore('v').delete(k); t.oncomplete = res; t.onerror = res; }); } catch (e) {} },
  };
  const topicOf = (id) => TOPICS.find((t) => t.id === id);
  const vp = (id) => (S.vprog[id] = S.vprog[id] || { seen: [], pos: 0, fur: 0, done: false, secs: 0, rec: { seen: {}, dur: 0, fur: 0, done: false } });
  function frames(t) {
    const split = (s) => (s.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [s]).map((x) => x.trim()).filter(Boolean);
    const F = [{ kind: 'title', h: t.title, line: clsLabel(t.cls) + ' · ' + t.ch }];
    split(t.summary).forEach((l) => F.push({ kind: 'text', h: 'In short', line: l }));
    t.learn.forEach((l, i) => F.push({ kind: 'point', h: 'Key point ' + (i + 1) + ' of ' + t.learn.length, line: l }));
    F.push({ kind: 'end', h: 'Now explore it in 3D', line: 'Rotate the model, open the parts list, try the simulation, then take the quiz.' });
    let s = 0; F.forEach((f) => { f.start = s; f.d = Math.max(4, f.line.split(/\s+/).length / 2.3 + 1.2); s += f.d; });
    return { F, dur: Math.ceil(s) };
  }
  function wrap(ctx, text, maxW) {
    const words = text.split(' '), lines = []; let line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function drawFrame(ctx, W, H, t, V, time) {
    const f = V.F.find((x, i) => time < x.start + x.d || i === V.F.length - 1), lp = Math.min(1, (time - f.start) / f.d), hue = t.hue || '#5ee6c8';
    const g = ctx.createRadialGradient(W * 0.78, H * 0.35, 10, W * 0.78, H * 0.35, W * 0.7);
    g.addColorStop(0, hue + '44'); g.addColorStop(1, '#05070d'); ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(160,190,255,0.06)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += W / 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    const cx = W * 0.78, cy = H * 0.42, R = H * 0.2;
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = hue; ctx.globalAlpha = 0.35 - k * 0.09; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, R * (1.25 + k * 0.32), R * (0.48 + k * 0.12), time * 0.25 * (k % 2 ? -1 : 1) + k, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (let k = 0; k < 3; k++) { const a = time * (0.9 + k * 0.3) + k * 2.1, rx = R * (1.25 + k * 0.32), ry = R * (0.48 + k * 0.12), rot = time * 0.25 * (k % 2 ? -1 : 1) + k;
      const px = cx + rx * Math.cos(a) * Math.cos(rot) - ry * Math.sin(a) * Math.sin(rot), py = cy + rx * Math.cos(a) * Math.sin(rot) + ry * Math.sin(a) * Math.cos(rot);
      ctx.fillStyle = k === 1 ? '#7c8cff' : hue; ctx.beginPath(); ctx.arc(px, py, H * 0.012, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = Math.round(H * 0.2) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.95; ctx.fillText(t.icon || '●', cx, cy + Math.sin(time * 1.4) * H * 0.01); ctx.globalAlpha = 1;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const L = W * 0.07, maxW = W * 0.52;
    ctx.fillStyle = '#5ee6c8'; ctx.font = '600 ' + Math.round(H * 0.026) + 'px "JetBrains Mono", monospace'; ctx.fillText((CAMPUS.school + ' · VIDEO LESSON').toUpperCase(), L, H * 0.11);
    if (f.kind === 'title') {
      ctx.fillStyle = '#eaf0ff'; ctx.font = Math.round(H * 0.1) + 'px "Instrument Serif", Georgia, serif';
      wrap(ctx, f.h, maxW).forEach((ln, i) => ctx.fillText(ln, L, H * 0.36 + i * H * 0.11));
      ctx.fillStyle = '#8b97b5'; ctx.font = Math.round(H * 0.036) + 'px Inter, system-ui, sans-serif'; ctx.fillText(f.line, L, H * 0.66);
    } else {
      ctx.fillStyle = '#8b97b5'; ctx.font = '600 ' + Math.round(H * 0.03) + 'px "JetBrains Mono", monospace'; ctx.fillText(f.h.toUpperCase(), L, H * 0.24);
      ctx.fillStyle = '#eaf0ff'; ctx.font = Math.round(H * 0.058) + 'px "Instrument Serif", Georgia, serif';
      const words = f.line.split(' '), shown = Math.max(1, Math.ceil(words.length * Math.min(1, lp / 0.55)));
      const full = wrap(ctx, f.line, maxW); let count = 0;
      full.forEach((ln, i) => { const lw = ln.split(' '); const vis = lw.slice(0, Math.max(0, shown - count)).join(' '); count += lw.length; if (vis) ctx.fillText(vis, L, H * 0.36 + i * H * 0.075); });
    }
    const n = V.F.length, idx = V.F.indexOf(f), dw = Math.min(28, (W * 0.5) / n);
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < idx ? '#5ee6c8' : i === idx ? '#eaf0ff' : 'rgba(255,255,255,0.18)'; ctx.fillRect(L + i * (dw + 6), H * 0.9, dw, 4); }
    ctx.fillStyle = 'rgba(234,240,255,0.55)'; ctx.font = Math.round(H * 0.024) + 'px Inter, system-ui, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(clsLabel(t.cls) + ' · ' + t.ch, W - L * 0.6, H * 0.92); ctx.textAlign = 'left';
    return f;
  }
  function speak(text) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/→/g, ' to ').replace(/₂/g, ' 2 ').replace(/₆/g, ' 6 ').replace(/₁₂/g, ' 12 ')); u.lang = 'en-IN'; u.rate = 0.97; const vs = speechSynthesis.getVoices(), v = vs.find((x) => x.lang === 'en-IN') || vs.find((x) => x.lang && x.lang.startsWith('en')); if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {}
  }
  const stopSpeech = () => { try { speechSynthesis.cancel(); } catch (e) {} };

  let player = null;  // {id, raf, playing, src}
  function closeVideo() {
    if (!player) return;
    cancelAnimationFrame(player.raf); stopSpeech();
    if (player.url) URL.revokeObjectURL(player.url);
    if (player.cleanup) try { player.cleanup(); } catch (e) {}
    player = null; const m = $('#cx-video'); if (m) { m.hidden = true; m.textContent = ''; }
    videoChip();
  }
  async function openVideo(id, src) {
    closeVideo();
    const t = topicOf(id); if (!t) return;
    const fileBlob = await VDB.get(id), cfg = CAMPUS.lessonVideos[id], link = S.vlinks[id];
    const recSrc = fileBlob ? 'file' : cfg ? 'cfg' : null;
    let st = null;
    if (!src || src === 'tour') {
      st = stageFor(id);
      if (!st) {
        if (route().v !== 'topic' || route().a !== id) location.hash = '#/topic/' + id;
        toast('Loading the 3D model…');
        st = await waitStage(id, 9000);
      }
      src = st ? 'tour' : 'auto';
    }
    let m = $('#cx-video'); if (!m) { m = h('div', { id: 'cx-video', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Video lesson' }); document.body.append(m); m.addEventListener('click', (e) => { if (e.target === m) closeVideo(); }); }
    m.hidden = false; m.textContent = '';
    player = { id, raf: 0, playing: false, src, st };
    const box = h('div', { class: 'cx-vbox' });
    const canTour = !!(stageFor(id));
    const srcBtns = [canTour ? ['tour', '3D video lesson'] : ['auto', 'Video lesson'], recSrc ? [recSrc, 'Teacher\'s recorded video'] : null].filter(Boolean);
    box.append(h('div', { class: 'cx-vhead' }, h('div', {}, h('span', { class: 'eyebrow', text: clsLabel(t.cls) + ' · ' + t.ch }), h('h2', { text: t.icon + ' ' + t.title })),
      h('button', { class: 'cx-btn', text: 'Close', onclick: closeVideo })));
    if (srcBtns.length > 1 || link) box.append(h('div', { class: 'cx-row' }, srcBtns.length > 1 ? h('div', { class: 'cx-vsrc' }, srcBtns.map(([k, l]) => h('button', { class: src === k ? 'on' : '', text: l, onclick: () => openVideo(id, k) }))) : null,
      link ? h('a', { class: 'cx-btn', href: link.url, target: '_blank', rel: 'noopener noreferrer', text: 'Open ' + (link.title || 'online video') + ' ↗' }) : null));
    m.append(box);
    if (src === 'tour') tourPlayer(box, t, st);
    else if (src === 'auto') autoPlayer(box, t);
    else recPlayer(box, t, src === 'file' ? URL.createObjectURL(fileBlob) : cfg, src === 'file');
    videoChip();
  }
  function markVideoDone(id, how) {
    const t = topicOf(id), p = vp(id);
    if (p.done) return; p.done = true; p.doneAt = Date.now(); save();
    notify('parent', S.child.name + ' watched the video lesson "' + t.title + '" (' + how + ').', 'video');
    notify('teacher', S.child.name + ' completed the video lesson "' + t.title + '".', 'video');
    toast('Video lesson complete. Now explore the 3D model and take the quiz.');
  }
  function autoPlayer(box, t) {
    const V = frames(t), p = vp(t.id);
    if (p.seen.length !== V.dur) { p.seen = new Array(V.dur).fill(0); p.pos = Math.min(p.pos, V.dur); }
    const cv = h('canvas', { width: '1280', height: '720', 'aria-label': 'Video lesson: ' + t.title }), ctx = cv.getContext('2d');
    const playBtn = h('button', { class: 'cx-play', 'aria-label': 'Play' }), track = h('div', { class: 'cx-track', title: 'Rewind any time. Forward skipping is off until you finish.' }), tc = h('canvas', { width: '600', height: '12' }), hd = h('div', { class: 'hd' });
    track.append(tc, hd);
    const time = h('span', { class: 'cx-time' }), speed = h('select', { id: 'cx-vspeed', 'aria-label': 'Speed' }, h('option', { value: '1', text: '1×' }), h('option', { value: '1.5', text: '1.5×' }), h('option', { value: '2', text: '2×' }));
    const voice = h('button', { class: 'cx-btn' + (S.voice ? ' on' : ''), text: 'Voice', title: 'Read the lesson aloud (1× speed)' });
    const fs = h('button', { class: 'cx-btn', text: 'Full screen' });
    const prog = h('span', { class: 'cx-note' });
    const saveBtn = h('button', { class: 'cx-btn', text: 'Save as video file (.webm)' }), saveNote = h('span', { class: 'cx-note' });
    box.append(h('div', { class: 'cx-screen' }, cv), h('div', { class: 'cx-ctrls' }, playBtn, track, time, speed, voice, fs), h('div', { class: 'cx-row', style: 'justify-content:space-between' }, prog, h('span', { class: 'cx-row' }, saveBtn, saveNote)),
      h('p', { class: 'cx-note', style: 'margin:0', text: 'You can rewind any time. Skipping ahead is off until you have watched the whole lesson once. Progress is saved, so you can continue later.' }));
    let lastF = null, last = performance.now();
    const icon = () => { playBtn.innerHTML = player && player.playing ? '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>'; playBtn.setAttribute('aria-label', player && player.playing ? 'Pause' : 'Play'); };
    const draw = () => {
      const f = drawFrame(ctx, 1280, 720, t, V, p.pos);
      if (f !== lastF) { lastF = f; if (player && player.playing && S.voice && speed.value === '1') speak(f.kind === 'title' ? f.h + '. ' + f.line : f.line); }
      const c = tc.getContext('2d'), W = tc.width, n = V.dur; c.clearRect(0, 0, W, 12); c.fillStyle = '#5ee6c8';
      for (let i = 0; i < n; i++) if (p.seen[i]) c.fillRect(Math.floor(i * W / n), 0, Math.ceil(W / n) + 1, 12);
      hd.style.left = 'calc(' + (p.pos / V.dur * 100) + '% - 1px)'; time.textContent = fmt(p.pos) + ' / ' + fmt(V.dur);
      const cov = p.seen.reduce((a, b) => a + b, 0) / n;
      prog.textContent = p.done ? 'Completed · watched ' + fmt(p.secs) : Math.round(cov * 100) + '% watched · ' + fmt(p.secs) + ' viewing time';
    };
    const loop = (now) => {
      if (!player || player.id !== t.id) return;
      const dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (player.playing) {
        const prev = p.pos; p.pos = Math.min(V.dur, p.pos + dt * +speed.value); p.secs += dt;
        for (let i = Math.floor(prev); i <= Math.min(V.dur - 1, Math.floor(p.pos)); i++) p.seen[i] = 1;
        p.fur = Math.max(p.fur, p.pos);
        if (!p.done && p.seen.reduce((a, b) => a + b, 0) / V.dur >= 0.95) markVideoDone(t.id, 'video lesson');
        if (p.pos >= V.dur) { player.playing = false; icon(); stopSpeech(); }
        save();
      }
      draw(); player.raf = requestAnimationFrame(loop);
    };
    playBtn.onclick = () => { if (!player) return; if (!player.playing && p.pos >= V.dur - 0.05) p.pos = 0; player.playing = !player.playing; last = performance.now(); lastF = null; if (!player.playing) stopSpeech(); icon(); };
    track.onclick = (e) => { const r = track.getBoundingClientRect(), target = (e.clientX - r.left) / r.width * V.dur; if (target > p.fur + 1 && !p.done) { toast('Skipping ahead is off until you finish the lesson once. You can rewind any time.'); return; } p.pos = Math.max(0, Math.min(V.dur, target)); lastF = null; stopSpeech(); };
    voice.onclick = () => { S.voice = !S.voice; voice.classList.toggle('on', S.voice); if (!S.voice) stopSpeech(); else lastF = null; save(); };
    fs.onclick = () => { try { const el = box.querySelector('.cx-screen'); (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => toast('Full screen isn\'t available here.')); } catch (e) {} };
    saveBtn.onclick = () => exportVideo(t, V, saveBtn, saveNote);
    icon(); draw(); player.raf = requestAnimationFrame(loop);
  }
  async function exportVideo(t, V, btn, note) {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { note.textContent = 'This browser can\'t record video. Try Chrome or Edge.'; return; }
    if (btn.dataset.rec) { btn.dataset.cancel = '1'; return; }
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const ctx = c.getContext('2d');
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    let rec; try { rec = new MediaRecorder(c.captureStream(30), mime ? { mimeType: mime } : undefined); } catch (e) { note.textContent = 'Recording isn\'t available here.'; return; }
    const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    btn.dataset.rec = '1'; btn.textContent = 'Cancel'; rec.start(1000);
    const t0 = performance.now();
    await new Promise((res) => { const step = () => { const s = (performance.now() - t0) / 1000; drawFrame(ctx, 1280, 720, t, V, Math.min(s, V.dur)); note.textContent = 'Recording ' + fmt(s) + ' / ' + fmt(V.dur) + '. Keep this tab open.'; if (s >= V.dur + 0.5 || btn.dataset.cancel) return res(); setTimeout(step, 33); }; step(); });
    const stopped = new Promise((r) => { rec.onstop = r; }); rec.stop(); await stopped;
    const cancelled = !!btn.dataset.cancel; delete btn.dataset.rec; delete btn.dataset.cancel; btn.textContent = 'Save as video file (.webm)';
    if (cancelled) { note.textContent = 'Recording cancelled.'; return; }
    const blob = new Blob(chunks, { type: 'video/webm' }), url = URL.createObjectURL(blob), a = h('a', { href: url, download: t.id + '-video-lesson.webm' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 8000);
    note.textContent = 'Saved ' + t.id + '-video-lesson.webm (silent, with on-screen text).';
  }
  function recPlayer(box, t, url, isBlob) {
    const p = vp(t.id), R = p.rec;
    if (isBlob) player.url = url;
    const v = h('video', { src: url, controls: true, playsinline: true, preload: 'metadata' });
    const prog = h('span', { class: 'cx-note' });
    box.append(h('div', { class: 'cx-screen' }, v), prog, h('p', { class: 'cx-note', style: 'margin:0', text: 'Recorded by your teacher. Skipping ahead is off until you have watched it once.' }));
    const upd = () => { const d = v.duration || R.dur || 0, n = Object.keys(R.seen).length; prog.textContent = R.done ? 'Completed' : d ? Math.round(n / Math.ceil(d) * 100) + '% watched' : ''; };
    v.addEventListener('loadedmetadata', () => { R.dur = v.duration; if (R.fur > 1 && R.fur < v.duration - 2) v.currentTime = R.fur - 1; upd(); });
    v.addEventListener('timeupdate', () => { const s = Math.floor(v.currentTime); if (!v.seeking && v.currentTime <= R.fur + 2) { R.seen[s] = 1; R.fur = Math.max(R.fur, v.currentTime); } if (!R.done && R.dur && Object.keys(R.seen).length / Math.ceil(R.dur) >= 0.95) { R.done = true; markVideoDone(t.id, 'teacher\'s recorded video'); } upd(); save(); });
    v.addEventListener('seeking', () => { if (!R.done && v.currentTime > R.fur + 1.5) { v.currentTime = R.fur; toast('Skipping ahead is off until you finish the video once.'); } });
    v.addEventListener('error', () => { prog.textContent = 'This video could not be loaded. Check the file path in campus.js (lessonVideos) or ask your teacher to upload it again.'; });
  }
  function videoChip() {
    let c = $('#cx-vchip');
    const r = route(), t = r.v === 'topic' ? topicOf(r.a) : null;
    if (!t || (player && !$('#cx-video').hidden)) { if (c) c.hidden = true; return; }
    if (!c) { c = h('button', { id: 'cx-vchip', type: 'button' }); document.body.append(c); c.addEventListener('click', () => { const x = route(); if (x.v === 'topic') openVideo(x.a); }); }
    const p0 = S.vprog[t.id], p = p0 && p0.tour ? { done: p0.tour.done || p0.done, seen: p0.tour.seen } : p0; c.hidden = false;
    c.replaceChildren('▶ ', h('b', { text: '3D video lesson' }), p && p.done ? ' · watched' : p && p.seen && p.seen.length ? ' · ' + Math.round(p.seen.reduce((a, b) => a + b, 0) / p.seen.length * 100) + '%' : '');
  }
  function renderVideos(main) {
    const role = S.role;
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Lesson videos' }), h('h1', { html: role === 'teacher' ? 'Videos for <em>every lesson</em>' : 'Watch, then <em>explore</em>' })),
      h('p', { class: 'cx-lead', text: role === 'teacher' ? 'Every topic has a narrated video lesson built from its notes. You can also upload your own recording or add a link for any topic.' : 'Each topic has a short video lesson. Watch it, then open the 3D model and take the quiz.' })));
    const byCls = {}; TOPICS.forEach((t) => { (byCls[t.cls] = byCls[t.cls] || []).push(t); });
    const order = Object.keys(byCls).sort((a, b) => (a === S.child.cls ? -1 : b === S.child.cls ? 1 : a - b));
    if (role === 'teacher') {
      main.append(h('div', { class: 'cx-card glass' }, order.map((c) => [h('h4', { text: clsLabel(c) }), ...byCls[c].map((t) => teacherVideoRow(t))])));
      return;
    }
    const done = TOPICS.filter((t) => S.vprog[t.id] && S.vprog[t.id].done).length;
    main.append(h('div', { class: 'cx-card glass' }, h('div', { class: 'cx-row', style: 'justify-content:space-between' }, h('span', { text: done + ' of ' + TOPICS.length + ' video lessons completed' }), h('div', { class: 'cx-pbar', style: 'flex:1;max-width:320px;margin:0' }, h('i', { style: 'width:' + done / TOPICS.length * 100 + '%' })))));
    main.append(h('div', { class: 'cx-card glass' }, order.map((c) => [h('h4', { text: clsLabel(c) + (c === S.child.cls ? ' · ' + (role === 'student' ? 'your class' : S.child.name + '\'s class') : '') }), ...byCls[c].map((t) => {
      const p0 = S.vprog[t.id], p = p0 && p0.tour && p0.tour.seen.length ? Object.assign({}, p0.tour, { done: p0.done || p0.tour.done }) : p0, pct = p && p.seen && p.seen.length ? Math.round(p.seen.reduce((a, b) => a + b, 0) / p.seen.length * 100) : 0;
      return h('div', { class: 'cx-vrow', style: '--h:' + t.hue }, h('span', { class: 'ic', text: t.icon }), h('span', {}, h('b', { text: t.title }), h('small', { text: t.ch + (S.vfiles[t.id] || CAMPUS.lessonVideos[t.id] ? ' · teacher video available' : '') }), h('div', { class: 'cx-pbar' }, h('i', { style: 'width:' + (p && p.done ? 100 : pct) + '%' }))),
        h('span', { class: 'cx-row' }, p && p.done ? h('span', { class: 'cx-chip ok', text: 'Watched' }) : pct ? h('span', { class: 'cx-chip warn', text: pct + '%' }) : null, h('button', { class: 'cx-btn pri', text: 'Watch', onclick: () => openVideo(t.id) })));
    })])));
  }
  function teacherVideoRow(t) {
    const has = S.vfiles[t.id], cfg = CAMPUS.lessonVideos[t.id], link = S.vlinks[t.id];
    const file = h('input', { type: 'file', accept: 'video/*', hidden: true, id: 'cx-vf-' + t.id });
    file.onchange = async () => { const f = file.files && file.files[0]; if (!f) return; try { await VDB.put(t.id, f); S.vfiles[t.id] = { name: f.name, size: f.size, at: Date.now() }; notify('student', 'New recorded video for "' + t.title + '".', 'video'); log('Teacher uploaded a video for ' + t.title); save(); render(); toast('Video saved for ' + t.title + '.'); } catch (e) { toast('Couldn\'t save the video in this browser (it may be too large).'); } };
    const linkIn = h('input', { id: 'cx-vl-' + t.id, placeholder: 'https://… (YouTube, DIKSHA)', value: link ? link.url : '' });
    return h('div', { class: 'cx-vrow', style: '--h:' + t.hue }, h('span', { class: 'ic', text: t.icon }),
      h('span', {}, h('b', { text: t.title }), h('small', { text: 'Video lesson ready' + (has ? ' · your upload: ' + has.name : cfg ? ' · recorded video: ' + cfg : '') + (link ? ' · link added' : '') }),
        h('div', { class: 'cx-row', style: 'margin-top:6px' }, linkIn, h('button', { class: 'cx-btn', text: link ? 'Update link' : 'Add link', onclick: () => { const u = linkIn.value.trim(); if (u && !/^https?:\/\//.test(u)) { toast('Links must start with http:// or https://'); return; } if (u) S.vlinks[t.id] = { url: u, title: /youtu/.test(u) ? 'YouTube video' : /diksha/.test(u) ? 'DIKSHA video' : 'online video' }; else delete S.vlinks[t.id]; save(); render(); } }))),
      h('span', { class: 'cx-row' }, file, h('button', { class: 'cx-btn', text: 'Preview', onclick: () => openVideo(t.id) }), h('button', { class: 'cx-btn pri', text: has ? 'Replace video' : 'Upload video', onclick: () => file.click() }),
        has ? h('button', { class: 'cx-btn danger', text: 'Remove', onclick: async () => { await VDB.del(t.id); delete S.vfiles[t.id]; save(); render(); } }) : null));
  }

  /* ================= 11b. 3D VIEWER EXTRAS: inside view, names, heart detail, 3D video tour ================= */
  // The app's Stage registers itself in window.__instStages (see src/three/Stage.js).
  function stageNow() {
    const set = window.__instStages; if (!set) return null; let best = null;
    set.forEach((s) => { if (!s.alive) { set.delete(s); return; } if (!s.opts.mini && s.model && s.container && s.container.isConnected) best = s; });
    return best;
  }
  const stageFor = (id) => { const r = route(); return r.v === 'topic' && r.a === id ? stageNow() : null; };
  function waitStage(id, ms) {
    return new Promise((res) => { const t0 = Date.now(); const tick = () => { const st = stageFor(id); if (st && st.model && st.model.parts.length) return setTimeout(() => res(stageFor(id)), 700); if (Date.now() - t0 > ms) return res(null); setTimeout(tick, 200); }; tick(); });
  }
  // Collect three.js classes from objects already in the scene (the app bundles its own copy of three.js).
  function kitFrom(st) {
    const k = {};
    st.scene.traverse((o) => {
      if (o.isInstancedMesh) k.InstancedMesh = k.InstancedMesh || o.constructor;
      else if (o.isMesh) k.Mesh = k.Mesh || o.constructor;
      else if (o.isGroup) k.Group = k.Group || o.constructor;
      if (o.position) k.Vector3 = k.Vector3 || o.position.constructor;
      if (o.geometry && o.geometry.type) { k[o.geometry.type] = k[o.geometry.type] || o.geometry.constructor; if (o.geometry.parameters && o.geometry.parameters.path) k.Curve = k.Curve || o.geometry.parameters.path.constructor; }
      if (o.userData && o.userData.curve && o.userData.curve.isCatmullRomCurve3) k.Curve = k.Curve || o.userData.curve.constructor;
      if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { k[mt.type] = k[mt.type] || mt.constructor; }); }
    });
    return k;
  }
  function registerPart(st, K, id, name, info, obj, ex) {
    const m = st.model, p = m.part(id, name, info, obj, { explode: new K.Vector3(ex[0], ex[1], ex[2]) });
    p.mats.forEach((mt) => { mt.envMapIntensity = 0.75; mt.userData.e0 = mt.emissive ? mt.emissive.clone() : null; mt.userData.i0 = mt.emissiveIntensity ?? 0; mt.userData.o0 = mt.opacity; mt.userData.t0 = mt.transparent; mt.userData.d0 = mt.depthWrite; mt.userData.s0 = mt.side; });
    m.group.updateMatrixWorld(true);
    let sum = new K.Vector3(0, 0, 0), n = 0, far = 0; const pts = [];
    obj.traverse((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingSphere(); const bs = o.geometry.boundingSphere, c = bs.center.clone().applyMatrix4(o.matrixWorld); pts.push([c, bs.radius * o.matrixWorld.getMaxScaleOnAxis()]); sum.add(c); n++; } });
    const cw = n ? sum.multiplyScalar(1 / n) : obj.position.clone();
    pts.forEach(([c, r]) => { far = Math.max(far, c.distanceTo(cw) + r); });
    p.c0 = m.group.worldToLocal(cw.clone()); p.r0 = far || 0.3;
    return p;
  }
  function refreshParts(st) { st.rebuildPick(); st.buildLabels(); st.applyXray(); if (st.cb.onModel) st.cb.onModel(st.activeParts()); }

  /* ---- Heart: conduction system, nerves, septum, chordae, coronary veins, lub-dub ---- */
  let actx = null;
  function thump(freq, dur, vol) {
    if (!actx) return; const t0 = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  document.addEventListener('pointerdown', () => { if (actx && actx.state === 'suspended') actx.resume().catch(() => {}); }, true);
  function heartExtras(st) {
    const m = st.model;
    if (!m || m.__cx || !['ra', 'rv', 'la', 'lv', 'aorta', 'tv', 'mv'].every((id) => m.parts.some((p) => p.id === id))) return;
    const K = kitFrom(st);
    if (!K.Curve || !K.TubeGeometry || !K.SphereGeometry || !K.Mesh || !K.Group || !K.MeshStandardMaterial || !K.MeshPhysicalMaterial || !K.Vector3) return;
    m.__cx = true;
    const V3 = (a) => new K.Vector3(a[0], a[1], a[2]);
    const glowM = (c, k) => new K.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k || 1.3, roughness: 0.4 });
    const flesh = (c) => new K.MeshPhysicalMaterial({ color: c, roughness: 0.5, clearcoat: 0.4 });
    const tube = (pts, r, mat) => { const c = new K.Curve(pts.map(V3)); const me = new K.Mesh(new K.TubeGeometry(c, Math.max(30, pts.length * 16), r, 10, false), mat); me.userData.curve = c; return me; };
    const ball = (r, mat, p, s) => { const me = new K.Mesh(new K.SphereGeometry(r, 26, 18), mat); me.position.set(p[0], p[1], p[2]); if (s) me.scale.set(s[0], s[1], s[2]); return me; };
    const grp = (...kids) => { const g = new K.Group(); kids.forEach((x) => g.add(x)); return g; };
    const SA = [-1.05, 1.42, 0.45], AVN = [-0.35, 0.2, 0.32], HIS = [0.05, -0.42, 0.24], RB = [-0.35, -1.6, 0.55], LB = [0.4, -1.7, 0.1];
    const condMat = glowM(0xffc93c, 1.2), nodeMat = glowM(0xffe27a, 1.8);
    const septum = ball(1, flesh(0xb5465a), [0.05, -0.75, 0.22], [0.14, 1.05, 0.55]); septum.rotation.z = 0.15;
    registerPart(st, K, 'septum', 'Interventricular septum', 'A thick muscular wall between the left and right ventricles. It keeps oxygen-rich and oxygen-poor blood from mixing.', septum, [0, 0, 0]);
    registerPart(st, K, 'sa', 'SA node (pacemaker)', 'The sino-atrial node in the wall of the right atrium starts every heartbeat with an electrical impulse. It sets the heart rate, about 70–75 beats a minute at rest.', ball(0.11, nodeMat, SA), [-0.9, 0.9, 0.6]);
    registerPart(st, K, 'avn', 'AV node', 'The atrio-ventricular node picks up the impulse from the atria and delays it for a moment, so the atria finish emptying before the ventricles contract.', ball(0.095, nodeMat, AVN), [-0.4, 0.2, 0.9]);
    const his = tube([AVN, [-0.1, -0.1, 0.27], HIS], 0.035, condMat), rbb = tube([HIS, [-0.2, -1.0, 0.45], RB], 0.028, condMat), lbb = tube([HIS, [0.3, -1.0, 0.15], LB], 0.028, condMat);
    registerPart(st, K, 'his', 'Bundle of His and bundle branches', 'Carries the impulse from the AV node down the septum. It splits into a right and a left bundle branch, one for each ventricle.', grp(his, rbb, lbb), [0, -0.2, 1.0]);
    const pk = [[RB, [-0.8, -1.2, 0.72], [-1.1, -0.6, 0.62]], [RB, [-0.15, -1.8, 0.85], [0.1, -1.5, 0.95]], [LB, [0.9, -1.3, -0.1], [1.2, -0.6, -0.12]], [LB, [0.7, -1.95, 0.3], [1.0, -1.6, 0.4]], [LB, [0.2, -1.95, -0.35], [0.6, -1.5, -0.6]]].map((pp) => tube(pp, 0.018, condMat));
    registerPart(st, K, 'purk', 'Purkinje fibres', 'Spread the impulse quickly through the walls of both ventricles, so they contract together from the apex (bottom) upwards and squeeze blood out.', grp(...pk), [0, -0.6, 1.2]);
    const chM = new K.MeshStandardMaterial({ color: 0xf2e1cf, roughness: 0.5 }), papM = flesh(0xc94a5f);
    const chordae = grp(ball(1, papM, [-0.6, -1.15, 0.5], [0.12, 0.26, 0.12]), ball(1, papM, [0.72, -1.3, 0.02], [0.13, 0.3, 0.13]),
      ...[[-0.95, 0.1, 0.3], [-0.8, 0.05, 0.45], [-0.65, 0.12, 0.2]].map((e) => tube([[-0.6, -0.92, 0.5], [(-0.6 + e[0]) / 2, -0.45, (0.5 + e[2]) / 2], e], 0.012, chM)),
      ...[[0.55, 0.25, -0.2], [0.75, 0.22, -0.05], [0.85, 0.3, -0.3]].map((e) => tube([[0.72, -1.02, 0.02], [(0.72 + e[0]) / 2, -0.4, (0.02 + e[2]) / 2], e], 0.012, chM)));
    registerPart(st, K, 'chordae', 'Papillary muscles and chordae tendineae', 'Tendon-like cords tie the flaps of the tricuspid and mitral valves to small papillary muscles. They stop the flaps from turning inside out when the ventricles contract.', chordae, [0, -0.3, 0.6]);
    const nerveM = new K.MeshStandardMaterial({ color: 0xfff1a8, emissive: 0x6b5a10, emissiveIntensity: 0.5, roughness: 0.45 });
    registerPart(st, K, 'vagus', 'Vagus nerve (slows the heart)', 'Parasympathetic nerve from the medulla oblongata of the brain. Its signals reach the SA and AV nodes and slow the heart rate.', grp(tube([[-1.7, 3.1, -0.3], [-1.4, 2.2, 0.15], SA], 0.03, nerveM), tube([[-1.4, 2.2, 0.15], [-0.8, 1.0, 0.55], AVN], 0.022, nerveM)), [-1.0, 1.0, 0.4]);
    registerPart(st, K, 'symp', 'Sympathetic cardiac nerves (speed up)', 'Sympathetic nerves speed up the heart and make it beat more strongly, for example during exercise, fear or excitement, together with the hormone adrenaline.', grp(tube([[1.9, 3.1, 0.2], [0.9, 2.1, 0.55], [0.15, 0.85, 0.78], [0.1, -0.4, 0.95]], 0.026, nerveM), tube([[0.9, 2.1, 0.55], [-0.4, 1.4, 0.75], SA], 0.02, nerveM)), [1.0, 1.0, 0.6]);
    const cvM = new K.MeshPhysicalMaterial({ color: 0x5b7cff, roughness: 0.35 });
    registerPart(st, K, 'cv', 'Coronary veins and coronary sinus', 'Collect oxygen-poor blood from the heart muscle itself and drain it into the right atrium through the coronary sinus.', grp(tube([[0.05, -1.85, 0.75], [0.25, -0.7, 0.95], [0.3, 0.35, 0.68], [0.75, 0.45, -0.35], [0.1, 0.25, -0.85], [-0.7, 0.2, -0.45]], 0.045, cvM), ball(0.09, cvM, [-0.7, 0.2, -0.45])), [0, 0, -1.2]);
    refreshParts(st);
    // impulse sparks
    const sparkM = glowM(0xffffff, 2.4), sparks = [ball(0.07, sparkM, SA), ball(0.06, sparkM, HIS), ball(0.06, sparkM, HIS)];
    sparks.forEach((s) => { s.visible = false; m.group.add(s); });
    const saAv = new K.Curve([V3(SA), V3([-0.75, 0.9, 0.45]), V3(AVN)]);
    const pathR = new K.Curve([V3(AVN), V3([-0.1, -0.1, 0.27]), V3(HIS), V3([-0.2, -1.0, 0.45]), V3(RB), V3([-0.8, -1.2, 0.72]), V3([-1.1, -0.6, 0.62])]);
    const pathL = new K.Curve([V3(AVN), V3([-0.1, -0.1, 0.27]), V3(HIS), V3([0.3, -1.0, 0.15]), V3(LB), V3([0.9, -1.3, -0.1]), V3([1.2, -0.6, -0.12])]);
    const P = (id) => m.parts.find((p) => p.id === id);
    m.param({ id: 'sound', label: 'Heart sound (lub-dub)', type: 'toggle', value: false });
    m.param({ id: 'impulse', label: 'Electrical impulse', type: 'toggle', value: true });
    st.params.sound = false; st.params.impulse = true;
    let ph = 0, prevPh = 0;
    const orig = m.update, origHud = m.hud;
    const sw = (x, a, b) => (x < a || x > b ? 0 : Math.sin(Math.PI * (x - a) / (b - a)));
    m.update = (Pm, t, dt, s) => {
      if (orig) orig(Pm, t, dt, s);
      const bpm = Pm.bpm || 72; prevPh = ph; ph = (ph + Math.max(0, dt) * bpm / 60) % 1;
      const crossed = (x) => (prevPh < x && ph >= x) || (prevPh > ph && (x > prevPh || x <= ph));
      const on = Pm.impulse !== false && !(s && s._ex > 0.04);
      if (on && ph < 0.12) { sparks[0].visible = true; saAv.getPointAt(Math.min(1, ph / 0.12), sparks[0].position); } else sparks[0].visible = false;
      if (on && ph >= 0.12 && ph < 0.3) { const u = (ph - 0.12) / 0.18; [1, 2].forEach((k) => { sparks[k].visible = true; (k === 1 ? pathR : pathL).getPointAt(Math.min(1, u), sparks[k].position); }); } else { sparks[1].visible = sparks[2].visible = false; }
      const glow = 1.2 + 2.2 * sw(ph, 0, 0.3);
      ['sa', 'avn', 'his', 'purk'].forEach((id) => { const p = P(id); if (p && st.selected !== id && st.hovered !== id) p.mats.forEach((mt) => { mt.emissiveIntensity = glow; }); });
      const lub = sw(ph, 0.16, 0.28), dub = sw(ph, 0.45, 0.56);
      [['tv', lub], ['mv', lub], ['pvv', dub], ['av', dub]].forEach(([id, k]) => { const p = P(id); if (p) p.obj.scale.set(p.baseScale.x * (1 - 0.35 * k), p.baseScale.y * (1 - 0.35 * k), p.baseScale.z * (1 + 0.6 * k)); });
      if (Pm.sound) {
        if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
        if (crossed(0.16)) { thump(70, 0.17, 0.8); thump(140, 0.12, 0.25); }
        if (crossed(0.45)) { thump(110, 0.1, 0.6); thump(220, 0.08, 0.2); }
      }
      m.__ph = ph;
    };
    m.hud = (Pm) => {
      const base = origHud ? origHud(Pm) : { title: '', lines: [] };
      const now = ph < 0.12 ? 'SA node fires → atria contract' : ph < 0.16 ? 'Impulse held at the AV node' : ph < 0.3 ? 'LUB: tricuspid and mitral valves close, ventricles contract' : ph < 0.45 ? 'Blood pumped into the aorta and pulmonary artery' : ph < 0.56 ? 'DUB: aortic and pulmonary valves close' : 'Heart relaxes and fills with blood';
      return Object.assign({}, base, { lines: [...(base.lines || []), 'Now: ' + now] });
    };
  }

  /* ---- See inside: make the outer shell see-through (every model) ---- */
  function outerIds(st) {
    const parts = st.activeParts(); if (parts.length < 2) return new Set();
    if (parts.some((p) => p.id === 'lv') && parts.some((p) => p.id === 'ra')) return new Set(['ra', 'rv', 'la', 'lv']);
    const sorted = parts.filter((p) => p.r0).sort((a, b) => b.r0 - a.r0), max = sorted[0] ? sorted[0].r0 : 0;
    const outer = sorted.filter((p) => p.r0 >= max * 0.62).slice(0, Math.max(1, Math.floor(parts.length / 2)));
    return new Set(outer.map((p) => p.id));
  }
  function setInside(st, on, keepId) {
    if (!st || !st.model) return; const outer = outerIds(st);
    st.model.parts.forEach((p) => {
      const see = on && outer.has(p.id) && p.id !== keepId;
      p.mats.forEach((mt) => {
        const u = mt.userData; if (u.__io === undefined) { u.__io = u.o0; u.__it = u.t0; u.__id = u.d0; }
        u.o0 = see ? Math.min(u.__io, 0.2) : u.__io; u.t0 = see ? true : u.__it; u.d0 = see ? false : u.__id;
      });
    });
    st.__inside = on; st.applyXray();
    const b = $('#cx-dock-inside'); if (b) b.classList.toggle('on', on);
  }

  /* ---- Names on images ---- */
  function projectedLabels(st, W, H, fit) {
    const out = [];
    st.activeParts().forEach((p) => {
      if (p.obj && p.obj.visible === false) return;
      const v = st.partWorldCenter(p).clone().project(st.camera);
      if (v.z > 1 || Math.abs(v.x) > 1.02 || Math.abs(v.y) > 1.02) return;
      const x = fit.dx + ((v.x + 1) / 2) * fit.dw, y = fit.dy + ((1 - v.y) / 2) * fit.dh;
      if (x < 0 || y < 0 || x > W || y > H) return;
      out.push({ id: p.id, name: p.name, x, y });
    });
    return out;
  }
  function drawLabels(g, list, opt) {
    const placed = [], fs = opt.fs || 14, minY = opt.minY || 4, maxY = opt.maxY || 1e9;
    const font = (hi) => (hi ? '700 ' + Math.round(fs * 1.3) : '600 ' + fs) + 'px Inter, system-ui, sans-serif';
    const order = list.slice().sort((a, b) => (b.id === opt.hi) - (a.id === opt.hi));
    order.forEach((l) => {
      const hi = l.id === opt.hi; g.font = font(hi);
      const w = g.measureText(l.name).width + fs * 1.3, hgt = (hi ? fs * 1.3 : fs) * 1.9;
      let x = Math.max(4, Math.min(opt.W - w - 4, l.x - w / 2)), y = Math.max(minY, Math.min(maxY - hgt, l.y - hgt - fs * 0.7));
      const hit = () => placed.some((r) => x < r.x + r.w + 4 && x + w + 4 > r.x && y < r.y + r.h + 2 && y + hgt + 2 > r.y);
      for (let k = 0; k < 10 && hit(); k++) y = k % 2 ? Math.max(minY, y - hgt * 1.05 * (k + 1)) : Math.min(maxY - hgt, y + hgt * 1.05 * (k + 1));
      placed.push({ x, y, w, h: hgt, l, hi });
    });
    placed.slice().reverse().forEach(({ x, y, w, h: hgt, l, hi }) => {
      g.font = font(hi); g.textBaseline = 'middle'; g.textAlign = 'left';
      g.globalAlpha = opt.dim && !hi ? 0.5 : 1;
      g.strokeStyle = hi ? '#5ee6c8' : 'rgba(234,240,255,0.55)'; g.lineWidth = hi ? 2 : 1;
      g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(x + w / 2, y + (y + hgt / 2 < l.y ? hgt : 0)); g.stroke();
      g.fillStyle = hi ? '#5ee6c8' : '#ffffff'; g.beginPath(); g.arc(l.x, l.y, hi ? 5 : 3.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = hi ? '#5ee6c8' : 'rgba(5,7,13,0.84)'; rr(g, x, y, w, hgt, hgt / 2); g.fill();
      g.strokeStyle = hi ? '#5ee6c8' : 'rgba(160,190,255,0.35)'; g.lineWidth = 1; rr(g, x, y, w, hgt, hgt / 2); g.stroke();
      g.fillStyle = hi ? '#04101a' : '#eaf0ff'; g.fillText(l.name, x + fs * 0.65, y + hgt / 2);
      g.globalAlpha = 1;
    });
  }
  function rr(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function labeledImage(st, t) {
    let url; try { url = st.screenshot(); } catch (e) { toast('Couldn\'t capture the 3D view.'); return; }
    const img = new Image();
    img.onload = () => {
      const W = img.width, H = img.height, c = document.createElement('canvas'); c.width = W; c.height = H + Math.round(H * 0.09);
      const g = c.getContext('2d'), top = Math.round(H * 0.09);
      g.fillStyle = '#05070d'; g.fillRect(0, 0, W, c.height); g.drawImage(img, 0, top);
      g.fillStyle = '#5ee6c8'; g.font = '600 ' + Math.round(top * 0.28) + 'px "JetBrains Mono", monospace'; g.textBaseline = 'middle'; g.fillText(CAMPUS.school + ' · ' + clsLabel(t.cls) + ' · ' + t.ch, top * 0.35, top * 0.32);
      g.fillStyle = '#eaf0ff'; g.font = Math.round(top * 0.42) + 'px "Instrument Serif", Georgia, serif'; g.fillText(t.title, top * 0.35, top * 0.72);
      const ratio = W / (st.container.clientWidth || W);
      drawLabels(g, projectedLabels(st, W, c.height, { dx: 0, dy: top, dw: W, dh: H }), { W, fs: Math.round(13 * ratio), hi: st.selected });
      c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b), a = h('a', { href: u, download: t.id + '-labelled.png' }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 6000); toast('Saved ' + t.id + '-labelled.png'); }, 'image/png');
    };
    img.src = url;
  }

  /* ---- Hook into the 3D viewer ---- */
  const ICO = { inside: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><circle cx="12" cy="12" r="3.2"/>', img: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h6M7 14h4"/>', vid: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>' };
  function dockBtn(id, ico, label, fn) {
    const b = h('button', { id, type: 'button', title: label, onclick: fn });
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ico + '</svg>';
    b.append(h('span', { text: label })); return b;
  }
  let seenModel = null;
  function viewerWatch() {
    const r = route(); if (r.v !== 'topic') { seenModel = null; return; }
    const st = stageNow(), t = topicOf(r.a); if (!st || !t) return;
    if (st.model !== seenModel) {
      seenModel = st.model;
      try { heartExtras(st); } catch (e) { console.warn('heart extras', e); }
      st.__inside = false;
      setTimeout(() => { const lb = [...document.querySelectorAll('.v-dock button')].find((b) => /Labels/.test(b.textContent)); if (lb && !lb.classList.contains('on')) lb.click(); }, 300);
    }
    const dock = $('.v-dock');
    if (dock && !dock.querySelector('#cx-dock-inside')) {
      dock.append(dockBtn('cx-dock-inside', ICO.inside, 'Inside', () => { const s = stageNow(); setInside(s, !(s && s.__inside)); }),
        dockBtn('cx-dock-img', ICO.img, 'Labelled image', () => { const s = stageNow(), x = topicOf(route().a); if (s && x) labeledImage(s, x); }),
        dockBtn('cx-dock-vid', ICO.vid, '3D video', () => { const x = route(); if (x.v === 'topic') openVideo(x.a); }));
    }
    const ib = $('#cx-dock-inside'); if (ib) ib.classList.toggle('on', !!st.__inside);
  }
  setInterval(viewerWatch, 400);

  /* ---- 3D video lesson: a narrated, named tour of the real model ---- */
  function tourFrames(t, st) {
    const split = (s) => (s.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [s]).map((x) => x.trim()).filter(Boolean);
    const outer = outerIds(st), F = [{ kind: 'title', h: t.title, line: clsLabel(t.cls) + ' · ' + t.ch, view: 'home' }];
    split(t.summary).forEach((l) => F.push({ kind: 'text', h: 'In short', line: l, view: 'home' }));
    st.activeParts().forEach((p, i, a) => F.push({ kind: 'part', h: p.name, line: p.info || '', part: p.id, inside: !outer.has(p.id) && outer.size > 0, n: i + 1, of: a.length }));
    t.learn.forEach((l, i) => F.push({ kind: 'point', h: 'Key point ' + (i + 1) + ' of ' + t.learn.length, line: l, view: 'explode' }));
    F.push({ kind: 'end', h: 'Your turn', line: 'Rotate the model, open the parts list and the simulation, then take the quiz.', view: 'home' });
    let s = 0; F.forEach((f) => { f.start = s; f.d = Math.max(f.kind === 'part' ? 5 : 4, f.line.split(/\s+/).length / 2.3 + (f.kind === 'part' ? 2 : 1.2)); s += f.d; });
    return { F, dur: Math.ceil(s) };
  }
  function applyFrame(st, f) {
    if (!st || !st.alive) return;
    if (f.kind === 'part') { st.setExplode(0); setInside(st, f.inside, f.part); st.select(f.part); }
    else { setInside(st, false); st.setExplode(f.view === 'explode' ? 0.55 : 0); st.resetView(); }
  }
  function drawTour(ctx, W, H, st, t, V, time, f) {
    ctx.fillStyle = '#05070d'; ctx.fillRect(0, 0, W, H);
    const src = st && st.alive ? st.renderer.domElement : null;
    let fit = { dx: 0, dy: 0, dw: W, dh: H };
    if (src && src.width) { const s = Math.max(W / src.width, H / src.height); fit = { dw: src.width * s, dh: src.height * s }; fit.dx = (W - fit.dw) / 2; fit.dy = (H - fit.dh) / 2; try { ctx.drawImage(src, fit.dx, fit.dy, fit.dw, fit.dh); } catch (e) {} }
    if (st && st.alive) { let ls = projectedLabels(st, W, H, fit); if (f.kind === 'part') ls = ls.filter((l) => l.id === f.part); drawLabels(ctx, ls, { W, fs: Math.round(H * 0.022), hi: f.part, minY: H * 0.15, maxY: H * (f.kind === 'title' ? 0.78 : 0.7) }); }
    const lp = Math.min(1, (time - f.start) / f.d);
    let g = ctx.createLinearGradient(0, 0, 0, H * 0.18); g.addColorStop(0, 'rgba(5,7,13,0.85)'); g.addColorStop(1, 'rgba(5,7,13,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.18);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#5ee6c8'; ctx.font = '600 ' + Math.round(H * 0.024) + 'px "JetBrains Mono", monospace'; ctx.fillText((CAMPUS.school + ' · 3D video lesson · ' + clsLabel(t.cls)).toUpperCase(), W * 0.04, H * 0.06);
    ctx.fillStyle = '#eaf0ff'; ctx.font = Math.round(H * 0.045) + 'px "Instrument Serif", Georgia, serif'; ctx.fillText(t.icon + ' ' + t.title, W * 0.04, H * 0.115);
    const boxH = f.kind === 'title' ? H * 0.2 : H * 0.27;
    g = ctx.createLinearGradient(0, H - boxH - H * 0.05, 0, H); g.addColorStop(0, 'rgba(5,7,13,0)'); g.addColorStop(0.25, 'rgba(5,7,13,0.86)'); g.addColorStop(1, 'rgba(5,7,13,0.95)'); ctx.fillStyle = g; ctx.fillRect(0, H - boxH - H * 0.05, W, boxH + H * 0.05);
    const L = W * 0.04, maxW = W * 0.9;
    ctx.fillStyle = f.kind === 'part' ? '#5ee6c8' : '#8b97b5'; ctx.font = '600 ' + Math.round(H * 0.024) + 'px "JetBrains Mono", monospace';
    ctx.fillText(f.kind === 'part' ? ('Part ' + f.n + ' of ' + f.of).toUpperCase() : f.kind === 'title' ? '' : f.h.toUpperCase(), L, H - boxH + H * 0.02);
    if (f.kind === 'part' || f.kind === 'title') { ctx.fillStyle = '#eaf0ff'; ctx.font = Math.round(H * (f.kind === 'title' ? 0.075 : 0.058)) + 'px "Instrument Serif", Georgia, serif'; ctx.fillText(f.kind === 'title' ? f.h : f.h, L, H - boxH + H * (f.kind === 'title' ? 0.085 : 0.08)); }
    ctx.fillStyle = '#d6def2'; ctx.font = Math.round(H * 0.031) + 'px Inter, system-ui, sans-serif';
    const words = f.line.split(' '), shown = Math.max(1, Math.ceil(words.length * Math.min(1, lp / 0.5)));
    const startY = H - boxH + H * (f.kind === 'part' ? 0.13 : f.kind === 'title' ? 0.135 : 0.085); let cnt = 0;
    wrap(ctx, f.line, maxW).slice(0, 4).forEach((ln, i) => { const lw = ln.split(' '), vis = lw.slice(0, Math.max(0, shown - cnt)).join(' '); cnt += lw.length; if (vis) ctx.fillText(vis, L, startY + i * H * 0.045); });
    const n = V.F.length, idx = V.F.indexOf(f), dw = Math.min(24, (W * 0.6) / n - 4);
    for (let i = 0; i < n; i++) { ctx.fillStyle = i < idx ? '#5ee6c8' : i === idx ? '#eaf0ff' : 'rgba(255,255,255,0.2)'; ctx.fillRect(L + i * (dw + 4), H - H * 0.03, dw, 3); }
  }
  function tourPlayer(box, t, st) {
    const V = tourFrames(t, st), p = vp(t.id), T = (p.tour = p.tour || { seen: [], pos: 0, fur: 0, done: false, secs: 0 });
    if (T.seen.length !== V.dur) { T.seen = new Array(V.dur).fill(0); T.pos = Math.min(T.pos, V.dur); T.fur = Math.min(T.fur, V.dur); }
    const cv = h('canvas', { width: '1280', height: '720', 'aria-label': '3D video lesson: ' + t.title }), ctx = cv.getContext('2d');
    const playBtn = h('button', { class: 'cx-play', 'aria-label': 'Play' }), track = h('div', { class: 'cx-track', title: 'Rewind any time. Skipping ahead is off until you finish once.' }), tc = h('canvas', { width: '600', height: '12' }), hd = h('div', { class: 'hd' });
    track.append(tc, hd);
    const time = h('span', { class: 'cx-time' }), speed = h('select', { id: 'cx-vspeed', 'aria-label': 'Speed' }, h('option', { value: '1', text: '1×' }), h('option', { value: '1.5', text: '1.5×' }), h('option', { value: '2', text: '2×' }));
    const voice = h('button', { class: 'cx-btn' + (S.voice !== false ? ' on' : ''), text: 'Voice' }), fs = h('button', { class: 'cx-btn', text: 'Full screen' });
    const prog = h('span', { class: 'cx-note' }), recBtn = h('button', { class: 'cx-btn', text: 'Save as video file (.webm)' }), recNote = h('span', { class: 'cx-note' });
    const capE = h('span', { class: 'eyebrow' }), capH = h('b', { class: 'cx-cap-h' }), capP = h('span', { class: 'cx-cap-p' });
    box.closest('#cx-video').classList.add('live'); document.documentElement.classList.add('cx-touring');
    const big = h('button', { class: 'cx-btn', text: 'Show video screen', title: 'Switch between the live model and the video screen' });
    const screen = h('div', { class: 'cx-screen', hidden: true }, cv);
    big.onclick = () => { const live = box.closest('#cx-video').classList.toggle('live'); screen.hidden = live; big.textContent = live ? 'Show video screen' : 'Back to live 3D'; document.documentElement.classList.toggle('cx-touring', live); };
    box.append(h('div', { class: 'cx-cap' }, capE, capH, capP), screen, h('div', { class: 'cx-ctrls' }, playBtn, track, time, speed, voice, big),
      h('div', { class: 'cx-row', style: 'justify-content:space-between' }, prog, h('span', { class: 'cx-row' }, recBtn, recNote)),
      h('p', { class: 'cx-note cx-live-tip', style: 'margin:0', text: 'Drag the model to turn it, scroll or pinch to zoom, even while the lesson plays. The lesson moves to the next part on its own.' }));
    let lastF = null, last = performance.now(), recording = null;
    const savedEx = st.explode, savedIn = st.__inside;
    player.cleanup = () => { document.documentElement.classList.remove('cx-touring'); try { setInside(st, !!savedIn); st.setExplode(savedEx || 0); st.select(null); st.resetView(); } catch (e) {} if (recording) recording.cancel = true; };
    const icon = () => { playBtn.innerHTML = player && player.playing ? '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 2h4v12H3zM9 2h4v12H9z" fill="currentColor"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>'; };
    const frameAt = (x) => V.F.find((f, i) => x < f.start + f.d || i === V.F.length - 1);
    const draw = () => {
      const f = frameAt(T.pos);
      if (f !== lastF) { lastF = f; applyFrame(st, f); if (player && player.playing && S.voice !== false && speed.value === '1') speak(f.kind === 'part' ? f.h + '. ' + f.line : f.kind === 'title' ? f.h + '. ' + f.line : f.line);
        capE.textContent = f.kind === 'part' ? 'Part ' + f.n + ' of ' + f.of : f.kind === 'title' ? clsLabel(t.cls) + ' · ' + t.ch : f.h; capH.textContent = f.kind === 'part' || f.kind === 'title' ? f.h : ''; capP.textContent = f.line; }
      if (recording || !screen.hidden) drawTour(ctx, 1280, 720, st, t, V, T.pos, f);
      const c = tc.getContext('2d'), W = tc.width, n = V.dur; c.clearRect(0, 0, W, 12); c.fillStyle = '#5ee6c8';
      for (let i = 0; i < n; i++) if (T.seen[i]) c.fillRect(Math.floor(i * W / n), 0, Math.ceil(W / n) + 1, 12);
      hd.style.left = 'calc(' + (T.pos / V.dur * 100) + '% - 1px)'; time.textContent = fmt(T.pos) + ' / ' + fmt(V.dur);
      prog.textContent = T.done ? 'Completed · ' + fmt(T.secs) + ' watched' : Math.round(T.seen.reduce((a, b) => a + b, 0) / n * 100) + '% watched';
    };
    const loop = (now) => {
      if (!player || player.id !== t.id || !st.alive) return;
      const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;
      if (player.playing) {
        const prev = T.pos; T.pos = Math.min(V.dur, T.pos + dt * +speed.value); T.secs += dt;
        for (let i = Math.floor(prev); i <= Math.min(V.dur - 1, Math.floor(T.pos)); i++) T.seen[i] = 1;
        T.fur = Math.max(T.fur, T.pos);
        if (!T.done && T.seen.reduce((a, b) => a + b, 0) / V.dur >= 0.95) { T.done = true; markVideoDone(t.id, '3D video lesson'); }
        if (T.pos >= V.dur) { player.playing = false; icon(); stopSpeech(); if (recording) recording.finish(); }
        save();
      }
      draw(); player.raf = requestAnimationFrame(loop);
    };
    playBtn.onclick = () => { if (!player) return; if (!player.playing && T.pos >= V.dur - 0.05) T.pos = 0; player.playing = !player.playing; last = performance.now(); lastF = null; if (!player.playing) stopSpeech(); icon(); };
    track.onclick = (e) => { const r = track.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * V.dur; if (x > T.fur + 1 && !T.done) { toast('Skipping ahead unlocks after you watch the lesson once. You can rewind any time.'); return; } T.pos = Math.max(0, Math.min(V.dur, x)); lastF = null; stopSpeech(); };
    voice.onclick = () => { S.voice = S.voice === false; voice.classList.toggle('on', S.voice !== false); if (S.voice === false) stopSpeech(); else lastF = null; save(); };
    fs.onclick = () => { try { const el = box.querySelector('.cx-screen'); (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => toast('Full screen isn\'t available here.')); } catch (e) {} };
    recBtn.onclick = () => {
      if (recording) { recording.cancel = true; recording.finish(); return; }
      if (!window.MediaRecorder || !cv.captureStream) { recNote.textContent = 'This browser can\'t record video. Try Chrome or Edge.'; return; }
      const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((x) => MediaRecorder.isTypeSupported(x));
      let rec; try { rec = new MediaRecorder(cv.captureStream(30), mime ? { mimeType: mime } : undefined); } catch (e) { recNote.textContent = 'Recording isn\'t available here.'; return; }
      const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recording = { cancel: false, finish: () => { if (rec.state !== 'inactive') rec.stop(); } };
      rec.onstop = () => {
        const cancelled = recording && recording.cancel; recording = null; recBtn.textContent = 'Save as video file (.webm)';
        if (cancelled) { recNote.textContent = 'Recording stopped.'; return; }
        const b = new Blob(chunks, { type: 'video/webm' }), u = URL.createObjectURL(b), a = h('a', { href: u, download: t.id + '-3d-video-lesson.webm' });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 8000);
        recNote.textContent = 'Saved ' + t.id + '-3d-video-lesson.webm (picture with names and captions; the voice is not included).';
      };
      T.pos = 0; lastF = null; speed.value = '1'; rec.start(1000); recBtn.textContent = 'Stop recording'; recNote.textContent = 'Recording the whole lesson (' + fmt(V.dur) + '). Keep this tab open.';
      if (!player.playing) { player.playing = true; last = performance.now(); icon(); }
    };
    icon(); draw(); player.raf = requestAnimationFrame(loop);
  }

  /* ================= 12. STUDY LOCK ================= */
  const lockOn = () => !!(S.lock.on && S.lock.end > Date.now());
  const ALLOWED = (r) => ['home', 'library', 'topic', 'test', 'lab'].includes(r.v) || (r.v === 'campus' && (LOCK_TABS.includes(r.a) || (!r.a && RENDER.today)));
  function inSchedule() {
    const s = S.lock.schedule; if (!s.on) return false;
    const n = new Date(), m = n.getHours() * 60 + n.getMinutes(), [fh, fm] = s.from.split(':').map(Number), [th, tm] = s.to.split(':').map(Number);
    const a = fh * 60 + fm, b = th * 60 + tm; return a <= b ? m >= a && m < b : m >= a || m < b;
  }
  function startLock(min) {
    Object.assign(S.lock, { on: true, start: Date.now(), end: Date.now() + min * 60000, min, cur: { leaves: [], notified: false } });
    S.role = 'student';
    notify('parent', S.child.name + ' started a ' + min + '-minute study session (study lock on).', 'lock');
    log('Study lock started: ' + min + ' min'); save();
    try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch (e) {}
    location.hash = '#/library'; drawLock();
  }
  function endLock(how) {
    const L = S.lock, c = L.cur || { leaves: [] }, mins = Math.max(0, Math.round((Date.now() - L.start) / 60000));
    const away = Math.round(c.leaves.reduce((a, x) => a + ((x.back || Date.now()) - x.at), 0) / 1000);
    L.sessions.unshift({ at: L.start, min: mins, planned: L.min, leaves: c.leaves.length, away, how }); L.sessions = L.sessions.slice(0, 60);
    L.on = false; L.cur = null; save();
    notify('parent', 'Study session ' + (how === 'completed' ? 'completed' : 'ended early (' + how + ')') + ': ' + mins + ' min, left the app ' + c.leaves.length + ' time' + (c.leaves.length === 1 ? '' : 's') + (away ? ' (' + fmt(away) + ' away)' : '') + '.', 'lock');
    log('Study lock ended: ' + how);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    const ret = $('#cx-return'); if (ret) ret.hidden = true;
    drawLock(); if (!$('#campus-root').hidden) render();
  }
  let endAsk = false, pinErr = '', barMode = '';
  function drawLock() {
    let bar = $('#cx-lockbar'); if (!bar) { bar = h('div', { id: 'cx-lockbar', role: 'status' }); document.body.append(bar); }
    if (!lockOn()) {
      if (S.lock.on) { endLock('completed'); toast('Study session complete. Well done!'); return; }
      if (S.role === 'student' && inSchedule() && route().v !== 'campus') {
        if (barMode === 'sched' && !bar.hidden) return;
        barMode = 'sched'; bar.hidden = false;
        bar.replaceChildren(h('span', { text: 'It\'s study time (' + S.lock.schedule.from + '–' + S.lock.schedule.to + ', set by your parent).' }), h('button', { class: 'pri', text: 'Start study lock', onclick: () => { location.hash = '#/campus/lock'; } }));
      } else { bar.hidden = true; barMode = ''; }
      return;
    }
    bar.hidden = false;
    const left = Math.ceil((S.lock.end - Date.now()) / 1000), n = S.lock.cur ? S.lock.cur.leaves.length : 0;
    const mode = (endAsk ? (S.lock.pin ? 'pin' : 'confirm') : 'run') + '|' + pinErr;
    if (mode === barMode && bar.querySelector('.t')) { bar.querySelector('.t').textContent = fmt(left); const c = bar.querySelector('.n'); if (c) c.textContent = 'left the app ' + n + '×'; return; }
    barMode = mode;
    const kids = [h('span', {}, '🔒 Study lock · ', h('span', { class: 't', text: fmt(left) }), ' left'), h('span', { class: 'n', style: 'color:#b8c3de;font-weight:400', text: 'left the app ' + n + '×' })];
    if (!endAsk) kids.push(h('button', { text: 'End early', onclick: () => { endAsk = true; pinErr = ''; drawLock(); } }));
    else if (S.lock.pin) {
      const pin = h('input', { type: 'password', inputmode: 'numeric', id: 'cx-endpin', placeholder: 'PIN', 'aria-label': 'Parent PIN', maxlength: '6' });
      const tryPin = () => { if (pin.value === S.lock.pin) { endAsk = false; pinErr = ''; endLock('parent PIN'); } else { pin.value = ''; pinErr = 'Wrong PIN'; drawLock(); const x = $('#cx-endpin'); if (x) x.focus(); } };
      pin.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPin(); });
      kids.push(h('span', { text: 'Parent PIN:' }), pin, h('button', { class: 'pri', text: 'End', onclick: tryPin }), h('button', { text: 'Cancel', onclick: () => { endAsk = false; pinErr = ''; drawLock(); } }));
      if (pinErr) kids.push(h('span', { style: 'color:#ff8fa3', text: pinErr }));
    } else kids.push(h('span', { text: 'End the session now?' }), h('button', { class: 'pri', text: 'Yes, end', onclick: () => { endAsk = false; endLock('ended by student'); } }), h('button', { text: 'Keep going', onclick: () => { endAsk = false; drawLock(); } }));
    bar.replaceChildren(...kids);
    if (endAsk && S.lock.pin) setTimeout(() => { const x = $('#cx-endpin'); if (x) x.focus(); }, 0);
  }
  setInterval(() => { if (S.lock.on || S.lock.schedule.on) drawLock(); }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (player && player.playing && document.hidden) { player.playing = false; stopSpeech(); const b = $('#cx-video .cx-play'); if (b) { b.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>'; b.setAttribute('aria-label', 'Play'); } }
    if (!lockOn()) return;
    const c = S.lock.cur || (S.lock.cur = { leaves: [], notified: false });
    if (document.hidden) { c.leaves.push({ at: Date.now() }); save(); return; }
    const l = c.leaves[c.leaves.length - 1];
    if (l && !l.back) {
      l.back = Date.now();
      if (c.leaves.length >= S.lock.notifyAfter && !c.notified) { c.notified = true; notify('parent', 'During study lock ' + S.child.name + ' left the app ' + c.leaves.length + ' times in this session.', 'lock'); }
      save(); showReturn(l);
    }
  });
  function showReturn(l) {
    let o = $('#cx-return'); if (!o) { o = h('div', { id: 'cx-return', role: 'dialog', 'aria-modal': 'true' }); document.body.append(o); }
    const away = Math.round((l.back - l.at) / 1000);
    o.hidden = false;
    o.replaceChildren(h('div', { class: 'box' }, h('span', { class: 'eyebrow', text: 'Study lock' }), h('h2', { text: 'Welcome back' }),
      h('p', { text: 'You left the study session at ' + hm(l.at) + ' for ' + fmt(away) + '. This is recorded in the study report your parent sees.' }),
      h('button', { class: 'cta', text: 'Continue studying', onclick: () => { o.hidden = true; try { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} } })));
  }
  function lockGuard(r) {
    if (!lockOn() || ALLOWED(r)) return false;
    toast('Study lock is on. Finish the session, or ask a parent to end it with the PIN.');
    location.replace(r.v === 'campus' ? '#/campus/lock' : '#/library');
    return true;
  }
  function phoneGuide() {
    return h('div', { class: 'cx-guide' },
      h('p', { class: 'cx-note', text: 'What this app does by itself: full screen, pauses and records when she leaves the app, and needs your PIN to end early. A website cannot block other apps or tabs, or forward phone calls. These phone settings do that, and you stay in control of them.' }),
      h('details', { open: true }, h('summary', { text: 'Android phone or tablet' }), h('ol', {},
        h('li', { text: 'Install the app: open it in Chrome, tap ⋮ and choose "Install app" or "Add to Home screen". Opening it from the home screen gives its own window without browser tabs.' }),
        h('li', { text: 'Lock the phone to this app (App pinning): Settings › Security (on some phones Security & privacy › More security settings) › App pinning › On, and turn on "Ask for PIN before unpinning". Open the app, open Recent apps, tap the app\'s icon › Pin. She can\'t open other apps until it\'s unpinned with the phone PIN.' }),
        h('li', { text: 'Only parents can call: Settings › Notifications (or Sound) › Do Not Disturb › People › Calls › Starred contacts. Star your number. Turn on "Repeat callers" so urgent calls get through.' }),
        h('li', { text: 'Or forward all calls to you: Phone app › ⋮ › Settings › Calls (or Supplementary services) › Call forwarding › Always forward › your number. Turn it off after study time. Some networks use their own codes; your network\'s app shows them.' }),
        h('li', { text: 'For daily schedules and app limits, use Google Family Link.' }))),
      h('details', {}, h('summary', { text: 'iPhone or iPad' }), h('ol', {},
        h('li', { text: 'Add to Home Screen: open the app in Safari › Share › Add to Home Screen.' }),
        h('li', { text: 'Lock to this app (Guided Access): Settings › Accessibility › Guided Access › On, and set a passcode. Open the app, triple-click the side (or Home) button, tap Start. It ends only with your passcode.' }),
        h('li', { text: 'Only parents can call: Settings › Focus › Do Not Disturb › People › allow calls from Favourites, and turn on "Allow repeated calls".' }),
        h('li', { text: 'Forward calls: Settings › Phone › Call Forwarding (not every Indian network supports this on iPhone).' }),
        h('li', { text: 'Screen Time › Downtime lets you allow only this app during study hours.' }))),
      h('details', {}, h('summary', { text: 'Safety' }), h('ol', {},
        h('li', { text: 'Emergency calls (112) can always be made from the lock screen.' }),
        h('li', { text: 'The SOS button stays on screen during study lock.' }),
        h('li', { text: 'Tell your child what is set up and why. Study lock is shown on screen; nothing is hidden from her.' }))));
  }
  function renderLock(main) {
    const L = S.lock, role = S.role;
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Study lock · do not disturb' }), h('h1', { html: role === 'parent' ? 'Study time, <em>your rules</em>' : 'Focus on <em>learning</em>' }))));
    if (role === 'student') {
      if (lockOn()) main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Study lock is on' }), h('p', { text: fmt((L.end - Date.now()) / 1000) + ' left. You can use the lessons, 3D models, quizzes and videos.' }), h('div', { class: 'cx-row' }, h('a', { class: 'cx-btn pri', href: '#/library', text: 'Go to lessons' }), h('a', { class: 'cx-btn', href: '#/campus/videos', text: 'Lesson videos' }))));
      else main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Start a study session' }),
        h('p', { class: 'cx-note', text: 'While it runs: full screen, only lessons, 3D models, quizzes and videos open, and leaving the app is recorded for your parent. ' + (L.pin ? 'Ending early needs your parent\'s PIN.' : 'Ask your parent to set a PIN.') }),
        inSchedule() ? h('p', { style: 'color:#5ee6c8', text: 'It\'s study time now (' + L.schedule.from + '–' + L.schedule.to + ').' }) : null,
        h('div', { class: 'cx-row' }, [15, 30, 45, 60].map((m) => h('button', { class: 'cx-btn pri big', text: m + ' min', onclick: () => startLock(m) })))));
      main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Make your phone quiet too' }), phoneGuide()));
      return;
    }
    if (role === 'parent') {
      const p1 = h('input', { type: 'password', inputmode: 'numeric', id: 'cx-pin1', maxlength: '6', placeholder: '4–6 digits' });
      const from = h('input', { type: 'time', id: 'cx-from', value: L.schedule.from }), to = h('input', { type: 'time', id: 'cx-to', value: L.schedule.to });
      const sch = h('input', { type: 'checkbox', id: 'cx-sch', checked: L.schedule.on });
      const thr = h('input', { type: 'number', id: 'cx-thr', min: '1', max: '20', value: String(L.notifyAfter), style: 'width:80px' });
      [from, to].forEach((x) => x.onchange = () => { L.schedule.from = from.value || '18:00'; L.schedule.to = to.value || '20:00'; save(); });
      sch.onchange = () => { L.schedule.on = sch.checked; save(); }; thr.onchange = () => { L.notifyAfter = Math.max(1, +thr.value || 3); save(); };
      main.append(h('div', { class: 'cx-grid2' },
        h('div', { class: 'cx-card glass' }, h('h3', { text: 'Parent PIN' }), h('p', { class: 'cx-note', text: L.pin ? 'A PIN is set. ' + S.child.name + ' needs it to end a session early.' : 'Set a PIN so ' + S.child.name + ' can\'t end a session early without you.' }),
          h('div', { class: 'cx-pin' }, p1, h('button', { class: 'cx-btn pri', text: L.pin ? 'Change PIN' : 'Set PIN', onclick: () => { if (!/^\d{4,6}$/.test(p1.value)) { toast('Use 4 to 6 digits.'); return; } L.pin = p1.value; log('Parent set the study lock PIN'); save(); render(); toast('PIN saved.'); } }), L.pin ? h('button', { class: 'cx-btn', text: 'Remove PIN', onclick: () => { L.pin = ''; save(); render(); } }) : null),
          h('h4', { text: 'Study hours' }), h('label', { class: 'cx-row' }, sch, 'Remind ' + S.child.name + ' to start study lock between'), h('div', { class: 'cx-row', style: 'margin-top:8px' }, from, h('span', { text: 'and' }), to),
          h('h4', { text: 'Tell me' }), h('label', { class: 'cx-row' }, 'when the app is left', thr, 'times in one session')),
        h('div', { class: 'cx-card glass' }, h('h3', { text: 'Study sessions' }), L.sessions.length ? h('div', { class: 'cx-table-wrap' }, h('table', { class: 'cx-table', style: 'min-width:420px' }, h('thead', {}, h('tr', {}, ['When', 'Studied', 'Left the app', 'How it ended'].map((t) => h('th', { text: t })))),
          h('tbody', {}, L.sessions.slice(0, 12).map((x) => h('tr', {}, h('td', { text: when(x.at) }), h('td', { class: 'cx-num', text: x.min + ' / ' + x.planned + ' min' }), h('td', { text: x.leaves + '×' + (x.away ? ' (' + fmt(x.away) + ')' : '') }), h('td', { text: x.how })))))) : h('p', { class: 'cx-note', text: 'No sessions yet.' }),
          lockOn() ? h('p', { style: 'color:#5ee6c8;margin-top:10px', text: 'A session is running now: ' + fmt((L.end - Date.now()) / 1000) + ' left.' }) : null)));
      main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Set up the phone' }), phoneGuide()));
      return;
    }
    main.append(h('div', { class: 'cx-card glass' }, h('p', { class: 'cx-note', text: 'Study lock is set by parents and used by students. Switch role to Student or Parent to try it.' })));
  }

  /* ================= 13. MESSAGES TAB ================= */
  function msgList(list, empty) {
    if (!list.length) return h('p', { class: 'cx-note', text: empty });
    return h('div', {}, list.map((m) => h('div', { class: 'cx-msg' + (m.read ? '' : ' unread') + (m.urgent ? ' urgent' : '') }, h('time', { text: when(m.at) }), h('span', {}, h('b', { class: 't', text: m.text }),
      (S.role === 'teacher' || S.role === 'principal') && m.urgent && S.child.parentPhone && m.text.includes(S.child.name) ? h('div', { style: 'margin-top:6px' }, h('a', { class: 'cx-btn', href: 'https://wa.me/' + S.child.parentPhone.replace(/\D/g, '') + '?text=' + encodeURIComponent(m.text), target: '_blank', rel: 'noopener noreferrer', text: 'WhatsApp the parent' })) : null))));
  }
  let msgFilter = 'all';
  function renderInbox(main) {
    const role = S.role, mine = S.inbox.filter((m) => m.to === role), shown = mine.filter((m) => msgFilter === 'all' || m.kind === msgFilter);
    main.append(h('div', { class: 'cx-title' }, h('div', {}, h('span', { class: 'eyebrow', text: 'Messages · ' + ROLES.find((r) => r[0] === role)[1] }), h('h1', { html: 'Your <em>messages</em>' })),
      mine.some((m) => !m.read) ? h('button', { class: 'cx-btn', text: 'Mark all as read', onclick: () => { mine.forEach((m) => { m.read = true; }); save(); render(); } }) : null));
    main.append(h('div', { class: 'seg', style: 'max-width:620px' }, [['all', 'All'], ['bus', 'Bus'], ['act', 'Activities'], ['video', 'Videos'], ['lock', 'Study lock'], ['note', 'Notes']].map(([k, l]) => h('button', { class: msgFilter === k ? 'on' : '', text: l, onclick: () => { msgFilter = k; render(); } }))));
    main.append(h('div', { class: 'cx-card glass' }, msgList(shown.slice(0, 80), 'Nothing here yet. Bus updates, activity requests, video progress and study reports appear here.')));
    setTimeout(() => { shown.forEach((m) => { m.read = true; }); save(); badges(); }, 1500);
    if (role === 'parent' || role === 'teacher' || role === 'principal' || role === 'student') {
      const targets = { parent: [['teacher', 'Class teacher'], ['principal', 'Principal'], ['transport', 'Transport office']], teacher: [['parent', 'Parent of ' + S.child.name], ['principal', 'Principal'], ['student', S.child.name]], principal: [['parent', 'Parent of ' + S.child.name], ['teacher', 'Class teacher'], ['transport', 'Transport office']], student: [['teacher', 'Class teacher']] }[role];
      const to = h('select', { id: 'cx-msg-to' }, targets.map(([k, l]) => h('option', { value: k, text: l }))), txt = h('textarea', { id: 'cx-msg-txt', placeholder: 'Write a message…' });
      main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Send a message' }), h('div', { class: 'cx-row', style: 'margin-bottom:8px' }, h('span', { class: 'cx-note', text: 'To' }), to), txt,
        h('div', { class: 'cx-row', style: 'margin-top:10px' }, h('button', { class: 'cx-btn pri', text: 'Send', onclick: () => { if (!txt.value.trim()) return; const from = { parent: 'Parent of ' + S.child.name, teacher: 'Class teacher', principal: 'Principal', student: S.child.name }[role]; notify(to.value, 'From ' + from + ': ' + txt.value.trim(), 'note'); txt.value = ''; toast('Sent.'); } }))));
    }
    if (role === 'parent') {
      const name = h('input', { id: 'cx-child', value: S.child.name }), cls = h('select', { id: 'cx-ccls' }, ['6', '7', '8', '9', '10', '11', '12'].map((c) => h('option', { value: c, text: clsLabel(c), selected: c === S.child.cls }))), phone = h('input', { id: 'cx-pphone', inputmode: 'tel', placeholder: 'e.g. 919876543210', value: S.child.parentPhone });
      main.append(h('div', { class: 'cx-card glass' }, h('h3', { text: 'Your details' }), h('div', { class: 'cx-grid3' }, h('label', { class: 'cx-field' }, 'Child\'s name', name), h('label', { class: 'cx-field' }, 'Class', cls), h('label', { class: 'cx-field' }, 'Your WhatsApp number (with country code)', phone)),
        h('div', { class: 'cx-row', style: 'margin-top:10px' }, h('button', { class: 'cx-btn pri', text: 'Save', onclick: () => { S.child.name = name.value.trim() || S.child.name; S.child.cls = cls.value; S.child.parentPhone = phone.value.trim(); save(); render(); toast('Saved.'); } })),
        h('p', { class: 'cx-note', style: 'margin-top:8px', text: 'The school uses your number to reach you on WhatsApp about urgent bus or safety alerts. Automatic SMS needs the school server (see README-CAMPUS).' })));
    }
  }

  /* ================= 14. SHELL ================= */
  const route = () => { const p = location.hash.replace(/^#\/?/, '').split('/'); return { v: p[0] || 'home', a: p[1] || '' }; };
  let tab = 'bus';
  const TABS = [['bus', 'Bus tracking'], ['activities', 'Activities'], ['videos', 'Lesson videos'], ['inbox', 'Messages'], ['lock', 'Study lock']];
  const RENDER = { bus: (m) => renderBus(m), activities: (m) => renderActivities(m), videos: (m) => renderVideos(m), inbox: (m) => renderInbox(m), lock: (m) => renderLock(m) };
  const TAB_ROLES = {};
  const LOCK_TABS = ['lock', 'videos'];
  const tabsFor = (role) => (role === 'transport' ? ['bus', 'inbox'] : TABS.map((t) => t[0]).filter((k) => !TAB_ROLES[k] || TAB_ROLES[k].includes(role)));
  const defaultTab = () => (S.role === 'student' && RENDER.today ? 'today' : S.role === 'parent' && RENDER.today ? 'today' : 'bus');
  function registerTab(key, label, fn, opt = {}) {
    if (!RENDER[key]) { if (opt.first) TABS.unshift([key, label]); else if (opt.after) { const i = TABS.findIndex((t) => t[0] === opt.after); TABS.splice(i + 1, 0, [key, label]); } else TABS.push([key, label]); }
    RENDER[key] = fn; if (opt.roles) TAB_ROLES[key] = opt.roles; if (opt.lockOk) LOCK_TABS.push(key);
    if (!root.hidden) { const r = route(); if (r.a === key || !r.a) tab = r.a || defaultTab(); render(); }
  }
  const root = h('div', { id: 'campus-root', hidden: true });
  document.body.append(root);
  let toastEl = null, toastT = 0;
  function toast(text, urgent) {
    if (!toastEl) { toastEl = h('div', { class: 'cx-toast', role: 'status', 'aria-live': 'polite' }); document.body.append(toastEl); }
    toastEl.textContent = text; toastEl.classList.toggle('urgent', !!urgent); toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, urgent ? 6500 : 3800);
  }
  function badges() {
    const n = ['student', 'parent', 'teacher', 'principal', 'transport'].includes(S.role) ? unread(S.role) : 0;
    const nb = $('#cx-navbtn .cx-badge'); if (nb) { nb.textContent = n; nb.hidden = !n; }
    const tb = $('#cx-tab-inbox .cx-badge'); if (tb) { tb.textContent = n; tb.hidden = !n; }
  }
  function render() {
    const locked = lockOn();
    if (locked) S.role = 'student';
    if (!tabsFor(S.role).includes(tab)) tab = tabsFor(S.role)[0];
    root.textContent = '';
    const head = h('header', { class: 'cx-head' },
      h('div', { class: 'cx-brand' }, h('i'), h('span', {}, CAMPUS.school, h('small', { text: 'Campus · ' + S.child.name + ', ' + clsLabel(S.child.cls) }))),
      h('button', { class: 'cx-back', text: '← Back to learning', onclick: () => { location.hash = '#/library'; } }),
      h('label', { class: 'cx-role' }, 'Viewing as', h('select', { id: 'cx-role', disabled: locked, title: locked ? 'Study lock is on' : '', onchange: (e) => { S.role = e.target.value; save(); render(); } }, ROLES.map(([k, l]) => h('option', { value: k, text: l, selected: S.role === k })))),
      h('nav', { class: 'cx-tabs', 'aria-label': 'Campus sections' }, TABS.filter(([k]) => tabsFor(S.role).includes(k)).map(([k, l]) => h('button', { id: 'cx-tab-' + k, class: tab === k ? 'on' : '', disabled: locked && !LOCK_TABS.includes(k), onclick: () => { location.hash = '#/campus/' + k; } }, l, k === 'inbox' ? h('span', { class: 'cx-badge', hidden: true }) : null))));
    const main = h('main', { class: 'cx-main' });
    root.append(head, main);
    (RENDER[tab] || RENDER.bus)(main);
    badges();
  }
  function injectNav() {
    const nav = $('header.nav nav');
    if (!nav || nav.querySelector('#cx-navbtn')) return;
    const b = h('button', { id: 'cx-navbtn', type: 'button', onclick: () => { location.hash = '#/campus/bus'; } }, 'Campus', h('span', { class: 'cx-badge', hidden: true }));
    nav.append(b); badges();
  }
  new MutationObserver(() => { injectNav(); }).observe(document.body, { childList: true, subtree: true });
  function onRoute() {
    const r = route();
    if (lockGuard(r)) return;
    if (r.v !== 'topic' && player) closeVideo();
    const inCampus = r.v === 'campus';
    root.hidden = !inCampus;
    document.documentElement.classList.toggle('campus-open', inCampus);
    if (inCampus) { tab = TABS.some((t) => t[0] === r.a) ? r.a : defaultTab(); render(); root.scrollTop = 0; }
    if (r.v === 'topic' && topicOf(r.a)) { const t = topicOf(r.a); S.last = { kind: 'topic', id: t.id, title: t.title, at: Date.now() }; save(); }
    videoChip(); injectNav(); drawLock();
  }
  addEventListener('hashchange', onRoute);
  onRoute();
  if (S.lock.on && !lockOn()) endLock('completed');
  window.INSTITUTION_CAMPUS = { notify, openVideo, startTrip, state: () => S, save, h, toast, route, render, registerTab, clsLabel, TOPICS, topicOf, speak, stopSpeech, stageNow, when, fmt, hm, msgList, lockOn, CAMPUS, refreshParts, kitFrom, registerPart, setInside };
  document.dispatchEvent(new CustomEvent('campus:ready'));
})();
