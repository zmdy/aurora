var effect = {
    id: 'slot-machine',
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateY: ['-500%', '0%'],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
