/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-13',
    run: function (units, opts) {
        gsap.fromTo(units,
            { rotation: 720, scale: 0, opacity: 0 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                rotation: 0,
                scale: 1,
                opacity: 1,
                ease: 'power4.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
