var effect = {
    id: 'continuous-wave',
    // Unlike the other effects this one never settles: each unit bobs up and
    // down forever, staggered by index so the motion ripples across the text.
    run: function (units, opts, textEl, fx) {


        // Two separate calls on purpose: opacity fades in once (a normal
        // entrance) while translateY loops forever. One looping tween would
        // make opacity alternate too.
        fx.animate(units, {
            opacity: [0, 1],
            duration: Math.max(400, opts.duration),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outSine',
        });
        var anim = fx.animate(units, {
            translateY: [0, -14],
            duration: Math.max(400, opts.duration / 2),
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            loop: true,
            alternate: true,
            ease: 'inOutSine',
        });
    },
};

export default effect;
