/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-14',
    // Uses Anime.js v4's native anime.scrambleText() — self-managed, see
    // core/engine.js's isSelfManaged().
    selfManaged: true,
    run: function (units, opts, textEl) {
        textEl.style.opacity = '1';
        anime.animate(textEl, {
            innerHTML: anime.scrambleText({ duration: opts.duration }),
            delay: opts.delay,
        });
    },
};

registerEffect(effect);
export default effect;
