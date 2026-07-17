/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-9',
    run: function (units, opts) {
        gsap.fromTo(units,
            { y: -80, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                y: 0,
                opacity: 1,
                ease: 'bounce.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
