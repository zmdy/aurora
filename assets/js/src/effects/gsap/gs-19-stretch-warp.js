import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-19',
    run: function (units, opts) {
        gsap.fromTo(units,
            { scaleX: 4, scaleY: 0.2, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                ease: 'elastic.out(1, 0.4)',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
