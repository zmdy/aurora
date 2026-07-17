/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-9 Bounce Drop (see ml-24's header comment).
var effect = {
    id: 'ml-27',
    run: function (units, opts) {
        anime.animate(units, {
            translateY: [-80, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outBounce',
        });
    },
};

registerEffect(effect);
export default effect;
