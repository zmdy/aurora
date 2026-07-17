/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-18',
    run: function (units, opts) {
        gsap.set(units, { transformPerspective: 800, transformOrigin: 'left center' });
        gsap.fromTo(units,
            { rotationY: -90, rotationX: 45, opacity: 0, scale: 0.5 },
            {
                duration: opts.duration / 1000,
                delay: opts.delay / 1000,
                rotationY: 0,
                rotationX: 0,
                opacity: 1,
                scale: 1,
                ease: 'power3.out',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
