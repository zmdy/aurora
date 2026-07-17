/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-20',
    // Airport split-flap display: each unit flips down from the top,
    // faster and tighter than ml-6 Flip X (which flips from center with a
    // slower, wider stagger).
    run: function (units, opts) {
        units.forEach(function (u) {
            u.style.transformOrigin = 'top center';
            u.style.transformStyle = 'preserve-3d';
        });
        anime.animate(units, {
            rotateX: [-90, 0],
            opacity: [0, 1],
            duration: Math.max(250, opts.duration * 0.4),
            delay: function (el, i) { return opts.delay + i * Math.max(opts.stagger, 40); },
            ease: 'outQuad',
        });
    },
};

registerEffect(effect);
export default effect;
