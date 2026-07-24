import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-18',
    // Units fall into place in RANDOM order (rather than left-to-right
    // sequential stagger) for a "digital rain" feel.
    run: function (units, opts) {
        anime.animate(units, {
            translateY: [-100, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function () { return opts.delay + Math.random() * opts.stagger * units.length * 0.5; },
            ease: 'outQuad',
        });
    },
};

registerEffect(effect);
export default effect;
