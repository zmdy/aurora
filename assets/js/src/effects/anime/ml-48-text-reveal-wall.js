import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';
import { SCRAMBLE_CHARS } from '../../core/helpers.js';

// Anime.js port of gs-30 Text Reveal Wall — identical wall-building logic
// (it's plain DOM/interval work either way), with anime.animate() used for
// the per-row reveal flourish instead of gsap.fromTo().
var effect = {
    id: 'ml-48',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = (textEl._auroraOriginal || textEl.innerText || '').trim();
        var words = original.split(/\s+/).filter(Boolean);
        if (!words.length) return;

        if (textEl._auroraScrambleInterval) {
            clearInterval(textEl._auroraScrambleInterval);
            textEl._auroraScrambleInterval = null;
        }
        if (textEl._auroraScrambleTimeout) {
            clearTimeout(textEl._auroraScrambleTimeout);
            textEl._auroraScrambleTimeout = null;
        }

        textEl.innerHTML = '';
        textEl.style.opacity = '1';
        textEl.style.fontVariantNumeric = 'tabular-nums';

        var ROWS = Math.max(6, Math.min(14, words.length + 4));
        var COLS = 34;

        var rowWords = [];
        for (var r = 0; r < ROWS; r++) rowWords.push(null);
        words.forEach(function (w, i) {
            var row = i % ROWS;
            var maxStart = Math.max(0, COLS - w.length);
            rowWords[row] = { word: w, start: Math.floor(Math.random() * (maxStart + 1)) };
        });

        var rowEls = [];
        for (var ri = 0; ri < ROWS; ri++) {
            var rowEl = document.createElement('div');
            rowEl.style.cssText = 'white-space:pre;';
            textEl.appendChild(rowEl);
            rowEls.push(rowEl);
        }

        function randomChar() {
            return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }

        function renderRow(ri, revealed) {
            var info = rowWords[ri];
            var out = '';
            for (var c = 0; c < COLS; c++) {
                if (info && c >= info.start && c < info.start + info.word.length) {
                    out += revealed ? info.word[c - info.start] : randomChar();
                } else {
                    out += revealed ? ' ' : (Math.random() < 0.35 ? randomChar() : ' ');
                }
            }
            rowEls[ri].textContent = out;
        }

        for (var ri0 = 0; ri0 < ROWS; ri0++) renderRow(ri0, false);

        var revealDuration = Math.max(400, opts.duration);
        var rowStagger = Math.max(40, opts.stagger);
        var revealedRows = {};

        textEl._auroraScrambleTimeout = setTimeout(function () {
            var startTime = Date.now();
            textEl._auroraScrambleInterval = setInterval(function () {
                var elapsed = Date.now() - startTime;
                var doneCount = 0;
                for (var i = 0; i < ROWS; i++) {
                    var rowElapsed = elapsed - i * rowStagger;
                    if (rowElapsed >= revealDuration) {
                        renderRow(i, true);
                        if (!revealedRows[i]) {
                            revealedRows[i] = true;
                            anime.animate(rowEls[i], { opacity: [0.4, 1], duration: 300 });
                        }
                        doneCount++;
                    } else if (rowElapsed >= 0) {
                        renderRow(i, false);
                    }
                }
                if (doneCount >= ROWS) {
                    clearInterval(textEl._auroraScrambleInterval);
                    textEl._auroraScrambleInterval = null;
                }
            }, 45);
        }, opts.delay);
    },
};

registerEffect(effect);
export default effect;
