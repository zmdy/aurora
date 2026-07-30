import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-31 Letter Roll — same two-part idea (roll-up
// entrance + shuffled hover bump), driven by anime.animate() instead of
// GSAP timelines. The hover bump uses two separately-delayed calls per
// unit rather than a chained timeline, since it only needs fixed absolute
// delays, not sequencing logic.
var effect = {
    id: 'ml-49',
    run: function (units, opts, textEl) {
        units.forEach(function (u) { u.style.transformOrigin = '50% 100%'; });

        anime.animate(units, {
            translateY: ['100%', '0%'],
            rotateX: [-70, 0],
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outQuart',
        });

        if (!textEl) return;

        if (textEl._auroraRollHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraRollHover);
        }

        var busy = false;
        function onEnter() {
            if (busy || !units.length) return;
            busy = true;
            var order = units.map(function (u, i) { return i; });
            order.sort(function () { return Math.random() - 0.5; });
            order.forEach(function (idx, i) {
                var start = i * 35;
                anime.animate(units[idx], {
                    translateY: ['0%', '-100%'],
                    rotateX: [0, 70],
                    duration: 180,
                    delay: start,
                    ease: 'inQuad',
                });
                anime.animate(units[idx], {
                    translateY: ['-100%', '0%'],
                    rotateX: [70, 0],
                    duration: 300,
                    delay: start + 180,
                    ease: 'outBack',
                });
            });
            setTimeout(function () { busy = false; }, order.length * 35 + 480);
        }

        textEl.addEventListener('mouseenter', onEnter);
        textEl._auroraRollHover = onEnter;
    },
};

registerEffect(effect);
export default effect;
