var effect = {
    id: 'spin-in',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            rotate: [720, 0],
            scale: [0, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
