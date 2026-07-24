import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-20 Heartbeat (see ml-24's and ml-28's header
// comments). No stagger — the whole text pulses together.
var effect = {
    id: 'ml-38',
    run: function (units, opts) {
        var fadeIn = Math.max(200, opts.duration * 0.3);

        anime.animate(units, {
            opacity: [0, 1],
            duration: fadeIn,
            delay: opts.delay,
            ease: 'outQuad',
        });

        var t = opts.delay + fadeIn;
        setTimeout(function () {
            anime.animate(units, { scale: 1.15, duration: 100, ease: 'inQuad' });
        }, t);
        setTimeout(function () {
            anime.animate(units, { scale: 1, duration: 100, ease: 'linear' });
        }, t + 100);
        setTimeout(function () {
            anime.animate(units, { scale: 1.25, duration: 120, ease: 'linear' });
        }, t + 200);
        setTimeout(function () {
            anime.animate(units, { scale: 1, duration: 300, ease: 'outQuad' });
        }, t + 320);
    },
};

registerEffect(effect);
export default effect;
