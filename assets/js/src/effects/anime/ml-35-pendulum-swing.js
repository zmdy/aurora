import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-17 Pendulum Swing (see ml-24's header comment).
var effect = {
    id: 'ml-35',
    run: function (units, opts) {
        units.forEach(function (u) { u.style.transformOrigin = 'top center'; });
        anime.animate(units, {
            rotate: [90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.5)',
        });
    },
};

registerEffect(effect);
export default effect;
