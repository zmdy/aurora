var effect = {
    id: 'wave',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateY: function (el, i) { return [Math.sin(i * 0.85) * 40, 0]; },
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outSine',
        });
    },
};

export default effect;
