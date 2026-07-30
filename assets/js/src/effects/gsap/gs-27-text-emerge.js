import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Text Emerge — inspired by the "ink bleeding outward from the center"
// idea (units scale + blur in, staggered from the middle outward instead
// of the usual left-to-right sweep). Original concept explored via a
// pasted Originkit React/GSAP source; this is an independent
// reimplementation using Aurora's own split/units pipeline, not a copy of
// that code.
var effect = {
    id: 'gs-27',
    run: function (units, opts) {
        gsap.fromTo(units,
            { opacity: 0, scale: 0, filter: 'blur(6px)' },
            {
                opacity: 1,
                scale: 1,
                filter: 'blur(0px)',
                duration: Math.max(0.3, opts.duration / 1000),
                delay: opts.delay / 1000,
                ease: 'back.out(1.7)',
                stagger: { each: opts.stagger / 1000, from: 'center' },
            }
        );
    },
};

registerEffect(effect);
export default effect;
