import React, { useEffect, useRef, useState } from 'react';
import { Stage, renderThumb } from '../three/Stage.js';
import { BUILDERS } from '../three/models/index.js';

export function useStage(modelKey, opts, deps = []) {
  const host = useRef(null), stage = useRef(null);
  useEffect(() => {
    const st = new Stage(host.current, opts);
    stage.current = st;
    st.setModel(BUILDERS[modelKey]());
    return () => { st.dispose(); stage.current = null; };
  }, [modelKey, ...deps]);
  return [host, stage];
}

export function Hero3D({ modelKey = 'heart' }) {
  const [host] = useStage(modelKey, { mini: true, bloom: true, interactive: true });
  return <div className="hero3d" ref={host} aria-label="Interactive 3D model" />;
}

export function Thumb({ id, model, delay = 0 }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSrc(renderThumb(id, BUILDERS[model])), delay);
    return () => clearTimeout(t);
  }, [id]);
  return src ? <img className="thumb-img" src={src} alt="" /> : <div className="thumb-ph" />;
}
