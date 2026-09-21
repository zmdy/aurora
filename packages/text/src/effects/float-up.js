var effect = {
    id: 'float-up',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateY: [60, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
