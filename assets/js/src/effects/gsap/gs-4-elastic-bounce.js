/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-4',
    run: function (units, opts) {
        gsap.fromTo(units,
            { y: 60, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                y: 0,
                opacity: 1,
                ease: 'elastic.out(1, 0.4)',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
