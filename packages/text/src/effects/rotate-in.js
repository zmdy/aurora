/**
 * Directional 2D rotate entrance: units spin in around a corner pivot.
 * The `direction` option now also covers the old near-duplicate
 * domino-fall effect (same mechanic, opposite pivot).
 */
var CONFIG = {
    left: { origin: 'left bottom', from: -90 },
    right: { origin: 'right bottom', from: 90 },
    up: { origin: 'left bottom', from: 90 },
    down: { origin: 'left top', from: -90 },
};

var effect = {
    id: 'rotate-in',
    run: function (units, opts, textEl, fx) {
        var direction = opts.direction || 'left';
        var cfg = CONFIG[direction] || CONFIG.left;
        units.forEach(function (u) { u.style.transformOrigin = cfg.origin; });
        fx.animate(units, {
            rotate: [cfg.from, 0],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
