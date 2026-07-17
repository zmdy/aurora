/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-23',
    // Arranges each character around a circle via trigonometry, then spins
    // the whole dial forever — recreates the "Rotating Character Dial"
    // pattern (ogblocks.dev's Framer Motion guide) with Anime.js. Builds
    // its own circular DOM layout, so it bypasses the generic per-unit
    // split entirely.
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        var chars = Array.from(original);
        var radius = Math.max(40, Math.min(120, chars.length * 8));

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var dial = document.createElement('div');
        dial.style.cssText = 'position:relative;display:inline-block;width:' + (radius * 2) + 'px;height:' + (radius * 2) + 'px;';

        chars.forEach(function (ch, i) {
            var span = document.createElement('span');
            span.textContent = ch === ' ' ? ' ' : ch;
            var deg = (360 / chars.length) * i;
            span.style.cssText = 'position:absolute;left:50%;top:0;'
                + 'transform:rotate(' + deg + 'deg) translateY(-' + radius + 'px);'
                + 'transform-origin:0 ' + radius + 'px;margin-left:-0.5ch;';
            dial.appendChild(span);
        });

        textEl.appendChild(dial);

        anime.animate(dial, {
            rotate: 360,
            duration: Math.max(2000, opts.duration * 4),
            loop: true,
            ease: 'linear',
        });
    },
};

registerEffect(effect);
export default effect;
