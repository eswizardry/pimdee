// Animated hands under the keyboard: highlights the finger that should press
// the next key, and plays a press on each keystroke.
//
// The hands are built from the same rounded-rectangle vocabulary as the น้องดี
// mascot rather than anatomical outlines — at this size a stylised hand reads
// faster, and it stays legible against the dark canvas.

import { el } from './ui.js';
import {
  FINGER_COLORS, FINGER_NAMES, isLeftHand, shiftFingerFor,
  L_PINKY, L_RING, L_MIDDLE, L_INDEX, R_INDEX, R_MIDDLE, R_RING, R_PINKY, THUMB,
} from './layouts.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// x, y, width, height, corner — left hand, pinky first. The right hand is this
// mirrored, so only one set of numbers has to stay consistent.
const FINGERS = [
  { x: 8, y: 40, w: 17, h: 48, r: 8 },   // pinky
  { x: 30, y: 24, w: 18, h: 64, r: 9 },  // ring
  { x: 53, y: 16, w: 18, h: 72, r: 9 },  // middle
  { x: 76, y: 26, w: 18, h: 62, r: 9 },  // index
];
const THUMB_SHAPE = { x: 96, y: 92, w: 16, h: 40, r: 8, rotate: -38, ox: 104, oy: 112 };
const PALM = { x: 8, y: 84, w: 92, h: 46, r: 16 };

/** One hand. `side` is 'l' or 'r'; ids are the global finger ids. */
function hand(side, ids) {
  // The caption below states the finger in words; the drawing is decoration.
  const root = svg('svg', { viewBox: '0 0 132 150', class: `hand hand-${side}`, 'aria-hidden': 'true', focusable: 'false' });
  const g = svg('g', side === 'r' ? { transform: 'translate(132,0) scale(-1,1)' } : {});

  g.appendChild(svg('rect', {
    x: PALM.x, y: PALM.y, width: PALM.w, height: PALM.h, rx: PALM.r, class: 'palm',
  }));

  const parts = new Map();
  FINGERS.forEach((f, i) => {
    const id = ids[i];
    const node = svg('rect', { x: f.x, y: f.y, width: f.w, height: f.h, rx: f.r, class: 'finger' });
    node.dataset.finger = id;
    g.appendChild(node);
    parts.set(id, node);
  });

  // The thumb's rotation lives on a wrapper group: .finger carries a CSS
  // transform for the tap animation, and the two would otherwise fight over the
  // element's transform (and its origin).
  const t = THUMB_SHAPE;
  const thumbGroup = svg('g', { transform: `rotate(${t.rotate} ${t.ox} ${t.oy})` });
  const thumb = svg('rect', {
    x: t.x, y: t.y, width: t.w, height: t.h, rx: t.r, class: 'finger thumb',
  });
  thumb.dataset.finger = THUMB;
  thumbGroup.appendChild(thumb);
  g.appendChild(thumbGroup);

  root.appendChild(g);
  root.parts = parts;
  root.thumb = thumb;
  return root;
}

/**
 * Returns the two hands and their caption as separate nodes rather than one
 * block, so the caller can seat the keyboard between them.
 */
export function handsPanel() {
  const left = hand('l', [L_PINKY, L_RING, L_MIDDLE, L_INDEX]);
  const right = hand('r', [R_PINKY, R_RING, R_MIDDLE, R_INDEX]);

  // Thumbs are shared: whichever hand is idle can hit the space bar, so both
  // light up together.
  const all = new Map([...left.parts, ...right.parts]);
  const thumbs = [left.thumb, right.thumb];

  const label = el('div', { style: 'font:500 12.5px/1 var(--th);color:var(--sub);min-height:16px' });
  const sublabel = el('div', { style: 'font:400 10.5px/1 var(--mono);color:var(--dim);margin-top:6px;min-height:13px' });
  // Deliberately NOT a live region: this updates on every keystroke, and a
  // screen reader announcing "left index" per key would be unusable.
  const caption = el('div.hands-caption', {}, label, sublabel);

  const panel = { left, right, caption };

  let current = null;

  const clearAll = () => {
    all.forEach((n) => { n.classList.remove('next', 'shift'); n.style.fill = ''; });
    thumbs.forEach((n) => { n.classList.remove('next', 'shift'); n.style.fill = ''; });
  };

  const nodesFor = (finger) =>
    (finger === THUMB ? thumbs : all.has(finger) ? [all.get(finger)] : []);

  /**
   * Highlight the finger for the next keystroke.
   * @param {number|null} finger  finger id, or null when the drill is done
   * @param {boolean} shift  whether the opposite pinky must hold shift
   */
  panel.paint = (finger, shift) => {
    if (finger === current?.finger && shift === current?.shift) return;
    current = { finger, shift };
    clearAll();
    if (finger === null || finger === undefined) {
      label.textContent = '';
      sublabel.textContent = '';
      return;
    }

    const colour = finger === THUMB ? 'var(--green)' : FINGER_COLORS[finger];
    nodesFor(finger).forEach((n) => { n.classList.add('next'); n.style.fill = colour; });

    const shiftFinger = shift ? shiftFingerFor(finger) : null;
    if (shiftFinger !== null) {
      nodesFor(shiftFinger).forEach((n) => { n.classList.add('shift'); });
    }

    const name = FINGER_NAMES[finger];
    label.textContent = shiftFinger !== null
      ? `${name.th} + ${FINGER_NAMES[shiftFinger].th} กด SHIFT`
      : name.th;
    sublabel.textContent = shiftFinger !== null
      ? `${name.en} + ${FINGER_NAMES[shiftFinger].en} holds shift`
      : name.en;

    left.classList.toggle('active', finger === THUMB || isLeftHand(finger) || shiftFinger === L_PINKY);
    right.classList.toggle('active', finger === THUMB || !isLeftHand(finger) || shiftFinger === R_PINKY);
  };

  /** Play the press animation on a finger. `ok` false tints it red briefly. */
  const timers = new WeakMap();
  panel.press = (finger, ok = true) => {
    if (finger === null || finger === undefined) return;
    nodesFor(finger).forEach((n) => {
      clearTimeout(timers.get(n));
      n.classList.remove('press', 'miss');
      // reflow so the animation restarts on repeated presses of the same finger
      void n.getBoundingClientRect();
      n.classList.add(ok ? 'press' : 'miss');
      // A timer, not animationend: under prefers-reduced-motion the animation is
      // suppressed, so animationend would never fire and the red would stick.
      timers.set(n, setTimeout(() => n.classList.remove('press', 'miss'), 260));
    });
  };

  panel.reset = () => { current = null; clearAll(); };
  return panel;
}
