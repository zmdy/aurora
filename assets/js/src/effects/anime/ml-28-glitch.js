import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-10 Glitch (see ml-24's header comment). GSAP builds
// this as a gsap.timeline(); Anime.js v4 has createTimeline() too, but we
// sequence with setTimeout instead (same proven approach as the hand-rolled
// scramble/typewriter effects in core/helpers.js) to avoid depending on
// timeline-chaining behavior we haven't exercised elsewhere in this file
// set.
var effect = {
    id: 'ml-28',
    run: function (units, opts) {
        var settleAt = opts.delay + units.length * opts.stagger + 40;

        anime.animate(units, {
            opacity: [0, 1],
            translateX: function () { return (Math.random() - 0.5) * 30; },
            duration: 40,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'linear',
        });

        setTimeout(function () {
            anime.animate(units, {
                translateX: function () { return (Math.random() - 0.5) * 15; },
                duration: 40,
                ease: 'linear',
            });
        }, settleAt);

        setTimeout(function () {
            anime.animate(units, {
                translateX: function () { return (Math.random() - 0.5) * 8; },
                duration: 40,
                ease: 'linear',
            });
        }, settleAt + 40);

        setTimeout(function () {
            anime.animate(units, {
                translateX: 0,
                duration: Math.max(150, opts.duration * 0.6),
                ease: 'outQuad',
            });
        }, settleAt + 80);
    },
};

registerEffect(effect);
export default effect;
