var effect = {
    id: 'heartbeat',
    run: function (units, opts, textEl, fx) {
        var fadeIn = Math.max(200, opts.duration * 0.3);

        fx.animate(units, {
            opacity: [0, 1],
            duration: fadeIn,
            delay: opts.delay,
            ease: 'outQuad',
        });

        var t = opts.delay + fadeIn;
        fx.setTimeout(function () {
            fx.animate(units, { scale: 1.15, duration: 100, ease: 'inQuad' });
        }, t);
        fx.setTimeout(function () {
            fx.animate(units, { scale: 1, duration: 100, ease: 'linear' });
        }, t + 100);
        fx.setTimeout(function () {
            fx.animate(units, { scale: 1.25, duration: 120, ease: 'linear' });
        }, t + 200);
        fx.setTimeout(function () {
            fx.animate(units, { scale: 1, duration: 300, ease: 'outQuad' });
        }, t + 320);
    },
};

export default effect;
