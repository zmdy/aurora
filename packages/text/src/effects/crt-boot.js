var effect = {
    id: 'crt-boot',
    run: function (units, opts, textEl, fx) {
        textEl.style.transformOrigin = 'center center';
        fx.animate(textEl, {
            scaleY: [0.005, 1],
            opacity: [0.6, 1],
            duration: 400,
            delay: opts.delay,
            ease: 'outQuad',
        });

        fx.setTimeout(function () {
            fx.animate(units, {
                opacity: [0, 1],
                filter: ['blur(10px)', 'blur(0px)'],
                duration: Math.max(300, opts.duration),
                delay: function (el, i) { return i * opts.stagger; },
                ease: 'outQuad',
            });
        }, opts.delay + 300);

        fx.setTimeout(function () {
            fx.animate(units, {
                textShadow: '0 0 10px currentColor',
                duration: 300,
            });
        }, opts.delay + 300 + Math.max(300, opts.duration) + units.length * opts.stagger);
    },
};

export default effect;
