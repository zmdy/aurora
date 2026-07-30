import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Scroll Highlight — ported from the Originkit "Scroll Text Highlight"
// GSAP/ScrollTrigger source (pasted in full) to match its actual scrub
// math, since Aurora doesn't bundle the ScrollTrigger plugin. The
// reference does this:
//
//   gsap.set(targets, { color: dimColor });
//   gsap.to(targets, {
//       color: highlightColor,
//       stagger,                                  // e.g. 0.1s/word
//       scrollTrigger: { trigger, start: "top center", end: "bottom center", scrub },
//   });
//
// With `scrub: true`, ScrollTrigger maps the WHOLE tween's internal
// playhead (0..totalActiveDuration, where totalActiveDuration = duration +
// (targets.length - 1) * stagger) directly onto scroll progress between
// the start/end trigger points — so it's a hand-computed virtual
// timeline, not a real GSAP tween, but reproduces exactly the same
// per-unit color curve and is fully reversible (scrolling back up un-lights
// units in the same staggered order).
//
// start: "top center" / end: "bottom center" — trigger progress is 0 when
// the block's top edge reaches the viewport's vertical center, and 1 when
// the block's BOTTOM edge reaches that same center line. Expressed purely
// from getBoundingClientRect() (no ScrollTrigger needed to compute this):
//   progress = (viewportCenter - rect.top) / rect.height, clamped to [0, 1]
// (derivation: let y = viewportCenter - rect.top. y = 0 exactly at the
// start position. At the end position, rect.bottom = viewportCenter, i.e.
// rect.top = viewportCenter - rect.height, so y = rect.height there — so
// y / rect.height is 0 at start and 1 at end.)
//
// Previous version of this file used a fixed vh*0.85 → vh*0.25 scroll
// window (unrelated to the block's own size or position) and a binary
// "lit if index < litCount" step function with a 0.2s CSS transition
// layered on top — visually close but not the same curve, and the CSS
// transition actively fought the scrub (it added lag instead of tracking
// scroll 1:1). This version removes the transition (color is set exactly
// per scroll tick, already smooth via stagger + duration) and computes
// each unit's own eased 0..1 progress within the shared virtual timeline,
// matching the reference's per-unit stagger curve precisely.
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

        // Reference defaults: dimColor "rgba(255,255,255,0.15)", highlightColor
        // "#FFFFFF" — i.e. dim is just a low-opacity version of the SAME color
        // as the lit state, not a different (gray) hue. Deriving the lit color
        // from the widget's own computed color (rather than hardcoding white)
        // keeps this in step with every other Aurora effect's convention of
        // respecting the widget's configured styling.
        var litColor = getComputedStyle(textEl).color || 'rgb(255, 255, 255)';
        var m = litColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
        var r = m ? m[1] : 255, g = m ? m[2] : 255, b = m ? m[3] : 255;
        var dimColor = 'rgba(' + r + ', ' + g + ', ' + b + ', 0.15)';

        gsap.set(units, { opacity: 1, color: dimColor });

        // Per-unit tween duration + stagger, in seconds — reused from
        // Aurora's own generic Duration/Stagger controls (opts.duration,
        // opts.stagger, both ms) rather than the reference's hardcoded
        // 0.03s/char or 0.1s/word, so this stays consistent with every
        // other effect's controls instead of adding new ones.
        var dur = Math.max(0.05, opts.duration / 1000);
        var stagger = Math.max(0, opts.stagger / 1000);
        var totalDuration = dur + (units.length - 1) * stagger;

        // Rough stand-in for GSAP's default "power1.out" ease on the color
        // tween — a mild ease-out curve applied to each unit's own local
        // 0..1 progress before mixing the two colors.
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
