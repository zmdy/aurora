import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Appear Text — ported from the Originkit "Appear Text" source (component
// name `KineticTextGrid` internally), a continuous, never-settling effect
// unlike everything else in this file: a grid of ROWS × REPEATS copies of
// the SAME text tiles the block, drifts sideways, zooms, and wipes itself
// away via clip-path — except the exact center copy (center row, center
// column), which survives every cycle and is what actually reads as "the
// text" once the rest has wiped out. Then it all resets and repeats
// forever. This is the effect the user specifically flagged as one that
// "copies the text several times" by design — that's not a bug, it's the
// whole mechanic.
//
// The reference drives this with Framer Motion's per-property keyframe
// `times` arrays (normalized 0..1 fractions of a shared `total` duration)
// plus React's `repeat: Infinity`. Translated here into a single GSAP
// timeline with `repeat: -1` — GSAP timelines already use real absolute
// seconds for tween positions, so the reference's `n(t) = t / total`
// normalization step isn't needed at all; each phase boundary
// (tIn/tWipe/tWord/tReset/tReveal) is used directly as a `.to(..., pos)`
// position, and a zero-duration `.set()` at `total` pins the timeline's
// own length so the trailing hold isn't cut short by the next repeat.
//
// Phases (seconds), matching the reference's own timeline math exactly:
//   tIn      = motionSec                  — zoom in + rows spread apart
//   tWipe    = tIn + motionSec             — non-center words wipe away;
//                                             zoom eases back to 1
//   tWord    = tWipe + holdSec             — hold on the single surviving
//                                             center word
//   tReset   = tWord + 0.4                 — non-center rows drift back
//                                             toward home (still hidden)
//   tReveal  = tReset + motionSec * 0.7    — words reveal back in
//   total    = tReveal + max(0.2, holdSec*0.4) — brief hold, then loops
//
// Per row: direction alternates (even rows drift one way, odd the other),
// speed varies with distance from the center row (mod 3, so it's not a
// simple linear falloff), and the center row's wipe is replaced by a
// "recenter to x:0" move (it's the row doing the reveal, not being wiped).
// Per word: a "sweep" stagger (sweepT, 0..1 across the row) staggers each
// word's own wipe-out/reveal-in window, alternating direction (wipeLTR)
// per row parity, so the wipe/reveal reads as swiping across the row
// rather than every copy vanishing in unison.
//
// No PHP controls were added for rowCount/repeatCount/gaps/shift/zoom —
// this effect reuses Aurora's existing Duration (→ motionSec) and Initial
// Delay controls and keeps the reference's other defaults as fixed
// constants, consistent with how Stagger Flip 3D and Mesh Text Hover
// avoided one-off new controls too. "easeInOut" is approximated with
// GSAP's 'power1.inOut' (no exact cubic-bezier equivalent bundled).
//
// Self-managed: builds its own repeated-text grid instead of using the
// generic split `units` — this isn't a per-character/word animation of
// ONE copy of the text, it's many whole copies tiled and wiped.
var ROW_COUNT = 5;
var REPEAT_COUNT = 5;
var ROW_GAP = 16;
var WORD_GAP = 24;
var HORIZONTAL_SHIFT = 80;
var ZOOM_SCALE = 1.15;
var HOME_FACTOR = 0.4;
var EASE = 'power1.inOut';
var VISIBLE = 'inset(0% 0% 0% 0%)';

var effect = {
    id: 'gs-35',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText || textEl.textContent || '';

        if (textEl._auroraKineticGrid) {
            textEl._auroraKineticGrid.cleanup();
            textEl._auroraKineticGrid = null;
        }
        if (!original) return;

        var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var color = getComputedStyle(textEl).color || 'inherit';

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        if (reducedMotion) {
            // No grid, no motion — just the plain text, matching the
            // established fallback convention for every other effect here.
            textEl.textContent = original;
            return;
        }

        textEl.style.overflow = 'hidden';
        textEl.style.display = 'flex';
        textEl.style.alignItems = 'center';
        textEl.style.justifyContent = 'center';

        var centerRowIndex = Math.floor(ROW_COUNT / 2);
        var centerWordIndex = Math.floor(REPEAT_COUNT / 2);

        var gridWrap = document.createElement('div');
        gridWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;'
            + 'gap:' + ROW_GAP + 'px;position:relative;will-change:transform;';
        textEl.appendChild(gridWrap);

        var rows = [];
        for (var ri = 0; ri < ROW_COUNT; ri++) {
            var isCenterRow = ri === centerRowIndex;
            var direction = ri % 2 === 0 ? 1 : -1;
            var speedMultiplier = 0.7 + (Math.abs(ri - centerRowIndex) % 3) * 0.45;
            var driftFull = direction * HORIZONTAL_SHIFT * speedMultiplier;
            var driftHome = driftFull * HOME_FACTOR;
            var wipeLTR = ri % 2 === 0;

            var rowEl = document.createElement('div');
            rowEl.style.cssText = 'display:flex;align-items:center;justify-content:center;'
                + 'gap:' + WORD_GAP + 'px;white-space:nowrap;will-change:transform;';
            gridWrap.appendChild(rowEl);

            var wordEls = [];
            for (var wi = 0; wi < REPEAT_COUNT; wi++) {
                var span = document.createElement('span');
                span.textContent = original;
                span.style.cssText = 'display:inline-block;line-height:1;color:' + color + ';clip-path:' + VISIBLE + ';';
                rowEl.appendChild(span);
                wordEls.push(span);
            }

            rows.push({
                el: rowEl, words: wordEls, isCenterRow: isCenterRow,
                driftHome: driftHome, driftFull: driftFull, wipeLTR: wipeLTR,
            });
        }

        var motionSec = Math.max(0.2, opts.duration / 1000);
        var holdSec = 1;
        var tIn = motionSec;
        var tWipe = tIn + motionSec;
        var tWord = tWipe + holdSec;
        var tReset = tWord + 0.4;
        var tReveal = tReset + motionSec * 0.7;
        var total = tReveal + Math.max(0.2, holdSec * 0.4);

        gsap.set(gridWrap, { scale: 1 });

        var tl = gsap.timeline({ repeat: -1, delay: opts.delay / 1000 });

        tl.to(gridWrap, { scale: ZOOM_SCALE, duration: tIn, ease: EASE }, 0);
        tl.to(gridWrap, { scale: 1, duration: tWipe - tIn, ease: EASE }, tIn);

        var denom = Math.max(1, REPEAT_COUNT - 1);
        var wipeWindow = tWipe - tIn;
        var perWipe = wipeWindow * 0.5;
        var revealWindow = tReveal - tReset;
        var perReveal = revealWindow * 0.5;

        rows.forEach(function (row) {
            gsap.set(row.el, { x: row.driftHome });

            if (row.isCenterRow) {
                tl.to(row.el, { x: row.driftFull, duration: tIn, ease: EASE }, 0);
                tl.to(row.el, { x: 0, duration: tWipe - tIn, ease: EASE }, tIn);
                tl.to(row.el, { x: row.driftHome, duration: tReveal - tReset, ease: EASE }, tReset);
            } else {
                tl.to(row.el, { x: row.driftFull, duration: tIn, ease: EASE }, 0);
                tl.to(row.el, { x: row.driftHome, duration: tReset - tWord, ease: EASE }, tWord);
            }

            var hidden = row.wipeLTR ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';

            row.words.forEach(function (wordEl, wi) {
                if (row.isCenterRow && wi === centerWordIndex) return; // the surviving word — never wiped

                var sweepT = row.wipeLTR ? wi / denom : (REPEAT_COUNT - 1 - wi) / denom;
                var wStartOut = tIn + sweepT * (wipeWindow - perWipe);
                var wEndOut = wStartOut + perWipe;
                var wStartIn = tReset + sweepT * (revealWindow - perReveal);
                var wEndIn = wStartIn + perReveal;

                tl.to(wordEl, { clipPath: hidden, duration: wEndOut - wStartOut, ease: EASE }, wStartOut);
                tl.to(wordEl, { clipPath: VISIBLE, duration: wEndIn - wStartIn, ease: EASE }, wStartIn);
            });
        });

        // Pins the timeline's own length to `total` — without this, the
        // repeat would loop back to 0 as soon as the LAST tween above
        // finishes, cutting the reference's trailing hold short.
        tl.set(gridWrap, { scale: 1 }, total);

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) tl.play();
                else tl.pause();
            });
        }, { threshold: 0.01 });
        io.observe(textEl);

        textEl._auroraKineticGrid = {
            cleanup: function () {
                io.disconnect();
                tl.kill();
                textEl.style.overflow = '';
            },
        };
    },
};

registerEffect(effect);
export default effect;
