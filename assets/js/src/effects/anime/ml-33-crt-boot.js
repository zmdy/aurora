/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-15 CRT Boot (see ml-24's and ml-28's header comments).
var effect = {
    id: 'ml-33',
    run: function (units, opts, textEl) {
        textEl.style.transformOrigin = 'center center';
        anime.animate(textEl, {
            scaleY: [0.005, 1],
            opacity: [0.6, 1],
            duration: 400,
            delay: opts.delay,
            ease: 'outQuad',
        });

        setTimeout(function () {
            anime.animate(units, {
                opacity: [0, 1],
                filter: ['blur(10px)', 'blur(0px)'],
                duration: Math.max(300, opts.duration),
                delay: function (el, i) { return i * opts.stagger; },
                ease: 'outQuad',
            });
        }, opts.delay + 300);

        setTimeout(function () {
            anime.animate(units, {
                textShadow: '0 0 10px currentColor',
                duration: 300,
            });
        }, opts.delay + 300 + Math.max(300, opts.duration) + units.length * opts.stagger);
    },
};

registerEffect(effect);
export default effect;
