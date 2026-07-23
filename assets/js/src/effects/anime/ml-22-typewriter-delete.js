/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-22',
    // Types the full text out, pauses, deletes it back down to nothing,
    // then retypes it — the classic "hero tagline" flourish. One-shot (not
    // a perpetual loop like ml-15), hand-rolled with setInterval like the
    // scramble effects, since it needs the same kind of char-by-char
    // string rebuilding they use.
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';
        textEl.textContent = '';

        // Clear any existing typewriter handles
        if (textEl._auroraTypeTimeouts) {
            textEl._auroraTypeTimeouts.forEach(clearTimeout);
        }
        textEl._auroraTypeTimeouts = [];

        if (textEl._auroraTypeHandles) {
            textEl._auroraTypeHandles.forEach(clearInterval);
        }
        textEl._auroraTypeHandles = [];

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            textEl.textContent = original;
            return;
        }

        var typeSpeed = Math.max(20, Math.min(90, opts.duration / Math.max(1, original.length)));
        var deleteSpeed = typeSpeed * 0.6;
        var pauseAfterType = 900;

        var safeTimeout = function (fn, delay) {
            var t = setTimeout(fn, delay);
            textEl._auroraTypeTimeouts.push(t);
            return t;
        };

        var safeInterval = function (fn, delay) {
            var i = setInterval(fn, delay);
            textEl._auroraTypeHandles.push(i);
            return i;
        };

        safeTimeout(function () {
            var i = 0;
            var typeHandle = safeInterval(function () {
                i++;
                textEl.textContent = original.slice(0, i);
                if (i >= original.length) {
                    clearInterval(typeHandle);
                    safeTimeout(function () {
                        var j = original.length;
                        var deleteHandle = safeInterval(function () {
                            j--;
                            textEl.textContent = original.slice(0, j);
                            if (j <= 0) {
                                clearInterval(deleteHandle);
                                safeTimeout(function () {
                                    var k = 0;
                                    var retypeHandle = safeInterval(function () {
                                        k++;
                                        textEl.textContent = original.slice(0, k);
                                        if (k >= original.length) clearInterval(retypeHandle);
                                    }, typeSpeed);
                                }, 250);
                            }
                        }, deleteSpeed);
                    }, pauseAfterType);
                }
            }, typeSpeed);
        }, opts.delay);
    },
};

registerEffect(effect);
export default effect;
