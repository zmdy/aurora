var effect = {
    id: 'scramble',
    // Uses Anime.js scrambleText(); works on the whole element.
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        textEl.style.opacity = '1';
        fx.animate(textEl, {
            innerHTML: fx.scrambleText({ duration: opts.duration }),
            delay: opts.delay,
        });
    },
};

export default effect;
