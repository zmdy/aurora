import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-27 Text Emerge — same center-outward stagger, ported
// by hand since Anime.js doesn't have GSAP's stagger({from:'center'})
// shorthand: the center-distance delay is computed per unit instead.
var effect = {
    id: 'ml-45',
    run: function (units, opts) {
        var center = (units.length - 1) / 2;
        units.forEach(function (u, i) {
            var distance = Math.abs(i - center);
            anime.animate(u, {
                opacity: [0, 1],
                scale: [0, 1],
                filter: ['blur(6px)', 'blur(0px)'],
                duration: Math.max(300, opts.duration),
                delay: opts.delay + distance * opts.stagger,
                ease: 'outBack',
            });
        });
    },
};

registerEffect(effect);
export default effect;
