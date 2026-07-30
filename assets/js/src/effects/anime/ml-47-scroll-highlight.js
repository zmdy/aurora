import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-29 Scroll Highlight — identical hand-rolled scroll
// math (see gs-29's header comment for the full derivation of the "top
// center"/"bottom center" scrub progress formula and the per-unit virtual
// timeline), units lit via direct style writes instead of gsap.set().
var effect = {
    id: 'ml-47',
    run: function (units, opts, textEl) {
        if (!units.length) return;

        if (textEl._auroraScrollHighlight) {
            window.removeEventListener('scroll', textEl._auroraScrollHighlight);
            window.removeEventListener('resize', textEl._auroraScrollHighlight);
            textEl._auroraScrollHighlight = null;
        }

        var litColor = getComputedStyle(textEl).color || 'rgb(255, 255, 255)';
        var m = litColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
        var r = m ? m[1] : 255, g = m ? m[2] : 255, b = m ? m[3] : 255;
        var dimColor = 'rgba(' + r + ', ' + g + ', ' + b + ', 0.15)';

        anime.animate(units, { opacity: 1, color: dimColor, duration: 0 });

        var dur = Math.max(0.05, opts.duration / 1000);
        var stagger = Math.max(0, opts.stagger / 1000);
        var totalDuration = dur + (units.length - 1) * stagger;

        function easeOut(t) { return 1 - Math.pow(1 - t, 1.8); }

        var ticking = false;

        function measure() {
            ticking = false;
            var rect = textEl.getBoundingClientRect();
            var vh = window.innerHeight || document.documentElement.clientHeight;
            var viewportCenter = vh / 2;
            var progress = rect.height > 0
                ? Math.max(0, Math.min(1, (viewportCenter - rect.top) / rect.height))
                : 0;
            var playhead = progress * totalDuration;

            units.forEach(function (u, i) {
                var local = dur > 0 ? (playhead - i * stagger) / dur : (playhead >= i * stagger ? 1 : 0);
                local = Math.max(0, Math.min(1, local));
                var t = easeOut(local);
                u.style.color = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + (0.15 + 0.85 * t).toFixed(3) + ')';
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
