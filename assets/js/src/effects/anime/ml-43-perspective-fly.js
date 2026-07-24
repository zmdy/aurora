import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-25 Perspective Fly (see ml-24's header comment).
// Self-managed for the same reason as gs-25: the 3D perspective needs to
// be established on ONE box, not one per split unit.
var effect = {
    id: 'ml-43',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.textContent = original;
        textEl.style.opacity = '0';
        if (textEl.parentElement) {
            textEl.parentElement.style.perspective = '500px';
        }
        anime.animate(textEl, {
            translateZ: [-2000, 0],
            opacity: [0, 1],
            duration: Math.max(600, opts.duration),
            delay: opts.delay,
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
