var effect = {
    id: 'flip-x',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) {
            u.style.transformOrigin = 'center bottom';
            u.style.transformStyle = 'preserve-3d';
            u.style.backfaceVisibility = 'hidden';
        });
        fx.animate(units, {
            rotateX: [90, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
