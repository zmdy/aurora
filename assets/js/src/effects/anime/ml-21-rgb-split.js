/* global anime */
import { registerEffect } from '../../core/registry.js';

var effect = {
    id: 'ml-21',
    // Chromatic-aberration converge: two colored copies of the text
    // (red/cyan) start offset sideways and slide back onto the base copy.
    // Builds its own overlay DOM rather than the generic per-unit split
    // (a "unit" doesn't map to this effect's 3-layer structure).
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.position = 'relative';
        textEl.style.opacity = '1';

        var base = document.createElement('span');
        base.textContent = original;
        base.style.position = 'relative';
        textEl.appendChild(base);

        var layerEls = [];
        [
            { color: '#ff2b4d', dir: -1 },
            { color: '#00c8ff', dir: 1 },
        ].forEach(function (cfg) {
            var layer = document.createElement('span');
            layer.textContent = original;
            layer.setAttribute('aria-hidden', 'true');
            layer.style.cssText = 'position:absolute;left:0;top:0;width:100%;color:' + cfg.color + ';mix-blend-mode:screen;pointer-events:none;';
            textEl.appendChild(layer);
            layerEls.push({ el: layer, dir: cfg.dir });
        });

        anime.animate([base].concat(layerEls.map(function (l) { return l.el; })), {
            opacity: [0, 1],
            duration: opts.duration,
            delay: opts.delay,
            ease: 'outExpo',
        });
        layerEls.forEach(function (l) {
            anime.animate(l.el, {
                translateX: [l.dir * 14, 0],
                duration: opts.duration,
                delay: opts.delay,
                ease: 'outExpo',
            });
        });
    },
};

registerEffect(effect);
export default effect;
