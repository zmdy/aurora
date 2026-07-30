import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Stagger Flip 3D — inspired by the idea of a per-character cube whose
// two perpendicular faces (front + top, joined at a 90° edge) roll to
// swap which one faces the viewer, explored via a pasted Originkit
// React/Framer Motion source. Reimplemented from scratch for Aurora: a
// genuine two-face cube per character, adjusted from an earlier version
// of this effect that used two OPPOSITE faces (front + back, 180° apart,
// like a coin flip) — that's a different, flatter illusion than the
// reference's actual cube-roll, where the second face is mounted
// perpendicular to the front (rotateX(90deg) + translateZ) so that
// rotating the whole cube -90° brings it around like a die rolling onto
// its next face, rather than a card flipping to its backside.
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
        // center pivot. Derived from font-size rather than the CSS `lh`
        // unit for wider browser support; ~0.55x a typical font-size
        // approximates half a line box closely enough for this effect.
        var half = Math.max(6, parseFloat(getComputedStyle(textEl).fontSize) * 0.55);

        var cubes = [];
        var words = original.split(' ');

        words.forEach(function (word, wi) {
            var wordWrap = document.createElement('span');
            // Perspective lives on the cubes' DIRECT parent — CSS 3D
            // perspective only reaches immediate children, so setting it
            // on textEl (a grandparent once words are wrapped) wouldn't
            // give the cubes any depth.
            wordWrap.style.cssText = 'display:inline-block;white-space:nowrap;perspective:900px;';

            Array.from(word).forEach(function (ch) {
                var cube = document.createElement('span');
                cube.className = 'aurora-flip-cube';
                cube.style.cssText = 'display:inline-block;position:relative;transform-style:preserve-3d;';

                // Front face — sits `half` in front of the cube's pivot.
                var front = document.createElement('span');
                front.textContent = ch;
                front.style.cssText = 'display:inline-block;backface-visibility:hidden;-webkit-backface-visibility:hidden;'
                    + 'transform:translateZ(' + half + 'px);-webkit-transform:translateZ(' + half + 'px);';

                // Top face — rotated 90° then pushed out by the same
                // `half`, so it sits at a right angle to the front face:
                // rolling the cube -90° around X brings THIS face forward.
                var top = document.createElement('span');
                top.textContent = ch;
                top.style.cssText = 'display:inline-block;position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;'
                    + 'transform:rotateX(90deg) translateZ(' + half + 'px);-webkit-transform:rotateX(90deg) translateZ(' + half + 'px);';

                cube.appendChild(front);
                cube.appendChild(top);
                wordWrap.appendChild(cube);
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

        // Entrance: each cube rolls in FROM the top face (rotationX 90 —
        // showing the perpendicular face, rotated away from the reader)
        // TO the front face at rest (rotationX 0) — a genuine roll onto
        // the resting face, not a 180° flip from directly behind it.
        gsap.fromTo(cubes,
            { rotationX: 90, opacity: 0 },
            {
                rotationX: 0,
                opacity: 1,
                duration: Math.max(0.3, opts.duration / 1000),
                delay: opts.delay / 1000,
                ease: 'back.out(1.6)',
                stagger: opts.stagger / 1000,
            }
        );
    },
};

registerEffect(effect);
export default effect;
