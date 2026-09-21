var effect = {
    id: 'skew-in',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            skewX: [-35, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
