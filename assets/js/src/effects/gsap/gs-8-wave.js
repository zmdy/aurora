import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-8',
    run: function (units, opts) {
        gsap.fromTo(units,
            { y: function (i) { return Math.sin(i * 0.9) * 45; }, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                y: 0,
                opacity: 1,
                ease: 'power2.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
