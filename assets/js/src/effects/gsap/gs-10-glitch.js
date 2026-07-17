/* global gsap */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-10',
    run: function (units, opts) {
        var tl = gsap.timeline({ delay: opts.delay / 1000 });

        tl.set(units, { opacity: 0 })
          .to(units, {
              duration: 0.04,
              opacity: 1,
              x: function () { return (Math.random() - 0.5) * 30; },
              stagger: opts.stagger / 1000,
          })
          .to(units, {
              duration: 0.04,
              x: function () { return (Math.random() - 0.5) * 15; },
          })
          .to(units, {
              duration: 0.04,
              x: function () { return (Math.random() - 0.5) * 8; },
          })
          .to(units, {
              duration: opts.duration / 1000 * 0.6,
              x: 0,
              ease: 'power2.out',
          });
    },
};

registerEffect(effect);
export default effect;
