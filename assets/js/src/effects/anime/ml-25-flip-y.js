/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-5 3D Flip (rotationY) — mirrors ml-6 Flip X but on
// the Y axis, matching GSAP's gs-5 exactly (see ml-24's header comment for
// why this parity set exists).
var effect = {
    id: 'ml-25',
    run: function (units, opts) {
        units.forEach(function (u) {
            u.style.transformStyle = 'preserve-3d';
            u.style.backfaceVisibility = 'hidden';
        });
        anime.animate(units, {
            rotateY: [90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
