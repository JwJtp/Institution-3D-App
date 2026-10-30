import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import * as THREE from 'three';
// The 3D labs add-on (public/labs3d.js) builds its scenes with the app's own three.js.
window.__THREE = THREE;
createRoot(document.getElementById('root')).render(<App />);
