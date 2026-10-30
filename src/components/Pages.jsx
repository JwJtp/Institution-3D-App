import React, { useState } from 'react';
import { Hero3D, Thumb } from './StageView.jsx';
import { Runner, Confetti } from './Quiz.jsx';
import { TOPICS, CLASSES, COMING } from '../data/topics.js';
import { CONFIG } from '../config.js';
import { useStore, set, reset, isUnlocked, byClass, classDone, testUnlocked, levelOf, progressPct, finishTest } from '../store.js';

export function Nav({ view, go }) {
  const s = useStore(), L = levelOf(s.xp);
  const items = [['home', 'Home'], ['library', 'Library'], ['dash', 'Dashboard'], ['feedback', 'Feedback']];
  return (
    <header className="nav glass">
      <button className="brand" onClick={() => go('home')}><i className="logo" />{CONFIG.brand}</button>
      <nav>{items.map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}</nav>
      <div className="xp" title={`${s.xp} XP`}><span>LV {L.level}</span><div><i style={{ width: L.pct * 100 + '%' }} /></div><b>🔥{s.streak}</b></div>
    </header>);
}

export function Home({ go }) {
  const s = useStore();
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">NCERT · CBSE · Classes 6–12</span>
          <h1>See Biology.<br /><em>Understand</em> Biology.<br />Experience Biology.</h1>
          <p>Photoreal interactive 3D models of the heart, brain, neuron, cells, DNA, plant and human reproduction — with guided tours, simulations, quizzes and boss-battle tests.</p>
          <div className="row"><button className="cta lg" onClick={() => go('library')}>Start learning</button><button className="ghost lg" onClick={() => go('topic', 'heart')}>Try the 3D heart</button></div>
          <div className="stats"><div><b>{TOPICS.length}</b><span>3D labs</span></div><div><b>7</b><span>Classes</span></div><div><b>{TOPICS.length * 4}</b><span>Quiz questions</span></div><div><b>{progressPct(s)}%</b><span>Your progress</span></div></div>
        </div>
        <div className="hero-3d"><Hero3D modelKey="heart" /><div className="hero-tag glass">Drag me · it's real 3D</div></div>
      </section>
      <section className="feat">
        {[['🧊', 'Real 3D, not videos', 'Rotate, zoom, explode, slice and x-ray every organ.'], ['🎮', 'Game-style learning', 'XP, levels, streaks, unlockable topics and boss tests.'], ['🧪', 'Live simulations', 'Heartbeat, nerve impulse, pollen tube, menstrual cycle and more.'], ['👨‍👩‍👧', 'Teachers & parents', 'Progress dashboards and feedback for every role.']].map(([i, t, d]) => <div className="card glass" key={t}><span className="fi">{i}</span><h3>{t}</h3><p>{d}</p></div>)}
      </section>
      <section className="soon">
        <h2>More subjects <em>coming soon</em></h2>
        <div className="soon-g">{COMING.map((c) => <div className="card glass" key={c.id} style={{ '--h': c.hue }}><span className="fi">{c.icon}</span><h3>{c.name}</h3><p>{c.topics.join(' · ')}</p><span className="pill">Coming soon</span></div>)}</div>
      </section>
      <footer>© {new Date().getFullYear()} {CONFIG.brand}. Built for curious minds.</footer>
    </main>);
}

export function Library({ go }) {
  const s = useStore(), [cls, setCls] = useState(s.cls);
  const list = byClass(cls);
  const pick = (c) => { setCls(c); set({ cls: c }); };
  return (
    <main className="lib">
      <div className="lib-h"><span className="eyebrow">Biology · NCERT</span><h1>Choose your class</h1></div>
      <div className="clsbar">{CLASSES.map((c) => <button key={c} className={cls === c ? 'on' : ''} onClick={() => pick(c)}>Class {c}<small>{byClass(c).filter((t) => s.done[t.id]).length}/{byClass(c).length}</small></button>)}</div>
      <div className="grid">
        {list.map((t, i) => { const open = isUnlocked(s, t), done = s.done[t.id]; return (
          <button key={t.id} className={'tcard glass ' + (open ? '' : 'locked')} style={{ '--h': t.hue }} onClick={() => open && go('topic', t.id)}>
            <div className="thumb"><Thumb id={t.id} model={t.model} delay={i * 250} />{!open && <div className="lock">🔒<small>Finish the previous topic</small></div>}{done && <span className="tick">✓ Mastered</span>}</div>
            <div className="tc-b"><span className="eyebrow">{t.ch}</span><h3>{t.icon} {t.title}</h3><p>{t.summary}</p></div>
          </button>); })}
        <button className={'tcard glass boss-card ' + (testUnlocked(s, cls) ? '' : 'locked')} onClick={() => testUnlocked(s, cls) && go('test', cls)}>
          <div className="boss-i">{s.tests[cls] ? '🏆' : '⚔️'}</div>
          <div className="tc-b"><span className="eyebrow">Class {cls} test</span><h3>Boss Battle</h3><p>{testUnlocked(s, cls) ? 'Answer mixed questions with only 3 hearts. Win to earn bonus XP.' : 'Master every topic in this class to unlock.'}</p></div>
        </button>
      </div>
    </main>);
}

export function TestPage({ cls, go }) {
  const [qs] = useState(() => byClass(cls).flatMap((t) => t.quiz).sort(() => Math.random() - 0.5).slice(0, 8));
  return <main className="center"><div className="v-sheet glass static"><Runner boss qs={qs} title={`Class ${cls} Boss Battle`} onFinish={(r) => finishTest(cls, r.score, qs.length, r.won)} onExit={() => go('library')} /></div></main>;
}

const Stars = ({ v, on }) => <span className="stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= v ? 'on' : ''} onClick={() => on && on(n)}>★</button>)}</span>;

export function Feedback() {
  const s = useStore(), [txt, setTxt] = useState(''), [rate, setRate] = useState(5), [sent, setSent] = useState(false);
  const send = () => { if (!txt.trim()) return; set((x) => ({ feedback: [{ role: x.role, name: x.name, rate, txt: txt.trim(), at: Date.now() }, ...x.feedback] })); setTxt(''); setSent(true); setTimeout(() => setSent(false), 2500); };
  return (
    <main className="center"><div className="v-sheet glass static">
      <span className="eyebrow">Feedback</span><h2>Tell us how it's going</h2>
      <div className="seg">{['student', 'teacher', 'parent'].map((r) => <button key={r} className={s.role === r ? 'on' : ''} onClick={() => set({ role: r })}>{r[0].toUpperCase() + r.slice(1)}</button>)}</div>
      <Stars v={rate} on={setRate} />
      <textarea rows="4" placeholder={s.role === 'teacher' ? 'Share observations or a note for students…' : s.role === 'parent' ? 'How is your child finding it?' : 'What did you love? What was confusing?'} value={txt} onChange={(e) => setTxt(e.target.value)} />
      <button className="cta" onClick={send}>Send feedback</button>{sent && <span className="ok-t">Thank you! Saved.</span>}
      <h4>Recent feedback</h4>
      {s.feedback.length === 0 && <p className="muted">Nothing yet.</p>}
      {s.feedback.slice(0, 6).map((f, i) => <div className="fb" key={i}><b>{f.role} · {f.name}</b><Stars v={f.rate} /><p>{f.txt}</p></div>)}
    </div></main>);
}

export function Dash({ go }) {
  const s = useStore(), L = levelOf(s.xp), [note, setNote] = useState('');
  const role = s.role;
  return (
    <main className="dash">
      <div className="lib-h"><span className="eyebrow">Dashboard</span><h1>{role === 'student' ? `Hi, ${s.name}` : role === 'teacher' ? 'Teacher view' : 'Parent view'}</h1></div>
      <div className="seg big">{['student', 'teacher', 'parent'].map((r) => <button key={r} className={role === r ? 'on' : ''} onClick={() => set({ role: r })}>{r[0].toUpperCase() + r.slice(1)}</button>)}</div>
      <div className="kpis">
        <div className="card glass"><span>Level</span><b>{L.level}</b><div className="bar"><i style={{ width: L.pct * 100 + '%' }} /></div><small>{s.xp} XP</small></div>
        <div className="card glass"><span>Topics mastered</span><b>{Object.keys(s.done).length}/{TOPICS.length}</b><div className="bar"><i style={{ width: progressPct(s) + '%' }} /></div></div>
        <div className="card glass"><span>Streak</span><b>🔥 {s.streak}</b><small>days</small></div>
        <div className="card glass"><span>Boss wins</span><b>{Object.keys(s.tests).filter((k) => s.tests[k]).length}</b><small>of 7 classes</small></div>
      </div>
      <h3>Progress by class</h3>
      <div className="cls-rows">{CLASSES.map((c) => { const l = byClass(c), d = l.filter((t) => s.done[t.id]).length; return <div className="crow glass" key={c}><b>Class {c}</b><div className="bar"><i style={{ width: (d / l.length) * 100 + '%' }} /></div><span>{d}/{l.length}</span></div>; })}</div>
      <h3>Topic scores</h3>
      <div className="scores">{TOPICS.map((t) => <div key={t.id} className="sc glass"><span>{t.icon} {t.title}</span><b>{s.scores[t.id] != null ? s.scores[t.id] + '/4' : '—'}</b></div>)}</div>
      {role === 'teacher' && <div className="card glass pad"><h3>Teacher tools</h3>
        <button className={'switch ' + (s.teacherUnlock ? 'on' : '')} onClick={() => set({ teacherUnlock: !s.teacherUnlock })}><i /><span>Unlock all topics &amp; tests (demo / classroom mode)</span></button>
        <textarea rows="2" placeholder="Write a note to the student…" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="cta sm" onClick={() => { if (note.trim()) { set((x) => ({ notes: [{ txt: note.trim(), at: Date.now() }, ...x.notes] })); setNote(''); } }}>Send note</button></div>}
      {(role === 'student' || role === 'parent') && s.notes.length > 0 && <div className="card glass pad"><h3>Notes from teacher</h3>{s.notes.slice(0, 4).map((n, i) => <p className="fb" key={i}>{n.txt}</p>)}</div>}
      {role === 'parent' && <div className="card glass pad"><h3>Summary for parents</h3><p>{s.name} has mastered {Object.keys(s.done).length} of {TOPICS.length} topics, reached level {L.level} and keeps a {s.streak}-day streak. {progressPct(s) < 30 ? 'Encourage 15 minutes a day to build momentum.' : 'Great consistency — keep it up!'}</p><button className="ghost" onClick={() => go('feedback')}>Leave feedback</button></div>}
      <button className="ghost danger" onClick={() => { if (confirm('Reset all progress on this device?')) reset(); }}>Reset progress</button>
    </main>);
}
