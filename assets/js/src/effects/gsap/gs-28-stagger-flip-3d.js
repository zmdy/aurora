import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Stagger Flip 3D — matches the Originkit reference's exact cube math AND
// its actual trigger behavior (two earlier attempts at this got both
// wrong — see below).
//
// Cube geometry, per character, translated from the reference's single
// combined `transform: translateZ(-0.5lh) rotateX(θ)` CSS string into
// three nested elements so GSAP's native `rotationX` property can drive
// the rotation directly instead of needing a hand-written transform
// string:
//
//   pivot (static, never animated) — transform: translateZ(-half)
//     cube (animated: rotationX 0..90 via GSAP)
//       front face  — transform: translateZ(half)                (own rotation 0)
//       second face — transform: rotateX(-90deg) translateZ(half) (own rotation -90)
//
// `pivot`'s constant translateZ(-half) plus `cube`'s animated rotateX
// compose (parent-then-child) into exactly the same matrix as the
// reference's one-element "translateZ(-half) rotateX(θ)" — this is what
// makes the rotation pivot around the hinge BETWEEN the two faces instead
// of around the wrong point.
//
// At cube rotationX=0: front face's own rotation (0) + cube's rotation
// (0) = flat, facing the viewer. Second face's own rotation (-90) + cube's
// rotation (0) = -90, edge-on, hidden. At cube rotationX=90: front face
// inherits +90 (edge-on, rotated away) while second face's own -90 +
// cube's +90 cancel to 0 (flat, facing the viewer) — the two faces swap
// which one is forward, like a die rolling onto its next face.
//
// Trigger behavior: the reference has no separate "reveal" animation for
// mount/scroll at all — `animation === "enter"` just calls the SAME
// playAnimation() used for hover, once. Text is visible at rest the whole
// time; playAnimation() rolls each character to the second face then
// snaps back instantly (duration 0), staggered per character. An earlier
// version of this file invented a distinct opacity/rotation "reveal" for
// the entrance trigger that doesn't exist in the reference — that's why
// the first play looked different from every hover afterward. Fixed by
// using one `play()` function for both triggers; the only difference is
// the entrance honors the "Initial delay" control before starting, hover
// doesn't.
//
// Self-managed: builds its own per-character cube DOM instead of using
// the generic split `units` (a flat span can't have two perpendicular 3D
// faces).
var effect = {
    id: 'gs-28',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        // Half the face depth — how far each face sits from the cube's
        // pivot. Derived from font-size rather than the CSS `lh` unit for
        // wider browser support; ~0.55x a typical font-size approximates
        // half a line box closely enough for this effect.
        var half = Math.max(6, parseFloat(getComputedStyle(textEl).fontSize) * 0.55);

        var cubes = [];
        var words = original.split(' ');

        words.forEach(function (word, wi) {
            var wordWrap = document.createElement('span');
            // Perspective lives on the pivots' DIRECT parent — CSS 3D
            // perspective only reaches immediate children, so setting it
            // on textEl (a grandparent once words are wrapped) wouldn't
            // give the pivots any depth.
            wordWrap.style.cssText = 'display:inline-block;white-space:nowrap;perspective:800px;';

            Array.from(word).forEach(function (ch) {
                var pivot = document.createElement('span');
                pivot.style.cssText = 'display:inline-block;position:relative;transform-style:preserve-3d;'
                    + 'transform:translateZ(' + (-half) + 'px);-webkit-transform:translateZ(' + (-half) + 'px);';

                var cube = document.createElement('span');
                cube.className = 'aurora-flip-cube';
                cube.style.cssText = 'display:inline-block;position:relative;transform-style:preserve-3d;';

                var front = document.createElement('span');
                front.textContent = ch;
                front.style.cssText = 'display:inline-block;position:relative;backface-visibility:hidden;-webkit-backface-visibility:hidden;'
                    + 'transform:translateZ(' + half + 'px);-webkit-transform:translateZ(' + half + 'px);';

                var second = document.createElement('span');
                second.textContent = ch;
                second.style.cssText = 'display:inline-block;position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;'
                    + 'transform:rotateX(-90deg) translateZ(' + half + 'px);-webkit-transform:rotateX(-90deg) translateZ(' + half + 'px);';

                cube.appendChild(front);
                cube.appendChild(second);
                pivot.appendChild(cube);
                wordWrap.appendChild(pivot);
                cubes.push(cube);
            });

            textEl.appendChild(wordWrap);

            if (wi < words.length - 1) {
                var space = document.createElement('span');
                space.style.display = 'inline-block';
                space.innerHTML = '&nbsp;';
                textEl.appendChild(space);
            }
        });

        if (!cubes.length) return;

        // Replace any handler/timeline left over from a previous init
        // instead of stacking a second one on top of it.
        if (textEl._auroraFlipHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraFlipHover);
        }
        if (textEl._auroraFlipTimeline) {
            textEl._auroraFlipTimeline.kill();
        }

        var busy = false;

        // The one and only animation: roll each cube to the second face,
        // then snap it back to resting the instant its own roll finishes
        // — staggered per character. Used for both the entrance (once,
        // honoring the "Initial delay" control) and every hover
        // afterward (no initial delay, so it responds immediately).
        function play(withInitialDelay) {
            if (busy) return;
            busy = true;
            var tl = gsap.timeline({ onComplete: function () { busy = false; } });
            var base = withInitialDelay ? opts.delay / 1000 : 0;
            var duration = Math.max(0.2, opts.duration / 1000);
            var stagger = Math.max(0, opts.stagger / 1000);
            cubes.forEach(function (cube, i) {
                var at = base + i * stagger;
                tl.to(cube, { rotationX: 90, duration: duration, ease: 'power2.in' }, at)
                  .set(cube, { rotationX: 0 });
            });
            textEl._auroraFlipTimeline = tl;
        }

        play(true);

        function onEnter() { play(false); }
        textEl.addEventListener('mouseenter', onEnter);
        textEl._auroraFlipHover = onEnter;
    },
};

registerEffect(effect);
export default effect;
