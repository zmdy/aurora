var effect = {
    id: 'liquid-fill',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original;
        textEl.innerHTML = '';
        var span = document.createElement('span');
        span.textContent = original;
        span.style.display = 'block';
        textEl.appendChild(span);
        textEl.style.opacity = '1';
        fx.animate(span, {
            clipPath: ['inset(100% 0 0 0)', 'inset(0% 0 0 0)'],
            duration: opts.duration,
            delay: opts.delay,
            ease: 'outQuad',
        });
    },
};

export default effect;
