/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-19',
    run: function (units, opts) {
        anime.animate(units, {
            translateX: function (el, i) { return [Math.cos(i) * 100, 0]; },
            translateY: function (el, i) { return [Math.sin(i) * 100, 0]; },
            rotate: [360, 0],
            scale: [0, 1],
            opacity: [0, 1],
            duration: Math.max(500, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outCubic',
        });
    },
};

registerEffect(effect);
export default effect;
