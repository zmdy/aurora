import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-13 Spin In (see ml-24's header comment).
var effect = {
    id: 'ml-31',
    run: function (units, opts) {
        anime.animate(units, {
            rotate: [720, 0],
            scale: [0, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
