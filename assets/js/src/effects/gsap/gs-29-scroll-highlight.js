import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Scroll Highlight — inspired by the idea of dimmed text that lights up
// unit by unit as the block scrolls through the viewport, explored via a
// pasted Originkit GSAP/ScrollTrigger source. Reimplemented from scratch
// without the ScrollTrigger plugin (not bundled with Aurora): scroll
// position is read directly and progress is computed by hand on scroll/
// resize, throttled with requestAnimationFrame.
//
// Unlike every other effect here, this one doesn't play once and stop —
// it stays bound to scroll for as long as the widget exists, continuously
// re-lighting/dimming units as the reader scrolls up and down.
var effect = {
    id: 'gs-29',
    run: function (units, opts, textEl) {
        if (!units.length) return;

        // Reinitializing (e.g. an editor control change) should replace the
        // previous scroll binding, not stack another one on top of it.
        if (textEl._auroraScrollHighlight) {
            window.removeEventListener('scroll', textEl._auroraScrollHighlight);
            window.removeEventListener('resize', textEl._auroraScrollHighlight);
            textEl._auroraScrollHighlight = null;
        }

        var lit = getComputedStyle(textEl).color || '#ffffff';
        var dim = 'rgba(128, 128, 128, 0.32)';

        gsap.set(units, { opacity: 1, color: dim });
        units.forEach(function (u) { u.style.transition = 'color 0.2s linear'; });

        var ticking = false;

        function measure() {
            ticking = false;
            var rect = textEl.getBoundingClientRect();
            var vh = window.innerHeight || document.documentElement.clientHeight;
            // Scrubs progress 0 → 1 as the block travels from just below the
            // fold to a quarter of the way up the viewport — a hand-rolled
            // stand-in for ScrollTrigger's start/end + scrub.
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
