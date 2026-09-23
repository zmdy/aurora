/**
 * Generic directional slide entrance. Replaces the old direction-specific
 * drop-down / float-up / slide-from-left / slide-right effects, plus the
 * easing-specific elastic-slide / bounce-drop / elastic-bounce effects,
 * which are now the `direction` and `style` options below.
 */
var AXIS = { up: 'Y', down: 'Y', left: 'X', right: 'X' };
var SIGN = { up: -1, down: 1, left: -1, right: 1 };
var DISTANCE = {
    smooth: { Y: 60, X: 80 },
    bounce: { Y: 80, X: 80 },
    elastic: { Y: 100, X: 300 },
};
var EASE = { smooth: 'outExpo', bounce: 'outBounce', elastic: 'outElastic(1, 0.4)' };

var effect = {
    id: 'slide-in',
    run: function (units, opts, textEl, fx) {
        var direction = opts.direction || 'down';
        var style = opts.style || 'smooth';
        var axis = AXIS[direction] || 'Y';
        var sign = SIGN[direction] || 1;
        var table = DISTANCE[style] || DISTANCE.smooth;
        var distance = table[axis] * sign;
        var duration = style === 'elastic' ? Math.max(600, opts.duration * 1.5) : opts.duration;
        var props = {
            opacity: [0, 1],
            duration: duration,
            ease: EASE[style] || EASE.smooth,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
        };
        props['translate' + axis] = [distance, 0];
        fx.animate(units, props);
    },
};

export default effect;
