import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-12 Slot Machine (see ml-24's header comment).
// Anime.js transform properties accept unit-suffixed value strings, same
// as GSAP's yPercent.
var effect = {
    id: 'ml-30',
    run: function (units, opts) {
        anime.animate(units, {
            translateY: ['-500%', '0%'],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
