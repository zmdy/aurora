/* global anime */
import { registerEffect } from '../../core/registry.js';
import { resplitNative } from '../../core/helpers.js';

var effect = {
    id: 'ml-11',
    // Uses Anime.js v4's native anime.splitText() instead of the generic
    // pre-split `units` — see core/engine.js's isSelfManaged().
    selfManaged: true,
    run: function (units, opts, textEl) {
        textEl.style.opacity = '1';
        var split = resplitNative(textEl, { chars: true });
        anime.animate(split.chars, {
            translateY: [40, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
