var effect = {
    id: 'typewriter',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            opacity: [0, 1],
            duration: 1,
            delay: function (el, i) {
                // larger stagger to simulate typing
                return opts.delay + i * Math.max(opts.stagger, 60);
            },
            ease: 'linear',
        });
    },
};

export default effect;
