var effect = {
    id: 'bounce-drop',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateY: [-80, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outBounce',
        });
    },
};

export default effect;
