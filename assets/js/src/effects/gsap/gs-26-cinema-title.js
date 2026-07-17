/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-26',
    // Letter-spacing only makes sense on a single text run, not on
    // already-split single-character spans — bypasses the per-unit split
    // and animates the text element's own tracking directly.
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.textContent = original;
        gsap.fromTo(textEl,
            { letterSpacing: '2em', opacity: 0 },
            {
                letterSpacing: 'normal',
                opacity: 1,
                duration: Math.max(1, opts.duration / 1000 * 1.5),
                delay: opts.delay / 1000,
                ease: 'power3.inOut',
            }
        );
    },
};

registerEffect(effect);
export default effect;
