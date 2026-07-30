import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-28 Stagger Flip 3D — identical pivot + cube + two-
// face DOM (see gs-28's header comment for the exact geometry and why
// the pivot's static translateZ(-half) matters), driven by anime.animate()
// instead of GSAP.
var effect = {
    id: 'ml-46',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var half = Math.max(6, parseFloat(getComputedStyle(textEl).fontSize) * 0.55);

        var cubes = [];
        var words = original.split(' ');

        words.forEach(function (word, wi) {
            var wordWrap = document.createElement('span');
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

        anime.animate(cubes, {
            rotateX: [90, 0],
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outBack',
        });

        if (!textEl || !cubes.length) return;

        if (textEl._auroraFlipHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraFlipHover);
        }

        var busy = false;
        function onEnter() {
            if (busy) return;
            busy = true;
            cubes.forEach(function (cube, i) {
                var start = i * 25;
                anime.animate(cube, { rotateX: [0, 90], duration: 220, delay: start, ease: 'inQuad' });
                anime.animate(cube, { rotateX: 0, duration: 0, delay: start + 220 });
            });
            setTimeout(function () { busy = false; }, cubes.length * 25 + 260);
        }

        textEl.addEventListener('mouseenter', onEnter);
        textEl._auroraFlipHover = onEnter;
    },
};

registerEffect(effect);
export default effect;
