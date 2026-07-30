import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-28 Stagger Flip 3D — identical two-face cube DOM,
// driven by anime.animate() instead of GSAP.
var effect = {
    id: 'ml-46',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var cubes = [];
        var words = original.split(' ');

        words.forEach(function (word, wi) {
            var wordWrap = document.createElement('span');
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

        anime.animate(cubes, {
            rotateX: [-180, 0],
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outBack',
        });
    },
};

registerEffect(effect);
export default effect;
