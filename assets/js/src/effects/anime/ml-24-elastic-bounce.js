/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-4 Elastic Bounce (GSAP) — same visual (fall + elastic
// overshoot settle), kept as a separate library option so the whole
// GSAP-side catalog has an Anime.js equivalent (see README's Text
// Animation build notes for why: GSAP's core license isn't GPL-compatible,
// Anime.js's MIT license is — this is prep work for an eventual
// WordPress.org submission, not an active migration yet).
var effect = {
    id: 'ml-24',
    run: function (units, opts) {
        anime.animate(units, {
            translateY: [60, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.4)',
        });
    },
};

registerEffect(effect);
export default effect;
