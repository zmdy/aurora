import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-35 Appear Text — identical grid build + timeline
// math (see gs-35's header comment for the full phase-timing derivation
// ported from the Originkit `KineticTextGrid` source), using
// anime.createTimeline({ loop: true }) instead of
// gsap.timeline({ repeat: -1 }). Anime v4's timeline `.add(target, props,
// position)` takes an absolute position in the SAME units as `duration`
// (ms here, vs. GSAP's seconds), so every phase boundary below is in
// milliseconds instead of gs-35's seconds — otherwise the structure is a
// 1:1 mirror.
var ROW_COUNT = 5;
var REPEAT_COUNT = 5;
var ROW_GAP = 16;
var WORD_GAP = 24;
var HORIZONTAL_SHIFT = 80;
var ZOOM_SCALE = 1.15;
var HOME_FACTOR = 0.4;
var EASE = 'inOutQuad';
var VISIBLE = 'inset(0% 0% 0% 0%)';

var effect = {
    id: 'ml-53',
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

        var motionMs = Math.max(200, opts.duration);
        var holdMs = 1000;
        var tIn = motionMs;
        var tWipe = tIn + motionMs;
        var tWord = tWipe + holdMs;
        var tReset = tWord + 400;
        var tReveal = tReset + motionMs * 0.7;
        var total = tReveal + Math.max(200, holdMs * 0.4);

        anime.set(gridWrap, { scale: 1 });

        var tl = anime.createTimeline({ loop: true, delay: opts.delay });

        tl.add(gridWrap, { scale: ZOOM_SCALE, duration: tIn, ease: EASE }, 0);
        tl.add(gridWrap, { scale: 1, duration: tWipe - tIn, ease: EASE }, tIn);

        var denom = Math.max(1, REPEAT_COUNT - 1);
        var wipeWindow = tWipe - tIn;
        var perWipe = wipeWindow * 0.5;
        var revealWindow = tReveal - tReset;
        var perReveal = revealWindow * 0.5;

        rows.forEach(function (row) {
            anime.set(row.el, { translateX: row.driftHome });

            if (row.isCenterRow) {
                tl.add(row.el, { translateX: row.driftFull, duration: tIn, ease: EASE }, 0);
                tl.add(row.el, { translateX: 0, duration: tWipe - tIn, ease: EASE }, tIn);
                tl.add(row.el, { translateX: row.driftHome, duration: tReveal - tReset, ease: EASE }, tReset);
            } else {
                tl.add(row.el, { translateX: row.driftFull, duration: tIn, ease: EASE }, 0);
                tl.add(row.el, { translateX: row.driftHome, duration: tReset - tWord, ease: EASE }, tWord);
            }

            var hidden = row.wipeLTR ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';

            row.words.forEach(function (wordEl, wi) {
                if (row.isCenterRow && wi === centerWordIndex) return;

                var sweepT = row.wipeLTR ? wi / denom : (REPEAT_COUNT - 1 - wi) / denom;
                var wStartOut = tIn + sweepT * (wipeWindow - perWipe);
                var wEndOut = wStartOut + perWipe;
                var wStartIn = tReset + sweepT * (revealWindow - perReveal);
                var wEndIn = wStartIn + perReveal;

                tl.add(wordEl, { clipPath: hidden, duration: wEndOut - wStartOut, ease: EASE }, wStartOut);
                tl.add(wordEl, { clipPath: VISIBLE, duration: wEndIn - wStartIn, ease: EASE }, wStartIn);
            });
        });

        // Pins the timeline's own length to `total`, same reasoning as
        // gs-35's trailing gsap.set() — otherwise `loop` would restart as
        // soon as the last tween above finishes.
        tl.add(gridWrap, { scale: 1, duration: 0 }, total);

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) { if (typeof tl.play === 'function') tl.play(); }
                else if (typeof tl.pause === 'function') tl.pause();
            });
        }, { threshold: 0.01 });
        io.observe(textEl);

        textEl._auroraKineticGrid = {
            cleanup: function () {
                io.disconnect();
                if (typeof tl.pause === 'function') tl.pause();
                if (typeof tl.revert === 'function') tl.revert();
                textEl.style.overflow = '';
            },
        };
    },
};

registerEffect(effect);
export default effect;
