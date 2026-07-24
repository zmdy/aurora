import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-22',
    // Two-phase "stamp": slams in oversized and rotated, then settles with
    // an elastic bounce — distinct from a plain scale-in thanks to the
    // slam-then-settle timing.
    run: function (units, opts) {
        var tl = gsap.timeline({ delay: opts.delay / 1000 });
        tl.fromTo(units,
            { scale: 4, rotation: -15, opacity: 0 },
            {
                scale: 1.15,
                rotation: 0,
                opacity: 1,
                duration: 0.3,
                ease: 'power4.in',
                stagger: opts.stagger / 1000,
            }
        ).to(units, {
            scale: 1,
            duration: Math.max(0.3, opts.duration / 1000 * 0.6),
            ease: 'elastic.out(1, 0.4)',
        });
    },
};

registerEffect(effect);
export default effect;
