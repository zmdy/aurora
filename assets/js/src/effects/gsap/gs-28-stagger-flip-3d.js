import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Stagger Flip 3D — inspired by the idea of a per-character "flip card"
// (two opposite faces, backface-visibility hidden, the whole cube
// rotating to reveal the front) explored via a pasted Originkit
// React/Framer Motion source. Reimplemented from scratch for Aurora: a
// genuine two-face cube per character (unlike gs-5/gs-18's flat single-span
// rotation) built and driven entirely with GSAP, ignoring the original
// component's code.
//
// Self-managed: builds its own per-character cube DOM instead of using the
// generic split `units` (a flat span can't have two opposite 3D faces).
var effect = {
    id: 'gs-28',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var cubes = [];
        var words = original.split(' ');

        words.forEach(function (word, wi) {
            var wordWrap = document.createElement('span');
            // Perspective lives on the cubes' DIRECT parent — CSS 3D
            // perspective only reaches immediate children, so setting it on
            // textEl (a grandparent once words are wrapped) wouldn't give
            // the cubes any depth.
            wordWrap.style.cssText = 'display:inline-block;white-space:nowrap;perspective:900px;';

            Array.from(word).forEach(function (ch) {
                var cube = document.createElement('span');
                cube.className = 'aurora-flip-cube';
                cube.style.cssText = 'display:inline-block;position:relative;transform-style:preserve-3d;';

                var front = document.createElement('span');
                front.textContent = ch;
                front.style.cssText = 'display:inline-block;backface-visibility:hidden;-webkit-backface-visibility:hidden;';

                var back = document.createElement('span');
                back.textContent = ch;
                back.style.cssText = 'display:inline-block;position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateX(180deg);-webkit-transform:rotateX(180deg);';

                cube.appendChild(front);
                cube.appendChild(back);
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

        gsap.fromTo(cubes,
            { rotationX: -180, opacity: 0 },
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
