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

        var typeSpeed = Math.max(20, Math.min(90, opts.duration / Math.max(1, original.length)));
        var deleteSpeed = typeSpeed * 0.6;
        var pauseAfterType = 900;

        setTimeout(function () {
            var i = 0;
            var typeHandle = setInterval(function () {
                i++;
                textEl.textContent = original.slice(0, i);
                if (i >= original.length) {
                    clearInterval(typeHandle);
                    setTimeout(function () {
                        var j = original.length;
                        var deleteHandle = setInterval(function () {
                            j--;
                            textEl.textContent = original.slice(0, j);
                            if (j <= 0) {
                                clearInterval(deleteHandle);
                                setTimeout(function () {
                                    var k = 0;
                                    var retypeHandle = setInterval(function () {
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
