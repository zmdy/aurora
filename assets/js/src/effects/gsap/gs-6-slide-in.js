import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-6',
    run: function (units, opts) {
        gsap.fromTo(units,
            { x: -80, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                x: 0,
                opacity: 1,
                ease: 'power3.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
