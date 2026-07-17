/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-4',
    run: function (units, opts) {
        anime.animate(units, {
            translateX: [80, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
