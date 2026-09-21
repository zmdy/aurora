var effect = {
    id: 'neon-flicker',
    run: function (units, opts, textEl, fx) {
        var t = opts.delay;
        units.forEach(function (u) { u.style.opacity = '0'; });

        fx.animate(units, {
            opacity: [0, 1],
            duration: 80,
            delay: function (el, i) { return t + i * opts.stagger; },
            ease: 'linear',
        });

        var afterStagger = t + units.length * opts.stagger + 80;

        fx.setTimeout(function () {
            fx.animate(units, { opacity: 0.2, duration: 50, ease: 'linear' });
        }, afterStagger);

        fx.setTimeout(function () {
            fx.animate(units, { opacity: 1, duration: 80, ease: 'linear' });
        }, afterStagger + 50);

        fx.setTimeout(function () {
            fx.animate(units, { opacity: 0, duration: 50, ease: 'linear' });
        }, afterStagger + 130);

        fx.setTimeout(function () {
            fx.animate(units, {
                opacity: 1,
                textShadow: '0 0 20px currentColor',
                duration: Math.max(200, opts.duration * 0.4),
                ease: 'linear',
            });
        }, afterStagger + 180);
    },
};

export default effect;
