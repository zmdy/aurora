import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Letter Roll — inspired by the idea of individual letters tumbling in
// independently, explored via a pasted Originkit React/Framer Motion
// source (a hover letter-swap component). Reimplemented as an original
// two-part effect built entirely with Aurora's generic split `units`
// (not that component's two-layer swap DOM):
//   1. Entrance — units roll up into place like odometer digits
//      (rotationX + yPercent), using Aurora's normal duration/delay/
//      stagger controls.
//   2. Hover bump — independent of the entrance, and independent of the
//      unrelated "Hover Scatter" option (core/engine.js's
//      attachHoverScatter): each unit tumbles up and re-settles in a
//      freshly shuffled random order every time the pointer enters.
var effect = {
    id: 'gs-31',
    run: function (units, opts, textEl) {
        gsap.set(units, { transformOrigin: '50% 100%', force3D: true });
        gsap.fromTo(units,
            { yPercent: 100, rotationX: -70, opacity: 0 },
            {
                yPercent: 0,
                rotationX: 0,
                opacity: 1,
                duration: Math.max(0.3, opts.duration / 1000),
                delay: opts.delay / 1000,
                ease: 'power4.out',
                stagger: opts.stagger / 1000,
            }
        );

        if (!textEl) return;

        // Replace any hover handler from a previous init instead of
        // stacking a second one on top of it.
        if (textEl._auroraRollHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraRollHover);
        }

        var busy = false;
        function onEnter() {
            if (busy || !units.length) return;
            busy = true;
            var order = units.map(function (u, i) { return i; });
            order.sort(function () { return Math.random() - 0.5; });
            var tl = gsap.timeline({ onComplete: function () { busy = false; } });
            order.forEach(function (idx, i) {
                var start = i * 0.035;
                tl.to(units[idx], { yPercent: -100, rotationX: 70, duration: 0.18, ease: 'power2.in' }, start)
                  .to(units[idx], { yPercent: 0, rotationX: 0, duration: 0.3, ease: 'back.out(2)' }, start + 0.18);
            });
        }

        textEl.addEventListener('mouseenter', onEnter);
        textEl._auroraRollHover = onEnter;
    },
};

registerEffect(effect);
export default effect;
