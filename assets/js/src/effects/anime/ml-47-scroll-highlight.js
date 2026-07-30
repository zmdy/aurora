import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-29 Scroll Highlight — identical hand-rolled scroll
// math (no ScrollTrigger-equivalent needed either way), units lit up with
// anime.animate() instead of gsap.set()/inline transitions.
var effect = {
    id: 'ml-47',
    run: function (units, opts, textEl) {
        if (!units.length) return;

        if (textEl._auroraScrollHighlight) {
            window.removeEventListener('scroll', textEl._auroraScrollHighlight);
            window.removeEventListener('resize', textEl._auroraScrollHighlight);
            textEl._auroraScrollHighlight = null;
        }

        var lit = getComputedStyle(textEl).color || '#ffffff';
        var dim = 'rgba(128, 128, 128, 0.32)';

        anime.animate(units, { opacity: 1, color: dim, duration: 0 });
        units.forEach(function (u) { u.style.transition = 'color 0.2s linear'; });

        var ticking = false;

        function measure() {
            ticking = false;
            var rect = textEl.getBoundingClientRect();
            var vh = window.innerHeight || document.documentElement.clientHeight;
            var start = vh * 0.85;
            var end = vh * 0.25;
            var progress = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
            var litCount = Math.round(progress * units.length);
            units.forEach(function (u, i) {
                u.style.color = i < litCount ? lit : dim;
            });
        }

        function onScrollOrResize() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(measure);
        }

        measure();
        window.addEventListener('scroll', onScrollOrResize, { passive: true });
        window.addEventListener('resize', onScrollOrResize);
        textEl._auroraScrollHighlight = onScrollOrResize;
    },
};

registerEffect(effect);
export default effect;
