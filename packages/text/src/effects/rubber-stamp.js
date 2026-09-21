var effect = {
    id: 'rubber-stamp',
    run: function (units, opts, textEl, fx) {
        var slamDuration = 250;

        fx.animate(units, {
            scale: [4, 1.15],
            rotate: [-15, 0],
            opacity: [0, 1],
            duration: slamDuration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'inQuad',
        });

        fx.setTimeout(function () {
            fx.animate(units, {
                scale: 1,
                duration: Math.max(250, opts.duration * 0.6),
                ease: 'outElastic(1, 0.4)',
            });
        }, opts.delay + units.length * opts.stagger + slamDuration);
    },
};

export default effect;
