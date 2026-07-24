import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'gs-15',
    // The text container squeezes on like an old CRT powering up, then the
    // (already split) units blur-fade in and pick up a faint scanline glow.
    run: function (units, opts, textEl) {
        var tl = gsap.timeline({ delay: opts.delay / 1000 });
        tl.fromTo(textEl,
            { scaleY: 0.005, opacity: 0.6, transformOrigin: 'center center' },
            { scaleY: 1, opacity: 1, duration: 0.4, ease: 'power2.out' }
        )
        .fromTo(units,
            { opacity: 0, filter: 'blur(10px)' },
            {
                opacity: 1,
                filter: 'blur(0px)',
                duration: Math.max(0.3, opts.duration / 1000),
                stagger: opts.stagger / 1000,
            },
            '-=0.1'
        )
        .to(units, { textShadow: '0 0 10px currentColor', duration: 0.3 });
    },
};

registerEffect(effect);
export default effect;
