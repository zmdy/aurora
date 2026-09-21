var effect = {
    id: 'blur-reveal',
    run: function (units, opts, textEl, fx) {
        // Starts blurred
        units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
        fx.animate(units, {
            filter: ['blur(14px)', 'blur(0px)'],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outQuart',
        });
    },
};

export default effect;
