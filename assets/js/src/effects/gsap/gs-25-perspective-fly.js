/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-25',
    // A shared 3D perspective only makes sense established on ONE box, not
    // one per split unit (each would get its own vanishing point and the
    // depth illusion would break) — so this flies the whole text element
    // in as a single block, bypassing the per-unit split.
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.textContent = original;
        textEl.style.opacity = '1';
        if (textEl.parentElement) {
            textEl.parentElement.style.perspective = '500px';
        }
        gsap.fromTo(textEl,
            { z: -2000, opacity: 0 },
            {
                z: 0,
                opacity: 1,
                duration: Math.max(0.6, opts.duration / 1000),
                delay: opts.delay / 1000,
                ease: 'power3.out',
            }
        );
    },
};

registerEffect(effect);
export default effect;
