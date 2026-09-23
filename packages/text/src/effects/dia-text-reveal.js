var HIDDEN_CLIP = 'polygon(0% 0%, 0% 0%, -20% 100%, -20% 100%)';
var VISIBLE_CLIP = 'polygon(0% 0%, 120% 0%, 100% 100%, -20% 100%)';

var effect = {
    id: 'dia-text-reveal',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        // The clip-path animates on this inner wrapper, never on `textEl`
        // itself. `textEl` is the exact element the module's own
        // IntersectionObserver watches for the scroll trigger; a clip-path
        // whose polygon points go outside 0-100% (needed here for a clean
        // diagonal wipe) changes that element's painted/ink bounds every
        // animation frame, which was enough to make Chrome's scroll
        // anchoring nudge the page a fraction of a pixel each frame --
        // just enough to flicker the observed element in and out of the
        // intersection threshold, which reruns prepare()/run() forever
        // (visible as the page scrolling itself and the text staying
        // permanently hidden). Keeping the clipped node separate from the
        // observed node removes the feedback loop entirely.
        var wrap = document.createElement('span');
        wrap.style.cssText = 'display:inline-block;';
        wrap.textContent = original;
        textEl.appendChild(wrap);

        if (fx.reducedMotion) {
            fx.set(wrap, { clipPath: 'none' });
            return;
        }

        fx.set(wrap, { clipPath: HIDDEN_CLIP });
        fx.animate(wrap, {
            clipPath: VISIBLE_CLIP,
            duration: Math.max(500, opts.duration),
            delay: opts.delay,
            ease: 'inOutQuad',
            onComplete: function () { wrap.style.clipPath = 'none'; },
        });

        fx.onCleanup(function () { wrap.style.clipPath = ''; });
    },
};

export default effect;
