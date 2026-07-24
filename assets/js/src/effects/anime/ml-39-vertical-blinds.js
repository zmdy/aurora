import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-21 Vertical Blinds (see ml-24's header comment).
// GSAP's stagger supports a built-in `from: 'edges'` shorthand; Anime.js's
// delay function computes the same "closest edge first" order by hand.
var effect = {
    id: 'ml-39',
    run: function (units, opts) {
        var n = units.length;
        anime.animate(units, {
            scaleX: [0, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) {
                var distFromEdge = Math.min(i, n - 1 - i);
                return opts.delay + distFromEdge * opts.stagger;
            },
            ease: 'outQuad',
        });
    },
};

registerEffect(effect);
export default effect;
