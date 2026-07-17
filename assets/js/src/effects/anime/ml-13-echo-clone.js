/* global anime */
import { registerEffect } from '../../core/registry.js';
import { resplitNative } from '../../core/helpers.js';

var effect = {
    id: 'ml-13',
    // Each letter cloned via anime.splitText()'s clone param, an
    // echo/depth effect — self-managed, see core/engine.js's
    // isSelfManaged().
    selfManaged: true,
    run: function (units, opts, textEl) {
        textEl.style.opacity = '1';
        var split = resplitNative(textEl, { chars: { wrap: 'clip', clone: 'bottom' } });
        anime.animate(split.chars, {
            translateY: ['-100%', '0%'],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
