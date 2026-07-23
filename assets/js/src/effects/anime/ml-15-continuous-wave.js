/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-15',
    // Continuous Wave: unlike every other effect here, this one never
    // settles — recreates the "wavy" example from Motion.dev's splitText
    // docs (a Motion+ paid feature) using the free Anime.js already
    // bundled instead. Each unit bobs up and down forever, staggered by
    // index so the motion ripples across the text.
    // NOTE: because it's a perpetual loop, "Replay on re-entering
    // viewport" doesn't fully stop it while scrolled out of view — the
    // loop keeps ticking in the background (harmless: opacity is reset to
    // 0 by reset(), so nothing is visible, just a small amount of wasted
    // CPU). Fine for the common case (Trigger: On Page Load, no replay
    // needed since it never stops anyway).
    run: function (units, opts, textEl) {
        // Clear previous animation if any
        if (textEl && textEl._auroraWaveAnim) {
            if (typeof textEl._auroraWaveAnim.pause === 'function') {
                textEl._auroraWaveAnim.pause();
            }
            textEl._auroraWaveAnim = null;
        }

        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            anime.animate(units, {
                opacity: [0, 1],
                duration: 0,
                delay: 0,
                ease: 'linear'
            });
            return;
        }

        // Two SEPARATE calls on purpose: opacity fades in once (a normal
        // entrance), while translateY loops forever. Bundling both into
        // one looping tween would make opacity alternate too, so the text
        // would fade out and back in forever instead of just bobbing in
        // place — anime.js tracks transform channels (translateY here)
        // independently of other properties (opacity), so these two
        // calls don't fight over the same value.
        anime.animate(units, {
            opacity: [0, 1],
            duration: Math.max(400, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outSine',
        });
        var anim = anime.animate(units, {
            translateY: [0, -14],
            duration: Math.max(400, opts.duration / 2),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            loop: true,
            alternate: true,
            ease: 'inOutSine',
        });

        if (textEl) {
            textEl._auroraWaveAnim = anim;
        }
    },
};

registerEffect(effect);
export default effect;
