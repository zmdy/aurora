var effect = {
    id: 'elastic-slide',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateX: [-300, 0],
            opacity: [0, 1],
            duration: Math.max(600, opts.duration * 1.5),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.4)',
        });
    },
};

export default effect;
