// Shell + hash router.

import { el, clear } from './ui.js';
import { setThaiLayout } from './layouts.js';
import * as store from './store.js';
import { homeScreen } from './screens/home.js';
import { journeyScreen } from './screens/journey.js';
import { practiceScreen } from './screens/practice.js';
import { resultsScreen } from './screens/results.js';
import { arcadeScreen } from './screens/arcade.js';
import { lyricsScreen } from './screens/lyrics.js';
import { onboardingScreen } from './screens/onboarding.js';
import { statsScreen } from './screens/stats.js';

const NAV = [
  ['#/home', 'หน้าแรก', 'Home'],
  ['#/lessons', 'บทเรียน', 'Lessons'],
  ['#/arcade', 'อาร์เคด', 'Arcade'],
  ['#/lyrics', 'บทกลอน', 'Verse'],
  ['#/stats', 'สถิติ', 'Stats'],
];

const app = document.getElementById('app');
let current = null;

function parse() {
  const raw = (location.hash || '#/home').slice(2);
  const [name, ...rest] = raw.split('/').filter(Boolean);
  return { name: name || 'home', rest };
}

function screenFor({ name, rest }) {
  switch (name) {
    case 'onboarding': return [onboardingScreen, {}];
    case 'lessons': return [journeyScreen, { lang: rest[0] }];
    case 'practice': return [practiceScreen, {
      lang: rest[0] === 'en' ? 'en' : 'th',
      // #/practice/th/dynamic — a drill generated from your weak keys
      dynamic: rest[1] === 'dynamic',
      ch: rest[1] && rest[1] !== 'dynamic' ? Number(rest[1]) : null,
      drill: rest[2] !== undefined ? Number(rest[2]) : null,
    }];
    case 'results': return [resultsScreen, {}];
    case 'arcade': return [arcadeScreen, {}];
    case 'lyrics': return [lyricsScreen, { id: rest[0] }];
    case 'stats': return [statsScreen, {}];
    default: return [homeScreen, {}];
  }
}

function nav(hash, replace = false) {
  if (replace && location.hash === hash) { render(); return; }
  if (location.hash === hash) { render(); return; }
  location.hash = hash;
}

function shell(view, route) {
  const s = store.get();
  const active = route.name === 'lessons' ? '#/lessons'
    : route.name === 'practice' ? '#/lessons'
      : route.name === 'results' ? '#/home'
        : `#/${route.name}`;

  const bar = el('nav.topbar', { 'aria-label': 'เมนูหลัก · Main navigation' },
    el('a.brand', { href: '#/home' },
      el('div.brand-mark', {}, 'ตุ'),
      el('div', {},
        el('div.brand-name', {}, 'ตุ๊กไทป์'),
        el('div.brand-sub', {}, 'TUKTYPE'))),
    el('div.nav', {}, NAV.map(([href, th, en]) =>
      el('a', { href, class: href === active ? 'on' : '' }, th, ' ', el('span.en', {}, en)))),
    el('div.topbar-right', {},
      el('div.streak-pill', { 'aria-label': `สตรีค ${s.streak.count} วัน · ${s.streak.count}-day streak` },
        el('span.blip', { 'aria-hidden': 'true' }),
        el('span', { style: 'font:500 12px/1 var(--mono)' }, s.streak.count),
        el('span', { style: 'font:400 11.5px/1 var(--th);color:var(--sub)' }, 'วันติด')),
      el('a.avatar', { href: '#/stats', title: 'สถิติ', 'aria-label': 'สถิติ · Stats' }, s.name)));

  // tabindex -1 so navigation can move focus here without adding a tab stop
  return el('div.shell', {},
    el('a.skip-link', { href: '#tt-main' }, 'ข้ามไปเนื้อหา · Skip to content'),
    bar,
    el('main.view', { id: 'tt-main', tabindex: '-1', style: 'flex:1' }, view));
}

function render() {
  const route = parse();
  if (!store.get().onboarded && route.name !== 'onboarding') {
    location.hash = '#/onboarding';
    return;
  }
  current?.unmount?.();
  const [factory, params] = screenFor(route);
  const view = factory(params, nav);
  clear(app);
  app.appendChild(route.name === 'onboarding' ? view : shell(view, route));
  current = view;
  // Move focus into the new screen so keyboard and screen-reader users land in
  // the content rather than back at the top of the document. A screen whose
  // mount() claims focus (the typing stage) runs after and wins.
  app.querySelector('#tt-main')?.focus({ preventScroll: true });
  view.mount?.();
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);

// Number-key shortcuts from the quick-start panel, ENTER to continue.
window.addEventListener('keydown', (e) => {
  const typing = document.activeElement && document.activeElement.matches('.stage,.field,.lyr-wrap,.card-hero[tabindex]');
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  const r = parse();
  if (r.name !== 'home') return;
  if (e.key === '1' || e.key === 'Enter') nav('#/practice/th');
  if (e.key === '2') nav('#/arcade');
  if (e.key === '3') nav('#/lyrics');
});

// Apply the saved Thai layout. setThaiLayout falls back to Kedmanee for any id
// that isn't actually shipped, so a stale preference can never leave the app
// showing a keyboard it has no table for.
const applied = setThaiLayout(store.get().layout);
if (applied !== store.get().layout) store.update((st) => { st.layout = applied; });

store.rollDay();
render();
