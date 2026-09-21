var effect = {
    id: 'elastic-bounce',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateY: [60, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.4)',
        });
    },
};

export default effect;
