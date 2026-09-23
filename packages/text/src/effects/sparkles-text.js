var SPARKLE_COUNT = 10;

// The exact sparkle shape MagicUI's SparklesText renders (a 4-pointed
// "twinkle" star), credited there to @simonlejeune. Reused verbatim so
// this reimplementation looks identical, just driven by anime.js instead
// of Framer Motion.
var SPARKLE_PATH = 'M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 '
    + '12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 '
    + '10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 '
    + '11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 '
    + '8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 '
    + '0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 '
    + '8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z';

var SVG_NS = 'http://www.w3.org/2000/svg';

function sparkleSvg(fx, wrap, color1, color2) {
    var size = fx.utils.random(12, 22);
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 21 21');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;pointer-events:none;width:' + size + 'px;height:' + size + 'px;'
        + 'left:' + fx.utils.random(-6, 100) + '%;top:' + fx.utils.random(-25, 100) + '%;'
        + 'transform:translate(-50%,-50%) scale(0);opacity:0;will-change:transform,opacity;';

    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', SPARKLE_PATH);
    path.setAttribute('fill', Math.random() < 0.5 ? color1 : color2);
    svg.appendChild(path);
    wrap.appendChild(svg);
    return svg;
}

var effect = {
    id: 'sparkles-text',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var color1 = opts.sparkleColor || '#9E7AFF';
        var color2 = opts.sparkleColor2 || '#FE8BBB';

        var wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative;display:inline-block;';
        var label = document.createElement('span');
        label.textContent = original;
        label.style.cssText = 'position:relative;';
        wrap.appendChild(label);
        textEl.appendChild(wrap);

        fx.animate(label, {
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: opts.delay,
            ease: 'outQuad',
        });

        if (fx.reducedMotion) return;

        for (var i = 0; i < SPARKLE_COUNT; i++) {
            var sparkle = sparkleSvg(fx, wrap, color1, color2);
            // Pop in, hold near full size, fade out — the same beat as
            // MagicUI's random-lifespan sparkles, without the per-frame
            // decay loop (anime.js keyframes cover it in one call).
            fx.animate(sparkle, {
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0],
                rotate: [0, fx.utils.random(-40, 40)],
                duration: fx.utils.random(900, 1700),
                delay: opts.delay + fx.utils.random(0, 1800),
                loop: true,
                ease: 'inOutSine',
            });
        }
    },
};

export default effect;
