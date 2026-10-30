import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStage } from './StageView.jsx';
import { cycleCurves } from '../three/models/reproduction.js';
import { TOPICS } from '../data/topics.js';
import { useStore, completeTopic, byClass, levelOf } from '../store.js';
import Quiz from './Quiz.jsx';

const Icon = ({ n }) => ({
  explode: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" />,
  xray: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  tag: <path d="M3 12l9-9h8v8l-9 9z M16 8h.01" />,
  slice: <path d="M4 20L20 4M4 8h6M14 16h6" />,
  spin: <><path d="M20 12a8 8 0 1 1-3-6.2" /><path d="M20 4v5h-5" /></>,
  home: <path d="M4 12l8-8 8 8M6 10v10h12V10" />,
  cam: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M8 7l1.5-3h5L16 7" /></>,
  tour: <path d="M5 4v17M5 5h12l-2 4 2 4H5" />,
  back: <path d="M15 5l-7 7 7 7" />,
  play: <path d="M8 5v14l11-7z" />,
}[n]);
export const Ico = ({ n, s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><Icon n={n} /></svg>;

function HormoneChart({ day }) {
  const W = 300, H = 110, cols = { FSH: '#7c8cff', LH: '#ffd54a', Estrogen: '#ff6f91', Progesterone: '#5ee6c8' };
  const path = (f) => Array.from({ length: 57 }, (_, i) => { const d = 1 + i * 0.5; return `${i ? 'L' : 'M'}${((d - 1) / 27) * W},${H - 6 - f(d) * (H - 14)}`; }).join('');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 16}`}>
      {Object.entries(cycleCurves).map(([k, f]) => <path key={k} d={path(f)} fill="none" stroke={cols[k]} strokeWidth="2" />)}
      <line x1={((day - 1) / 27) * W} x2={((day - 1) / 27) * W} y1="0" y2={H} stroke="#fff" strokeOpacity=".8" strokeDasharray="3 3" />
      <text x="0" y={H + 12} className="ct">Day 1</text><text x={W - 34} y={H + 12} className="ct">Day 28</text>
      {Object.entries(cols).map(([k, c], i) => <text key={k} x={i * 74} y={H + 12} dx="46" fill={c} className="ct" style={{ display: 'none' }}>{k}</text>)}
    </svg>
  );
}

export default function Viewer({ topic, go }) {
  const s = useStore();
  const [parts, setParts] = useState([]);
  const [sel, setSel] = useState(null), [hov, setHov] = useState(null);
  const [vals, setVals] = useState({}), [hud, setHud] = useState(null), [auto, setAuto] = useState([]);
  const [fx, setFx] = useState({ explode: 0, xray: false, labels: false, slice: false, sliceV: 0.5, rotate: false });
  const [tab, setTab] = useState('explore'), [tour, setTour] = useState(-1), [panel, setPanel] = useState(true);
  const labels = useRef(null);
  const [host, st] = useStage(topic.model, {
    bloom: true, labelsHost: null,
    onModel: (p) => { setParts(p); setSel(null); },
    onSelect: setSel, onHover: setHov,
    onTick: (P, h, a) => { setVals({ ...P }); setHud(h); setAuto(a); },
  }, [topic.id]);
  useEffect(() => { const t = setInterval(() => { if (st.current && labels.current && !st.current.opts.labelsHost) { st.current.opts.labelsHost = labels.current; clearInterval(t); } }, 50); return () => clearInterval(t); }, [topic.id]);
  useEffect(() => { setFx({ explode: 0, xray: false, labels: false, slice: false, sliceV: 0.5, rotate: false }); setTab('explore'); setTour(-1); }, [topic.id]);
  const S = () => st.current, model = S()?.model;
  const apply = (patch) => {
    const n = { ...fx, ...patch }; setFx(n); const g = S(); if (!g) return;
    if ('explode' in patch) g.setExplode(n.explode);
    if ('xray' in patch) g.setXray(n.xray);
    if ('labels' in patch) g.setLabels(n.labels);
    if ('slice' in patch || 'sliceV' in patch) g.setSlice(n.slice, n.sliceV);
    if ('rotate' in patch) g.setAuto(n.rotate);
  };
  const setParam = (id, v) => { S().setParam(id, v); setVals((o) => ({ ...o, [id]: v })); };
  const part = parts.find((p) => p.id === sel);
  const hovp = parts.find((p) => p.id === hov);
  const startTour = () => { setTour(0); S().select(parts[0]?.id); apply({ labels: true }); };
  const stepTour = (d) => { const n = tour + d; if (n < 0 || n >= parts.length) { setTour(-1); S().resetView(); return; } setTour(n); S().select(parts[n].id); };
  const doneAlready = !!s.done[topic.id];
  const next = byClass(topic.cls)[byClass(topic.cls).findIndex((t) => t.id === topic.id) + 1];

  return (
    <div className="viewer">
      <div className="v-stage" ref={host}>
        <div className="lbl-host" ref={labels} />
      </div>
      <div className="v-top glass">
        <button className="ibtn" onClick={() => go('library')} title="Back"><Ico n="back" /></button>
        <div className="v-title"><span className="eyebrow">Class {topic.cls} · {topic.ch}</span><h2>{topic.title}</h2></div>
        <div className="tabs">
          {['explore', 'learn', 'quiz'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t === 'explore' ? 'Explore' : t === 'learn' ? 'Learn' : 'Quiz'}</button>)}
        </div>
        <button className="ibtn only-m" onClick={() => setPanel(!panel)}>☰</button>
      </div>

      {tab === 'explore' && <>
        <aside className={'v-left glass ' + (panel ? '' : 'hide-m')}>
          <div className="panel-h">Parts <span>{parts.length}</span></div>
          <div className="parts">
            {parts.map((p) => <button key={p.id} className={(sel === p.id ? 'on ' : '') + (hov === p.id ? 'hv' : '')} onClick={() => S().select(sel === p.id ? null : p.id)} onMouseEnter={() => S().setHover(p.id)} onMouseLeave={() => S().setHover(null)}>{p.name}</button>)}
          </div>
        </aside>
        <aside className={'v-right glass ' + (panel ? '' : 'hide-m')}>
          {model && model.params.length > 0 && <div className="panel-h">Simulation</div>}
          {model && model.params.map((p) => {
            const v = vals[p.id] ?? p.value;
            if (p.type === 'range') return <label className="ctl" key={p.id}><span>{p.label}<b>{(+v).toFixed(p.step < 1 ? (p.step < 0.1 ? 2 : 1) : 0)}{p.unit || ''}</b></span><input type="range" min={p.min} max={p.max} step={p.step} value={v} onChange={(e) => setParam(p.id, +e.target.value)} /></label>;
            if (p.type === 'toggle') return <button key={p.id} className={'switch ' + (v ? 'on' : '')} onClick={() => setParam(p.id, !v)}><i /><span>{p.label}</span></button>;
            if (p.type === 'buttons') return <div className="ctl" key={p.id}><span>{p.label}</span><div className="seg">{p.options.map(([k, l]) => <button key={k} className={v === k ? 'on' : ''} onClick={() => setParam(p.id, k)}>{l}</button>)}</div></div>;
            if (p.type === 'action') return <button key={p.id} className="cta" onClick={() => setParam(p.id, Date.now())}><Ico n="play" s={14} /> {p.label}</button>;
            return null;
          })}
        </aside>
        <div className="v-dock glass">
          <label className="dock-slider"><Ico n="explode" /><span>Explode</span><input type="range" min="0" max="1" step="0.01" value={fx.explode} onChange={(e) => apply({ explode: +e.target.value })} /></label>
          <button className={fx.xray ? 'on' : ''} onClick={() => apply({ xray: !fx.xray })}><Ico n="xray" /><span>X-ray</span></button>
          <button className={fx.labels ? 'on' : ''} onClick={() => apply({ labels: !fx.labels })}><Ico n="tag" /><span>Labels</span></button>
          {model?.sliceable && <button className={fx.slice ? 'on' : ''} onClick={() => apply({ slice: !fx.slice })}><Ico n="slice" /><span>Slice</span></button>}
          {fx.slice && <input className="slice-r" type="range" min="0" max="1" step="0.01" value={fx.sliceV} onChange={(e) => apply({ sliceV: +e.target.value })} />}
          <button className={fx.rotate ? 'on' : ''} onClick={() => apply({ rotate: !fx.rotate })}><Ico n="spin" /><span>Rotate</span></button>
          <button onClick={startTour} disabled={!parts.length}><Ico n="tour" /><span>Tour</span></button>
          <button onClick={() => S().resetView()}><Ico n="home" /><span>Reset</span></button>
          <button onClick={() => { const a = document.createElement('a'); a.href = S().screenshot(); a.download = topic.id + '.png'; a.click(); }}><Ico n="cam" /><span>Snap</span></button>
        </div>
        {(part || hovp || hud) && (
          <div className="v-info glass">
            {part ? <><span className="eyebrow">{tour >= 0 ? `Tour ${tour + 1}/${parts.length}` : 'Selected'}</span><h3>{part.name}</h3><p>{part.info}</p>
              {tour >= 0 && <div className="row"><button className="ghost" onClick={() => stepTour(-1)}>Back</button><button className="cta sm" onClick={() => stepTour(1)}>{tour === parts.length - 1 ? 'Finish' : 'Next part'}</button></div>}</>
              : hud ? <><span className="eyebrow">Now showing</span><h3>{hud.title}</h3>{hud.lines?.map((l, i) => <p key={i}>{l}</p>)}{hud.chart && <HormoneChart day={hud.day} />}
                {hud.chart && <div className="legend"><i style={{ background: '#7c8cff' }} />FSH<i style={{ background: '#ffd54a' }} />LH<i style={{ background: '#ff6f91' }} />Oestrogen<i style={{ background: '#5ee6c8' }} />Progesterone</div>}</>
              : <><h3>{hovp.name}</h3></>}
          </div>)}
        {!part && !hud && <div className="v-hint">Drag to rotate · scroll to zoom · click any part</div>}
      </>}

      {tab === 'learn' && (
        <div className="v-sheet glass">
          <span className="eyebrow">NCERT · Class {topic.cls}</span>
          <h2>{topic.title}</h2>
          <p className="lead">{topic.summary}</p>
          <h4>Key points</h4>
          <ul>{topic.learn.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <h4>Parts in this model</h4>
          <div className="chips">{parts.map((p) => <button key={p.id} onClick={() => { setTab('explore'); setTimeout(() => S().select(p.id), 50); }}>{p.name}</button>)}</div>
          <button className="cta" onClick={() => setTab('quiz')}>Take the quiz →</button>
        </div>)}

      {tab === 'quiz' && <div className="v-sheet glass"><Quiz key={topic.id} topic={topic} done={doneAlready} next={next} go={go} /></div>}
    </div>
  );
}
