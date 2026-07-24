import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-23 VHS Tracking (see ml-24's and ml-28's header
// comments).
var effect = {
    id: 'ml-41',
    run: function (units, opts) {
        units.forEach(function (u) {
            u.style.opacity = '0.7';
            u.style.transform = 'skewX(5deg)';
        });

        anime.animate(units, {
            opacity: [0.7, 1],
            duration: 10,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'linear',
        });

        var jitterAt = opts.delay + units.length * opts.stagger + 10;
        anime.animate(units, {
            translateX: [0, -10, 0],
            skewX: [5, -8, 0],
            duration: 60 * 5,
            delay: jitterAt,
            loop: 5,
            alternate: true,
            ease: 'linear',
        });

        setTimeout(function () {
            anime.animate(units, { translateX: 0, skewX: 0, opacity: 1, duration: 300 });
            setTimeout(function () {
                anime.animate(units, { translateX: [0, 5, 0], opacity: [1, 0.6, 1], duration: 240, ease: 'linear' });
            }, 500);
        }, jitterAt + 60 * 5);
    },
};

registerEffect(effect);
export default effect;
