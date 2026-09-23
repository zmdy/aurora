/**
 * Directional skew entrance: units shear in from the given side.
 */
var CONFIG = {
    left: { prop: 'skewX', from: -35 },
    right: { prop: 'skewX', from: 35 },
    up: { prop: 'skewY', from: -20 },
    down: { prop: 'skewY', from: 20 },
};

var effect = {
    id: 'skew-in',
    run: function (units, opts, textEl, fx) {
        var direction = opts.direction || 'left';
        var cfg = CONFIG[direction] || CONFIG.left;
        var props = {
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        };
        props[cfg.prop] = [cfg.from, 0];
        fx.animate(units, props);
    },
};

export default effect;
