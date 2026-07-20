/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-24',
    // A clip-path wipe reads as ONE cohesive fill, not many little wipes —
    // so this bypasses the per-unit split and animates the text element as
    // a single block (like gs-3 Scramble does), ignoring "Split by".
    // NOTE: clip-path is applied to an inner <span> so it is not clipped by
    // any parent overflow:hidden (card stages, Elementor widget wrappers).
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var inner = document.createElement('span');
        inner.textContent = original;
        inner.style.display = 'block';
        textEl.appendChild(inner);

        gsap.fromTo(inner,
            { clipPath: 'inset(100% 0 0 0)' },
            {
                clipPath: 'inset(0% 0 0 0)',
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                ease: 'power2.out',
            }
        );
    },
};

registerEffect(effect);
export default effect;
