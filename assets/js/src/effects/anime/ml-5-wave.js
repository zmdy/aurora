import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-5',
    run: function (units, opts) {
        anime.animate(units, {
            translateY: function (el, i) { return [Math.sin(i * 0.85) * 40, 0]; },
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outSine',
        });
    },
};

registerEffect(effect);
export default effect;
