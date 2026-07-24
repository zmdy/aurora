import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-2',
    run: function (units, opts) {
        units.forEach(function (u) {
            u.parentElement.style.overflow = 'hidden';
            u.style.display = 'inline-block';
        });
        gsap.fromTo(units,
            { y: '110%', opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                y: '0%',
                opacity: 1,
                ease: 'power4.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
