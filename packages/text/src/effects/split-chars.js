var effect = {
    id: 'split-chars',
    // Uses Anime.js splitText() instead of the generic pre-split units.
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        textEl.style.opacity = '1';
        var split = fx.resplit(textEl, { chars: true });
        fx.animate(split.chars, {
            translateY: [40, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
