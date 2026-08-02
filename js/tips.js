// Teaching cards — the habit-and-ergonomics lessons that a typing course needs
// interleaved with its drills (posture, "don't look down", take breaks).
//
// TypingClub uses short videos for these. We animate the hands and the mascot we
// already have instead: it teaches the same thing, stays in the app's own visual
// language, and a Thai learner is not left watching English narration.

import { el, mascot, faceMascot } from './ui.js';
import { handsPanel } from './hands.js';
import { FINGER_NAMES, L_PINKY, L_RING, L_MIDDLE, L_INDEX, R_INDEX, R_MIDDLE, R_RING, R_PINKY, THUMB } from './layouts.js';

const HOME_ORDER = [L_PINKY, L_RING, L_MIDDLE, L_INDEX, R_INDEX, R_MIDDLE, R_RING, R_PINKY];

export const TIPS = {
  home: {
    anim: 'home',
    th: 'วางนิ้วที่แป้นเหย้า',
    en: 'Start from the home row',
    bodyTh: 'นิ้วทั้งแปดวางบน ฟ ห ก ด และ ◌่ า ส ว เสมอ พิมพ์เสร็จแล้วให้นิ้วกลับมาที่เดิมทุกครั้ง หัวแม่มือทั้งสองอยู่บนแป้นเว้นวรรค',
    bodyEn: 'Eight fingers rest on ฟ ห ก ด and ◌่ า ส ว. After every reach, the finger comes back. Both thumbs sit on the space bar.',
  },
  bumps: {
    anim: 'bumps',
    th: 'ปุ่มที่มีขีดนูน',
    en: 'The two bumps',
    bodyTh: 'ปุ่ม ด และ ◌่ (F และ J) มีขีดนูนเล็ก ๆ ให้คลำหาด้วยนิ้วชี้ทั้งสองข้าง เมื่อเจอแล้วนิ้วที่เหลือจะเข้าที่เอง โดยไม่ต้องมอง',
    bodyEn: 'ด and ◌่ — F and J — carry a raised bump. Find them with both index fingers and the other six land themselves, without looking.',
  },
  eyesUp: {
    anim: 'mascot-eyes',
    th: 'อย่ามองแป้นพิมพ์',
    en: 'Don’t look down',
    bodyTh: 'ช่วงแรกจะช้าลงและผิดบ่อยขึ้น เป็นเรื่องปกติ การมองแป้นทำให้คุณจำตำแหน่งไม่ได้สักที ให้มองที่บรรทัดข้อความแทน',
    bodyEn: 'You will be slower and make more mistakes at first. That is normal. Looking down is what stops the positions from ever becoming automatic — keep your eyes on the line.',
  },
  accuracy: {
    anim: 'rhythm',
    th: 'ความแม่นยำมาก่อนความเร็ว',
    en: 'Accuracy before speed',
    bodyTh: 'พิมพ์ช้าแต่ถูกต้อง ดีกว่าพิมพ์เร็วแล้วต้องลบ ความเร็วจะตามมาเองเมื่อนิ้วจำตำแหน่งได้ ดาวในแอปนี้ให้ตามความแม่นยำเป็นหลัก',
    bodyEn: 'Slow and correct beats fast and corrected. Speed arrives on its own once the fingers know where they are going — which is why stars here are gated on accuracy, not speed.',
  },
  posture: {
    anim: 'mascot-bob',
    th: 'นั่งตัวตรง',
    en: 'Sit straight',
    bodyTh: 'เท้าราบกับพื้น หลังตรง ข้อศอกงอราว 90 องศา ข้อมือไม่กดทับขอบโต๊ะ จอควรอยู่ระดับสายตาหรือต่ำกว่าเล็กน้อย',
    bodyEn: 'Feet flat, back straight, elbows at about 90°, wrists floating rather than resting on the desk edge. Screen at eye level or a little below.',
  },
  breaks: {
    anim: 'mascot-rest',
    th: 'พักสายตาทุก 20 นาที',
    en: 'Rest your eyes',
    bodyTh: 'ทุก 20 นาที ให้มองไกลออกไปราว 6 เมตร นาน 20 วินาที และสะบัดนิ้วเบา ๆ การพักสั้น ๆ บ่อย ๆ ทำให้ซ้อมได้นานกว่าการฝืนรวดเดียว',
    bodyEn: 'Every 20 minutes, look about 6 metres away for 20 seconds and shake out your fingers. Frequent short breaks let you practise longer than one long push.',
  },
  shift: {
    anim: 'shift',
    th: 'ชิฟต์ใช้นิ้วก้อยฝั่งตรงข้าม',
    en: 'Shift with the opposite pinky',
    bodyTh: 'ถ้าตัวอักษรอยู่มือซ้าย ให้ก้อยขวากดชิฟต์ ถ้าอยู่มือขวา ให้ก้อยซ้ายกด อย่าใช้มือเดียวเอื้อมทั้งสองปุ่ม เพราะมือจะหลุดจากแป้นเหย้า',
    bodyEn: 'Letter on the left hand? The right pinky holds shift, and the other way round. Never stretch one hand to both — that is what pulls you off the home row.',
  },
  words: {
    anim: 'rhythm',
    th: 'คิดเป็นคำ ไม่ใช่ทีละตัว',
    en: 'Think in words, not letters',
    bodyTh: 'เมื่อชินแล้ว ให้มองคำทั้งคำแล้วปล่อยให้นิ้วทำงาน อย่าสะกดทีละตัวในหัว จังหวะที่สม่ำเสมอสำคัญกว่าการเร่งเป็นช่วง ๆ',
    bodyEn: 'Once the positions are automatic, read whole words and let the hands follow. An even rhythm beats bursts of speed with pauses between them.',
  },
};

export const isTipId = (id) => Object.prototype.hasOwnProperty.call(TIPS, id);

/**
 * A teaching card. Returns an element with `.stop()` to halt its animation.
 * `onDone` fires when the learner acknowledges the card.
 */
export function tipCard(id, { onDone, index, total }) {
  const tip = TIPS[id];
  if (!tip) return null;

  const hands = handsPanel();
  const tuk = mascot(84, 20);
  const usesHands = ['home', 'bumps', 'rhythm', 'shift'].includes(tip.anim);

  const visual = usesHands
    ? el('div', { style: 'display:flex;justify-content:center;gap:18px;align-items:center' },
      hands.left, hands.right)
    : el('div', { style: 'display:grid;place-items:center;min-height:150px' }, tuk);

  const caption = usesHands ? hands.caption : el('div.hands-caption', {});

  const card = el('div.card-hero', { style: 'padding:30px 34px' },
    el('div.spread', {},
      el('div.eyebrow', {}, `เคล็ดลับ · TIP${total ? ` ${index + 1}/${total}` : ''}`),
      el('div.eyebrow', {}, 'กด ENTER เพื่อไปต่อ')),
    el('div', { style: 'margin-top:16px;font:600 26px/1.3 var(--th)' }, tip.th),
    el('div', { style: 'margin-top:6px;font:500 14px/1.3 var(--en);color:var(--sub)' }, tip.en),
    el('div.tip-visual', { style: 'margin-top:22px' }, visual, caption),
    el('div', { style: 'margin-top:22px;max-width:760px;font:400 15px/1.7 var(--th)' }, tip.bodyTh),
    el('div', { style: 'margin-top:10px;max-width:760px;font:400 13px/1.6 var(--en);color:var(--sub)' }, tip.bodyEn),
    el('div.row', { style: 'gap:10px;margin-top:26px' },
      el('button.btn', { onClick: () => onDone?.() }, 'เข้าใจแล้ว · Got it'),
      el('div', { style: 'font:400 11px/1 var(--mono);color:var(--dim);align-self:center' }, '↵ ENTER')));

  // --- animation ----------------------------------------------------------
  let timer = null;
  let step = 0;
  const tick = () => {
    switch (tip.anim) {
      case 'home': {
        // Walk the resting fingers, then both thumbs on the space bar.
        const seq = [...HOME_ORDER, THUMB];
        const f = seq[step % seq.length];
        hands.paint(f, false);
        hands.press(f, true);
        break;
      }
      case 'bumps': {
        const f = step % 2 === 0 ? L_INDEX : R_INDEX;
        hands.paint(f, false);
        hands.press(f, true);
        break;
      }
      case 'rhythm': {
        // A steady left-to-right sweep — the even pace the card is describing.
        const seq = [L_PINKY, L_RING, L_MIDDLE, L_INDEX, R_INDEX, R_MIDDLE, R_RING, R_PINKY];
        const f = seq[step % seq.length];
        hands.paint(f, false);
        hands.press(f, true);
        break;
      }
      case 'shift': {
        // Alternate hands so the shift pinky visibly swaps sides — which is the
        // entire point of the card.
        const seq = [L_RING, R_RING, L_MIDDLE, R_MIDDLE, L_PINKY, R_PINKY];
        const f = seq[step % seq.length];
        hands.paint(f, true);
        hands.press(f, true);
        break;
      }
      case 'mascot-eyes':
        faceMascot(tuk, { bad: step % 2 === 0, combo: 0 });
        break;
      case 'mascot-rest':
        faceMascot(tuk, { bad: false, combo: step % 2 ? 20 : 0 });
        break;
      default:
        faceMascot(tuk, { bad: false, combo: 14 });
    }
    step++;
  };

  const period = tip.anim === 'bumps' ? 900
    : tip.anim === 'shift' ? 1100
      : tip.anim.startsWith('mascot') ? 1400 : 620;
  tick();
  timer = setInterval(tick, period);

  card.stop = () => { clearInterval(timer); timer = null; };
  card.tipId = id;
  return card;
}

export const fingerName = (f) => FINGER_NAMES[f];
