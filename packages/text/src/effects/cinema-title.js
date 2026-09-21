var effect = {
    id: 'cinema-title',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original;
        textEl.innerHTML = '';
        textEl.textContent = original;
        fx.animate(textEl, {
            letterSpacing: ['2em', 'normal'],
            opacity: [0, 1],
            duration: Math.max(1000, opts.duration * 1.5),
            delay: opts.delay,
            ease: 'inOutQuad',
        });
    },
};

export default effect;
