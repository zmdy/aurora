/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-6',
    run: function (units, opts) {
        units.forEach(function (u) {
            u.style.transformOrigin = 'center bottom';
            u.style.transformStyle = 'preserve-3d';
            u.style.backfaceVisibility = 'hidden';
        });
        anime.animate(units, {
            rotateX: [90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
