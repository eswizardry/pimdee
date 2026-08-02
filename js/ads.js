// Ad slots (Google AdSense).
//
// Nothing loads today: `enabled` is false and no publisher id is set, so
// `adSlot()` returns null and the screens render exactly as before. The point of
// this module is that the *placements* are decided and reserved, so switching
// ads on later is a config change rather than a layout rewrite.
//
// ── Where ads may appear ────────────────────────────────────────────────────
// Home, Results, Journey and Stats. These are reading screens: the user is
// deciding what to do next, not typing.
//
// ── Where they must NOT appear, and why ─────────────────────────────────────
// Practice, Arcade and Lyrics are excluded deliberately, for two reasons:
//
//   1. Those screens hold keyboard focus on a stage element and swallow every
//      keystroke. An ad iframe that takes focus breaks typing outright.
//   2. A user hammering keys next to an ad unit generates accidental clicks.
//      That is invalid traffic, and it is the publisher's account at risk —
//      not the advertiser's.
//
// Onboarding is excluded too: showing ads before a user has seen the product is
// a poor first run, and AdSense frowns on ads on screens with little content.

export const ADS = {
  /** Flip to true only after the site is approved and the ids below are real. */
  enabled: false,

  /** Publisher id, e.g. 'ca-pub-0000000000000000'. */
  client: '',

  /** Ad unit ids created in the AdSense dashboard, per placement. */
  units: {
    homeFooter: '',
    resultsFooter: '',
    journeyFooter: '',
    statsFooter: '',
  },

  /**
   * Draw the reserved space without loading anything, so the layout can be
   * checked before ads go live. Toggle with `?ads=preview` on the URL.
   */
  preview: new URLSearchParams(location.search).get('ads') === 'preview',
};

const LABEL = { th: 'โฆษณา', en: 'Advertisement' };

/**
 * A reserved ad placement. Returns null when ads are off and preview is off, so
 * callers can drop it straight into a child list without leaving a gap.
 *
 * @param {keyof typeof ADS.units} name
 * @param {{minHeight?: number, format?: string}} [opts]
 */
export function adSlot(name, opts = {}) {
  const { minHeight = 100, format = 'horizontal' } = opts;
  const live = ADS.enabled && ADS.client && ADS.units[name];
  if (!live && !ADS.preview) return null;

  const box = document.createElement('div');
  box.className = 'ad-slot';
  box.dataset.slot = name;
  // Reserve the height up front: an ad that arrives and pushes the page down is
  // the single most annoying thing a layout can do.
  box.style.minHeight = `${minHeight}px`;

  const label = document.createElement('div');
  label.className = 'ad-label';
  label.textContent = `${LABEL.th} · ${LABEL.en}`;
  box.appendChild(label);

  if (!live) {
    const ghost = document.createElement('div');
    ghost.className = 'ad-ghost';
    ghost.style.minHeight = `${minHeight - 22}px`;
    ghost.textContent = `${name} · ${format} · reserved`;
    box.appendChild(ghost);
    return box;
  }

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', ADS.client);
  ins.setAttribute('data-ad-slot', ADS.units[name]);
  ins.setAttribute('data-ad-format', format);
  ins.setAttribute('data-full-width-responsive', 'true');
  box.appendChild(ins);

  // AdSense must be told to fill the unit *after* it is in the document. Screens
  // here are built detached and appended by the router, so wait for connection
  // rather than pushing immediately.
  whenConnected(ins, () => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // Blocked, offline, or the script never loaded — leave the space empty
      // rather than breaking the screen.
    }
  });

  return box;
}

function whenConnected(node, fn, tries = 60) {
  if (node.isConnected) { fn(); return; }
  if (tries <= 0) return;
  requestAnimationFrame(() => whenConnected(node, fn, tries - 1));
}
