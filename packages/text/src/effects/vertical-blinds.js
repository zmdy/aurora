var effect = {
    id: 'vertical-blinds',
    run: function (units, opts, textEl, fx) {
        var n = units.length;
        fx.animate(units, {
            scaleX: [0, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) {
                var distFromEdge = Math.min(i, n - 1 - i);
                return opts.delay + distFromEdge * opts.stagger;
            },
            ease: 'outQuad',
        });
    },
};

export default effect;
