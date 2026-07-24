import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-26 Cinema Title (see ml-24's header comment).
// Self-managed for the same reason as gs-26: letter-spacing only makes
// sense on a single text run, not on already-split single-character spans.
var effect = {
    id: 'ml-44',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.textContent = original;
        anime.animate(textEl, {
            letterSpacing: ['2em', 'normal'],
            opacity: [0, 1],
            duration: Math.max(1000, opts.duration * 1.5),
            delay: opts.delay,
            ease: 'inOutQuad',
        });
    },
};

registerEffect(effect);
export default effect;
