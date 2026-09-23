var effect = {
    id: 'gradient-flow-text',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';
        var base = getComputedStyle(textEl).color || '#ffffff';

        var color1 = opts.gradientColor || '#7dd3fc';
        var color2 = opts.gradientColor2 || '#f0abfc';

        textEl.innerHTML = '';
        textEl.textContent = original;
        textEl.style.opacity = '0';
        textEl.style.backgroundImage = 'linear-gradient(90deg, ' + base + ', color-mix(in srgb, ' + base + ' 25%, ' + color1 + '), '
            + 'color-mix(in srgb, ' + base + ' 25%, ' + color2 + '), ' + base + ')';
        textEl.style.backgroundSize = '300% 100%';
        textEl.style.webkitBackgroundClip = 'text';
        textEl.style.backgroundClip = 'text';
        textEl.style.webkitTextFillColor = 'transparent';
        textEl.style.color = 'transparent';

        fx.animate(textEl, {
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: opts.delay,
            ease: 'outQuad',
        });

        if (fx.reducedMotion) {
            fx.set(textEl, { backgroundPositionX: '0%' });
            return;
        }

        fx.animate(textEl, {
            backgroundPositionX: ['0%', '300%'],
            duration: Math.max(1800, opts.duration * 3),
            delay: opts.delay,
            loop: true,
            ease: 'linear',
        });

        fx.onCleanup(function () {
            textEl.style.backgroundImage = '';
            textEl.style.backgroundSize = '';
            textEl.style.webkitBackgroundClip = '';
            textEl.style.backgroundClip = '';
            textEl.style.webkitTextFillColor = '';
        });
    },
};

export default effect;
