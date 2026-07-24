import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-24 Liquid Fill Reveal (see ml-24's header comment).
// Self-managed for the same reason as gs-24: a clip-path wipe should read
// as ONE cohesive fill, not many little per-unit wipes.
var effect = {
    id: 'ml-42',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        var span = document.createElement('span');
        span.textContent = original;
        span.style.display = 'block';
        textEl.appendChild(span);
        textEl.style.opacity = '1';
        anime.animate(span, {
            clipPath: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'],
            duration: opts.duration,
            delay: opts.delay,
            ease: 'outQuad',
        });
    },
};

registerEffect(effect);
export default effect;
