var effect = {
    id: 'scatter-converge',
    // Each unit starts scattered at a random offset/rotation and converges
    // into place — the entrance-side counterpart to the hover scatter
    // option, which does the same random-jump trick
    // on hover instead of on entrance.
    run: function (units, opts, textEl, fx) {
        function rand(min, max) {
            if (fx.utils && typeof fx.utils.random === 'function') {
                return fx.utils.random(min, max);
            }
            return Math.random() * (max - min) + min;
        }
        units.forEach(function (u) {
            fx.animate(u, {
                translateX: [rand(-160, 160), 0],
                translateY: [rand(-120, 120), 0],
                rotate: [rand(-90, 90), 0],
                opacity: [0, 1],
                duration: opts.duration,
                delay: opts.delay + Math.random() * opts.stagger * units.length * 0.4,
                ease: 'outExpo',
            });
        });
    },
};

export default effect;
