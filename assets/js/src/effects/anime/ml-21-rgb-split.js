/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-21',
    // Chromatic-aberration converge: red & cyan channels start wide apart
    // and slide together onto the base text.
    // Uses text-shadow instead of absolute-positioned spans so the effect
    // works correctly inside overflow:hidden containers (card stages,
    // Elementor widget wrappers, etc.).
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.textContent = original;
        textEl.style.opacity = '0';

        // Animate opacity + text-shadow convergence in a single pass
        var startOffset = 14;
        var obj = { t: 0, o: 0 };

        anime.animate(obj, {
            t: [startOffset, 0],
            o: [0, 1],
            duration: opts.duration,
            delay: opts.delay,
            ease: 'outExpo',
            onUpdate: function () {
                var v = obj.t;
                var o = obj.o;
                textEl.style.opacity = o;
                textEl.style.textShadow =
                    (-v).toFixed(2) + 'px 0 0 rgba(255,43,77,' + (o * 0.85).toFixed(3) + '),' +
                    v.toFixed(2) + 'px 0 0 rgba(0,200,255,' + (o * 0.85).toFixed(3) + ')';
            },
            onComplete: function () {
                // Settle into a very tight permanent glow
                textEl.style.textShadow =
                    '-1.5px 0 0 rgba(255,43,77,0.55), 1.5px 0 0 rgba(0,200,255,0.55)';
            },
        });
    },
};

registerEffect(effect);
export default effect;

