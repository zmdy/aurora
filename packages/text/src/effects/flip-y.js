var effect = {
    id: 'flip-y',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) {
            u.style.transformStyle = 'preserve-3d';
            u.style.backfaceVisibility = 'hidden';
        });
        fx.animate(units, {
            rotateY: [90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
