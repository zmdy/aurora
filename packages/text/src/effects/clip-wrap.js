var effect = {
    id: 'clip-wrap',
    // Words masked with splitText()'s wrap:'clip'; splits the DOM itself.
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        textEl.style.opacity = '1';
        var split = fx.resplit(textEl, { words: { wrap: 'clip' } });
        fx.animate(split.words, {
            translateY: ['100%', '0%'],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
