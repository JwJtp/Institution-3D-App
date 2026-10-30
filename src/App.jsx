import React, { useEffect, useState } from 'react';
import { Nav, Home, Library, TestPage, Feedback, Dash } from './components/Pages.jsx';
import Viewer from './components/Viewer.jsx';
import { TOPICS } from './data/topics.js';
import { useStore, isUnlocked } from './store.js';

const parse = () => { const h = location.hash.replace(/^#\/?/, '').split('/'); return { view: h[0] || 'home', arg: h[1] }; };
export default function App() {
  const [r, setR] = useState(parse()); const s = useStore();
  useEffect(() => { const f = () => { setR(parse()); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const go = (v, a) => { location.hash = '#/' + v + (a ? '/' + a : ''); };
  let topic = r.view === 'topic' ? TOPICS.find((t) => t.id === r.arg) : null;
  if (topic && !isUnlocked(s, topic)) topic = null;
  const viewer = !!topic;
  return (
    <>
      <div className="bg" />
      {!viewer && <Nav view={r.view} go={go} />}
      {viewer ? <Viewer key={topic.id} topic={topic} go={go} />
        : r.view === 'library' || (r.view === 'topic') ? <Library go={go} />
        : r.view === 'test' ? <TestPage cls={+r.arg} go={go} />
        : r.view === 'feedback' ? <Feedback />
        : r.view === 'dash' ? <Dash go={go} />
        : <Home go={go} />}
    </>);
}
