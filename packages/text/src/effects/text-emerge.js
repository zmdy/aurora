var effect = {
    id: 'text-emerge',
    run: function (units, opts, textEl, fx) {
        var center = (units.length - 1) / 2;
        units.forEach(function (u, i) {
            var distance = Math.abs(i - center);
            fx.animate(u, {
                opacity: [0, 1],
                scale: [0, 1],
                filter: ['blur(6px)', 'blur(0px)'],
                duration: Math.max(300, opts.duration),
                delay: opts.delay + distance * opts.stagger,
                ease: 'outBack',
            });
        });
    },
};

export default effect;
