import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-33 Letter Swap — identical two-layer per-character
// DOM and shuffled-order hover swap, driven by anime.animate() instead of
// GSAP tweens/stagger.
var effect = {
    id: 'ml-51',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText || textEl.textContent || '';
        textEl.innerHTML = '';

        var pairs = [];
        var words = original.split(' ');

        words.forEach(function (word, wi) {
            Array.from(word).forEach(function (ch) {
                var slot = document.createElement('span');
                slot.className = 'aurora-swap-slot';
                slot.style.cssText = 'display:inline-block;position:relative;overflow:hidden;vertical-align:top;';

                var main = document.createElement('span');
                main.textContent = ch;
                main.style.cssText = 'display:inline-block;';

                var dup = document.createElement('span');
                dup.textContent = ch;
                dup.setAttribute('aria-hidden', 'true');
                dup.style.cssText = 'display:inline-block;position:absolute;left:0;top:0;transform:translateY(100%);';

                slot.appendChild(main);
                slot.appendChild(dup);
                textEl.appendChild(slot);
                pairs.push({ slot: slot, main: main, dup: dup });
            });

            if (wi < words.length - 1) {
                var space = document.createElement('span');
                space.style.display = 'inline-block';
                space.innerHTML = '&nbsp;';
                textEl.appendChild(space);
            }
        });

        textEl.style.opacity = '1';

        if (!pairs.length) return;

        var mains = pairs.map(function (p) { return p.main; });
        var dups = pairs.map(function (p) { return p.dup; });

        // Replace any handlers/timers left over from a previous init
        // instead of stacking a second set on top of them.
        if (textEl._auroraSwapHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraSwapHover.enter);
            textEl.removeEventListener('mouseleave', textEl._auroraSwapHover.leave);
            textEl._auroraSwapHover.pause();
        }

        // Entrance: a modest staggered reveal of the slot structure,
        // independent of the hover swap below.
        var entranceDuration = Math.max(300, opts.duration);
        anime.animate(pairs.map(function (p) { return p.slot; }), {
            opacity: [0, 1],
            translateY: [12, 0],
            duration: entranceDuration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outQuad',
        });

        var activeInstances = [];
        var autoDemoTimers = [];

        function swap(toDup) {
            activeInstances.forEach(function (inst) { if (inst && typeof inst.pause === 'function') inst.pause(); });

            var order = pairs.map(function (_, i) { return i; });
            order.sort(function () { return Math.random() - 0.5; });
            var rank = new Array(pairs.length);
            order.forEach(function (idx, pos) { rank[idx] = pos; });

            function delayFn(el, i) { return rank[i] * 30; }

            activeInstances = [
                anime.animate(mains, { translateY: toDup ? '-100%' : '0%', duration: 320, delay: delayFn, ease: 'inOutCubic' }),
                anime.animate(dups, { translateY: toDup ? '0%' : '100%', duration: 320, delay: delayFn, ease: 'inOutCubic' }),
            ];
        }

        // Without this, the swap — the entire point of "Letter Swap" — was
        // only ever visible on hover: the entrance above just fades the
        // slot structure in and settles, so on the real frontend, in the
        // Elementor/Playground preview, and in the effects grid it looked
        // like a plain reveal until a pointer happened to cross it. Every
        // other effect here demonstrates its own signature motion
        // automatically; hover is always an extra, never the only way to
        // see it. Auto-play one swap-in/hold/swap-out cycle right after
        // the entrance settles, matching that same contract, without
        // touching the hover/leave behavior below.
        var entranceEndMs = opts.delay + (pairs.length - 1) * opts.stagger + entranceDuration;
        autoDemoTimers.push(setTimeout(function () { swap(true); }, entranceEndMs + 250));
        autoDemoTimers.push(setTimeout(function () { swap(false); }, entranceEndMs + 250 + 900));

        var onEnter = function () { swap(true); };
        var onLeave = function () { swap(false); };
        textEl.addEventListener('mouseenter', onEnter);
        textEl.addEventListener('mouseleave', onLeave);
        textEl._auroraSwapHover = {
            enter: onEnter,
            leave: onLeave,
            pause: function () {
                activeInstances.forEach(function (inst) { if (inst && typeof inst.pause === 'function') inst.pause(); });
                autoDemoTimers.forEach(function (id) { clearTimeout(id); });
                autoDemoTimers = [];
            },
        };
    },
};

registerEffect(effect);
export default effect;
