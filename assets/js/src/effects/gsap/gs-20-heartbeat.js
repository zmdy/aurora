import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-20',
    // Rhythmic double-pulse, applied uniformly (no stagger) so the whole
    // text pulses together like a heartbeat rather than cascading per unit.
    run: function (units, opts) {
        var tl = gsap.timeline({ delay: opts.delay / 1000 });
        tl.set(units, { opacity: 0 })
          .to(units, { opacity: 1, duration: Math.max(0.2, opts.duration / 1000 * 0.3), ease: 'power2.out' })
          .to(units, { scale: 1.15, duration: 0.1, ease: 'power2.in' })
          .to(units, { scale: 1, duration: 0.1 })
          .to(units, { scale: 1.25, duration: 0.12 })
          .to(units, { scale: 1, duration: 0.3, ease: 'power2.out' });
    },
};

registerEffect(effect);
export default effect;
