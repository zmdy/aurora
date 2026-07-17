/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-16 Domino Fall (see ml-24's header comment).
var effect = {
    id: 'ml-34',
    run: function (units, opts) {
        units.forEach(function (u) { u.style.transformOrigin = 'bottom left'; });
        anime.animate(units, {
            rotate: [-90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
