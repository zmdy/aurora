import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-22 Rubber Stamp (see ml-24's and ml-28's header
// comments): slams in oversized/rotated, then settles with an elastic
// bounce.
var effect = {
    id: 'ml-40',
    run: function (units, opts) {
        var slamDuration = 250;

        anime.animate(units, {
            scale: [4, 1.15],
            rotate: [-15, 0],
            opacity: [0, 1],
            duration: slamDuration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'inQuad',
        });

        setTimeout(function () {
            anime.animate(units, {
                scale: 1,
                duration: Math.max(250, opts.duration * 0.6),
                ease: 'outElastic(1, 0.4)',
            });
        }, opts.delay + units.length * opts.stagger + slamDuration);
    },
};

registerEffect(effect);
export default effect;
