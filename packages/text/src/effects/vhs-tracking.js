var effect = {
    id: 'vhs-tracking',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) {
            u.style.opacity = '0.7';
            u.style.transform = 'skewX(5deg)';
        });

        fx.animate(units, {
            opacity: [0.7, 1],
            duration: 10,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'linear',
        });

        var jitterAt = opts.delay + units.length * opts.stagger + 10;
        fx.animate(units, {
            translateX: [0, -10, 0],
            skewX: [5, -8, 0],
            duration: 60 * 5,
            delay: jitterAt,
            loop: 5,
            alternate: true,
            ease: 'linear',
        });

        fx.setTimeout(function () {
            fx.animate(units, { translateX: 0, skewX: 0, opacity: 1, duration: 300 });
            fx.setTimeout(function () {
                fx.animate(units, { translateX: [0, 5, 0], opacity: [1, 0.6, 1], duration: 240, ease: 'linear' });
            }, 500);
        }, jitterAt + 60 * 5);
    },
};

export default effect;
