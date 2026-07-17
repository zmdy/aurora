/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-14',
    // Letters flicker to life one by one, then settle with a soft glow.
    // Uses `currentColor` for the glow so it adapts to the widget's own
    // text color instead of hardcoding one.
    run: function (units, opts) {
        var tl = gsap.timeline({ delay: opts.delay / 1000 });
        tl.set(units, { opacity: 0 })
          .to(units, { opacity: 1, duration: 0.08, stagger: opts.stagger / 1000 })
          .to(units, { opacity: 0.2, duration: 0.05 })
          .to(units, { opacity: 1, duration: 0.08 })
          .to(units, { opacity: 0, duration: 0.05 })
          .to(units, { opacity: 1, textShadow: '0 0 20px currentColor', duration: Math.max(0.2, opts.duration / 1000 * 0.4) });
    },
};

registerEffect(effect);
export default effect;
