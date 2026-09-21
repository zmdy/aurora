var effect = {
    id: 'flip-board',
    // Airport split-flap display: each unit flips down from the top,
    // faster and tighter than the Flip X effect (which flips from the center
    // with a slower, wider stagger).
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) {
            u.style.transformOrigin = 'top center';
            u.style.transformStyle = 'preserve-3d';
        });
        fx.animate(units, {
            rotateX: [-90, 0],
            opacity: [0, 1],
            duration: Math.max(250, opts.duration * 0.4),
            delay: function (el, i) { return opts.delay + i * Math.max(opts.stagger, 40); },
            ease: 'outQuad',
        });
    },
};

export default effect;
