/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-17',
    // Each unit starts scattered at a random offset/rotation and converges
    // into place — the entrance-side counterpart to the Hover Scatter
    // interaction (core/engine.js), which does the same random-jump trick
    // on hover instead of on entrance.
    run: function (units, opts) {
        function rand(min, max) {
            if (anime && anime.utils && typeof anime.utils.random === 'function') {
                return anime.utils.random(min, max);
            }
            return Math.random() * (max - min) + min;
        }
        units.forEach(function (u) {
            anime.animate(u, {
                translateX: [rand(-160, 160), 0],
                translateY: [rand(-120, 120), 0],
                rotate: [rand(-90, 90), 0],
                opacity: [0, 1],
                duration: opts.duration,
                delay: opts.delay + Math.random() * opts.stagger * units.length * 0.4,
                ease: 'outExpo',
            });
        });
    },
};

registerEffect(effect);
export default effect;
