import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Letter Swap — inspired by the idea of text whose letters each swap
// vertically for a duplicate copy on hover, in a freshly shuffled order,
// explored via a pasted Originkit React/Framer Motion source (a two-layer
// letter-swap component). Reimplemented from scratch for Aurora: the
// entrance is a simple staggered reveal, but the hover swap itself needs
// a duplicate letter stacked behind each character — a flat span (what
// Aurora's generic split `units` produces) can't hold that second layer —
// so this effect is self-managed and builds its own two-layer DOM instead
// of reusing `units`.
//
// Hover behavior: entering slides every letter up and out while its
// duplicate slides up into view, in a freshly shuffled order; leaving
// reverses both, in a freshly reshuffled order. Each direction kills
// whatever tweens are still running from the opposite direction before
// starting its own, so fast in/out hovering always settles cleanly
// instead of the two directions animating the same letters at once.
var effect = {
    id: 'gs-33',
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
                dup.style.cssText = 'display:inline-block;position:absolute;left:0;top:0;';

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

        // Duplicate layer rests one full line below its main letter until
        // swapped in — set via GSAP (not a raw inline transform string) so
        // GSAP's internal transform cache starts from a value it actually
        // wrote itself.
        gsap.set(dups, { yPercent: 100 });

        // Entrance: a modest staggered reveal of the slot structure,
        // independent of the hover swap below.
        var entranceDuration = Math.max(0.3, opts.duration / 1000);
        var entranceDelay = opts.delay / 1000;
        var entranceStagger = opts.stagger / 1000;
        gsap.fromTo(pairs.map(function (p) { return p.slot; }),
            { opacity: 0, y: 12 },
            {
                opacity: 1,
                y: 0,
                duration: entranceDuration,
                delay: entranceDelay,
                ease: 'power2.out',
                stagger: entranceStagger,
            }
        );

        // Replace any handlers/timers left over from a previous init
        // instead of stacking a second set on top of them.
        if (textEl._auroraSwapHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraSwapHover.enter);
            textEl.removeEventListener('mouseleave', textEl._auroraSwapHover.leave);
            textEl._auroraSwapHover.pause();
        }

        var activeTweens = [];
        var autoDemoTimers = [];

        function swap(toDup) {
            activeTweens.forEach(function (t) { if (t) t.kill(); });

            // A fresh shuffle every time — `rank[i]` is the play position
            // (0..N-1) assigned to letter `i` for this particular swap.
            var order = pairs.map(function (_, i) { return i; });
            order.sort(function () { return Math.random() - 0.5; });
            var rank = new Array(pairs.length);
            order.forEach(function (idx, pos) { rank[idx] = pos; });

            function staggerFn(i) { return rank[i] * 0.03; }

            activeTweens = [
                gsap.to(mains, { yPercent: toDup ? -100 : 0, duration: 0.32, ease: 'power3.inOut', stagger: staggerFn }),
                gsap.to(dups, { yPercent: toDup ? 0 : 100, duration: 0.32, ease: 'power3.inOut', stagger: staggerFn }),
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
        var entranceEndMs = (entranceDelay + (pairs.length - 1) * entranceStagger + entranceDuration) * 1000;
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
                activeTweens.forEach(function (t) { if (t && typeof t.pause === 'function') t.pause(); });
                autoDemoTimers.forEach(function (id) { clearTimeout(id); });
                autoDemoTimers = [];
            },
        };
    },
};

registerEffect(effect);
export default effect;
