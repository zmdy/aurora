import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-23',
    // Retro VHS tracking-glitch: a skewed, semi-transparent jitter settles
    // into a clean, in-place image after a couple of "tracking" hiccups.
    run: function (units, opts) {
        var tl = gsap.timeline({ delay: opts.delay / 1000 });
        tl.set(units, { opacity: 0.7, skewX: 5 })
          .to(units, { opacity: 1, duration: 0.01, stagger: opts.stagger / 1000 })
          .to(units, { x: -10, skewX: -8, duration: 0.06, repeat: 4, yoyo: true })
          .to(units, { x: 0, skewX: 0, duration: 0.3 })
          .to(units, { x: 5, opacity: 0.6, duration: 0.04 }, '+=0.3')
          .to(units, { x: 0, opacity: 1, duration: 0.2 });
    },
};

registerEffect(effect);
export default effect;
