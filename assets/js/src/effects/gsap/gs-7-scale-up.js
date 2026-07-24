import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-7',
    run: function (units, opts) {
        gsap.fromTo(units,
            { scale: 0, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                scale: 1,
                opacity: 1,
                ease: 'back.out(1.7)',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
