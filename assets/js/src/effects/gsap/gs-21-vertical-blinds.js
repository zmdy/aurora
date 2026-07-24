import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-21',
    run: function (units, opts) {
        gsap.set(units, { transformOrigin: 'center' });
        gsap.fromTo(units,
            { scaleX: 0, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                scaleX: 1,
                opacity: 1,
                ease: 'power2.out',
                stagger: { each: opts.stagger / 1000, from: 'edges' },
            }
        );
    },
};

registerEffect(effect);
export default effect;
