import React, { useState } from 'react';
import { completeTopic, finishTest } from '../store.js';

export function Confetti() {
  const c = ['#5ee6c8', '#7c8cff', '#ffd54a', '#ff6f91', '#fff'];
  return <div className="confetti" aria-hidden>{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: Math.random() * 100 + '%', background: c[i % 5], animationDelay: Math.random() * 0.6 + 's', animationDuration: 1.6 + Math.random() * 1.4 + 's' }} />)}</div>;
}

/* Generic runner: topic quiz (no lives) or class test "boss battle" (3 hearts). */
export function Runner({ qs, boss, title, onFinish, onExit }) {
  const [i, setI] = useState(0), [pick, setPick] = useState(null), [score, setScore] = useState(0), [hearts, setHearts] = useState(3), [fin, setFin] = useState(null);
  const q = qs[i];
  const choose = (k) => { if (pick !== null) return; setPick(k); const ok = k === q.a; if (ok) setScore((x) => x + 1); else if (boss) setHearts((h) => h - 1); };
  const advance = () => {
    const ok = pick === q.a, h = hearts - (!ok && boss ? 0 : 0);
    if (boss && hearts <= 0) { const r = { score, won: false }; setFin(r); onFinish(r); return; }
    if (i + 1 >= qs.length) { const r = { score, won: !boss || hearts > 0 }; setFin(r); onFinish(r); return; }
    setI(i + 1); setPick(null);
  };
  if (fin) {
    const pass = boss ? fin.won : fin.score >= Math.ceil(qs.length * 0.75);
    return (
      <div className="result">
        {pass && <Confetti />}
        <div className={'badge ' + (pass ? 'win' : 'lose')}>{pass ? (boss ? '🏆' : '⭐') : '💪'}</div>
        <h3>{pass ? (boss ? 'Boss defeated!' : 'Topic mastered!') : 'Almost there'}</h3>
        <p>You scored <b>{fin.score}/{qs.length}</b>. {pass ? 'XP awarded and the next topic is unlocked.' : boss ? 'You ran out of hearts. Review the topics and try again.' : 'You need 75% to unlock the next topic. Review and retry.'}</p>
        <div className="row">
          <button className="ghost" onClick={() => { setI(0); setPick(null); setScore(0); setHearts(3); setFin(null); }}>Retry</button>
          <button className="cta" onClick={onExit}>{pass ? 'Continue' : 'Back'}</button>
        </div>
      </div>);
  }
  return (
    <div className={'quiz ' + (boss ? 'boss' : '')}>
      <div className="q-top">
        <span className="eyebrow">{title}</span>
        {boss && <span className="hearts">{[0, 1, 2].map((k) => <i key={k} className={k < hearts ? 'on' : ''}>♥</i>)}</span>}
        <span className="q-n">{i + 1}/{qs.length}</span>
      </div>
      <div className="q-bar"><i style={{ width: ((i + (pick !== null ? 1 : 0)) / qs.length) * 100 + '%' }} /></div>
      <h3 className="q-text">{q.q}</h3>
      <div className="opts">
        {q.o.map((o, k) => <button key={k} onClick={() => choose(k)} className={pick === null ? '' : k === q.a ? 'ok' : k === pick ? 'bad' : 'dim'}><b>{'ABCD'[k]}</b>{o}</button>)}
      </div>
      {pick !== null && <div className={'why ' + (pick === q.a ? 'ok' : 'bad')}><b>{pick === q.a ? 'Correct! ' : 'Not quite. '}</b>{q.why}</div>}
      {pick !== null && <button className="cta" onClick={advance}>{boss && hearts <= 0 ? 'See result' : i + 1 >= qs.length ? 'Finish' : 'Next question'}</button>}
    </div>);
}

export default function Quiz({ topic, done, next, go }) {
  const q = topic.quiz.map((x) => ({ ...x }));
  return <Runner qs={q} title={'Quiz · ' + topic.title} onFinish={(r) => completeTopic(topic.id, r.score, q.length)} onExit={() => (next && done !== undefined ? go('topic', next.id) : go('library'))} />;
}
export { finishTest };
