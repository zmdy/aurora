var effect = {
    id: 'perspective-fly',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original;
        textEl.innerHTML = '';
        textEl.textContent = original;
        textEl.style.opacity = '0';
        if (textEl.parentElement) {
            textEl.parentElement.style.perspective = '500px';
        }
        fx.animate(textEl, {
            translateZ: [-2000, 0],
            opacity: [0, 1],
            duration: Math.max(600, opts.duration),
            delay: opts.delay,
            ease: 'outExpo',
        });
    },
};

export default effect;
