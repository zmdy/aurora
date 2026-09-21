var effect = {
    id: 'glitch',
    run: function (units, opts, textEl, fx) {
        var settleAt = opts.delay + units.length * opts.stagger + 40;

        fx.animate(units, {
            opacity: [0, 1],
            translateX: function () { return (Math.random() - 0.5) * 30; },
            duration: 40,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'linear',
        });

        fx.setTimeout(function () {
            fx.animate(units, {
                translateX: function () { return (Math.random() - 0.5) * 15; },
                duration: 40,
                ease: 'linear',
            });
        }, settleAt);

        fx.setTimeout(function () {
            fx.animate(units, {
                translateX: function () { return (Math.random() - 0.5) * 8; },
                duration: 40,
                ease: 'linear',
            });
        }, settleAt + 40);

        fx.setTimeout(function () {
            fx.animate(units, {
                translateX: 0,
                duration: Math.max(150, opts.duration * 0.6),
                ease: 'outQuad',
            });
        }, settleAt + 80);
    },
};

export default effect;
