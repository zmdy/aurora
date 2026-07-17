/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-8',
    run: function (units, opts) {
        // Starts blurred
        units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
        anime.animate(units, {
            filter: ['blur(14px)', 'blur(0px)'],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outQuart',
        });
    },
};

registerEffect(effect);
export default effect;
