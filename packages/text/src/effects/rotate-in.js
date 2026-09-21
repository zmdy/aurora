var effect = {
    id: 'rotate-in',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) { u.style.transformOrigin = 'left bottom'; });
        fx.animate(units, {
            rotate: [-90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
