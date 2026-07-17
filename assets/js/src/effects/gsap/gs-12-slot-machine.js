/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-12',
    run: function (units, opts) {
        gsap.fromTo(units,
            { yPercent: -500, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                yPercent: 0,
                opacity: 1,
                ease: 'power4.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
