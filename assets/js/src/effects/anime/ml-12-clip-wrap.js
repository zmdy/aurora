/* global anime */
import { registerEffect } from '../../core/registry.js';
import { resplitNative } from '../../core/helpers.js';

var effect = {
    id: 'ml-12',
    // Words masked via anime.splitText()'s wrap:'clip' — self-managed,
    // see core/engine.js's isSelfManaged().
    selfManaged: true,
    run: function (units, opts, textEl) {
        textEl.style.opacity = '1';
        var split = resplitNative(textEl, { words: { wrap: 'clip' } });
        anime.animate(split.words, {
            translateY: ['100%', '0%'],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
