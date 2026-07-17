/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-14 Neon Flicker (see ml-24's and ml-28's header
// comments re: setTimeout-based sequencing instead of a timeline).
var effect = {
    id: 'ml-32',
    run: function (units, opts) {
        var t = opts.delay;
        units.forEach(function (u) { u.style.opacity = '0'; });

        anime.animate(units, {
            opacity: [0, 1],
            duration: 80,
            delay: function (el, i) { return t + i * opts.stagger; },
            ease: 'linear',
        });

        var afterStagger = t + units.length * opts.stagger + 80;

        setTimeout(function () {
            anime.animate(units, { opacity: 0.2, duration: 50, ease: 'linear' });
        }, afterStagger);

        setTimeout(function () {
            anime.animate(units, { opacity: 1, duration: 80, ease: 'linear' });
        }, afterStagger + 50);

        setTimeout(function () {
            anime.animate(units, { opacity: 0, duration: 50, ease: 'linear' });
        }, afterStagger + 130);

        setTimeout(function () {
            anime.animate(units, {
                opacity: 1,
                textShadow: '0 0 20px currentColor',
                duration: Math.max(200, opts.duration * 0.4),
                ease: 'linear',
            });
        }, afterStagger + 180);
    },
};

registerEffect(effect);
export default effect;
