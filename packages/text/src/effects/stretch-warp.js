var effect = {
    id: 'stretch-warp',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            scaleX: [4, 1],
            scaleY: [0.2, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outElastic(1, 0.4)',
        });
    },
};

export default effect;
