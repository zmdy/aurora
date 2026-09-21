var effect = {
    id: 'scale-in',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            scale: [0.2, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outBack',
        });
    },
};

export default effect;
