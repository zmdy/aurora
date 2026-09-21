var effect = {
    id: 'matrix-rain',
    // Units fall into place in RANDOM order (rather than left-to-right
    // sequential stagger) for a "digital rain" feel.
    run: function (units, opts, textEl, fx) {
        fx.animate(units, {
            translateY: [-100, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function () { return opts.delay + Math.random() * opts.stagger * units.length * 0.5; },
            ease: 'outQuad',
        });
    },
};

export default effect;
