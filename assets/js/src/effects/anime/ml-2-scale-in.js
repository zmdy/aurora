/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-2',
    run: function (units, opts) {
        anime.animate(units, {
            scale: [0.2, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outBack',
        });
    },
};

registerEffect(effect);
export default effect;
