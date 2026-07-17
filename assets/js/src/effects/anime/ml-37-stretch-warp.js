/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-19 Stretch Warp (see ml-24's header comment).
var effect = {
    id: 'ml-37',
    run: function (units, opts) {
        anime.animate(units, {
            scaleX: [4, 1],
            scaleY: [0.2, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.4)',
        });
    },
};

registerEffect(effect);
export default effect;
