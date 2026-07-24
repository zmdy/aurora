import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-7',
    run: function (units, opts) {
        anime.animate(units, {
            opacity: [0, 1],
            duration: 1,
            delay: function (el, i) {
                // larger stagger to simulate typing
                return opts.delay + i * Math.max(opts.stagger, 60);
            },
            ease: 'linear',
        });
    },
};

registerEffect(effect);
export default effect;
