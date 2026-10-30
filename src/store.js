import { useSyncExternalStore } from 'react';
import { CONFIG } from './config.js';
import { TOPICS, CLASSES } from './data/topics.js';

const LEVELS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
const blank = () => ({ role: 'student', name: 'Student', cls: 10, xp: 0, done: {}, scores: {}, tests: {}, streak: 0, lastDay: '', feedback: [], notes: [], teacherUnlock: false, seen: {} });
let state; try { state = { ...blank(), ...JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}') }; } catch (e) { state = blank(); }
const subs = new Set();
const save = () => { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(state)); } catch (e) {} };
export const set = (patch) => { state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }; save(); subs.forEach((f) => f()); };
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
export const getState = () => state;
export const reset = () => { state = blank(); save(); subs.forEach((f) => f()); };

export const levelOf = (xp) => { let l = 0; while (l + 1 < LEVELS.length && xp >= LEVELS[l + 1]) l++; const a = LEVELS[l], b = LEVELS[l + 1] ?? a + 1000; return { level: l + 1, into: xp - a, need: b - a, pct: Math.min(1, (xp - a) / (b - a)) }; };
export const byClass = (c) => TOPICS.filter((t) => t.cls === c);
export function isUnlocked(s, t) {
  if (s.teacherUnlock) return true;
  const list = byClass(t.cls), i = list.findIndex((x) => x.id === t.id);
  return i <= 0 || !!s.done[list[i - 1].id];
}
export const classDone = (s, c) => byClass(c).every((t) => s.done[t.id]);
export const testUnlocked = (s, c) => s.teacherUnlock || classDone(s, c);
export function completeTopic(id, score, total) {
  set((s) => {
    const first = !s.done[id], pass = score >= Math.ceil(total * 0.75);
    const today = new Date().toDateString(), y = new Date(Date.now() - 864e5).toDateString();
    const streak = s.lastDay === today ? s.streak : s.lastDay === y ? s.streak + 1 : 1;
    const gain = score * 20 + (pass && first ? 50 : 0);
    return { xp: s.xp + gain, done: pass ? { ...s.done, [id]: true } : s.done, scores: { ...s.scores, [id]: Math.max(s.scores[id] || 0, score) }, streak, lastDay: today };
  });
  return score >= Math.ceil(total * 0.75);
}
export function finishTest(cls, correct, total, won) {
  set((s) => ({ xp: s.xp + (won ? 150 + correct * 25 : correct * 10), tests: { ...s.tests, [cls]: Math.max(s.tests[cls] || 0, won ? correct : 0), ...(won ? {} : {}) } }));
}
export const progressPct = (s) => Math.round((Object.keys(s.done).length / TOPICS.length) * 100);
export { CLASSES };
