var effect = {
    id: 'letter-roll',
    run: function (units, opts, textEl, fx) {
        units.forEach(function (u) { u.style.transformOrigin = '50% 100%'; });

        fx.animate(units, {
            translateY: ['100%', '0%'],
            rotateX: [-70, 0],
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outQuart',
        });

        if (!textEl || !opts.hoverReplay) return;

        var busy = false;
        function onEnter() {
            if (busy || !units.length) return;
            busy = true;
            var order = units.map(function (u, i) { return i; });
            order.sort(function () { return Math.random() - 0.5; });
            order.forEach(function (idx, i) {
                var start = i * 35;
                fx.animate(units[idx], {
                    translateY: ['0%', '-100%'],
                    rotateX: [0, 70],
                    duration: 180,
                    delay: start,
                    ease: 'inQuad',
                });
                fx.animate(units[idx], {
                    translateY: ['-100%', '0%'],
                    rotateX: [70, 0],
                    duration: 300,
                    delay: start + 180,
                    ease: 'outBack',
                });
            });
            fx.setTimeout(function () { busy = false; }, order.length * 35 + 480);
        }

        fx.on(textEl, 'mouseenter', onEnter);
    },
};

export default effect;
