var effect = {
    id: 'pendulum-swing',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) { u.style.transformOrigin = 'top center'; });
        fx.animate(units, {
            rotate: [90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.5)',
        });
    },
};

export default effect;
