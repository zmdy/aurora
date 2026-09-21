var effect = {
    id: 'unfold-3d',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) {
            u.style.transformOrigin = 'left center';
            u.style.transformStyle = 'preserve-3d';
        });
        fx.animate(units, {
            rotateY: [-90, 0],
            rotateX: [45, 0],
            scale: [0.5, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
