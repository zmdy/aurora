/**
 * Generic directional 3D flip entrance. Replaces the old flip-x (vertical
 * hinge via rotateX) and flip-y (horizontal hinge via rotateY) effects,
 * which are now the `direction` option below.
 */
var CONFIG = {
    up: { prop: 'rotateX', from: -90, origin: 'center top' },
    down: { prop: 'rotateX', from: 90, origin: 'center bottom' },
    left: { prop: 'rotateY', from: -90, origin: 'left center' },
    right: { prop: 'rotateY', from: 90, origin: 'right center' },
};

var effect = {
    id: 'flip-in',
    run: function (units, opts, textEl, fx) {
        var direction = opts.direction || 'up';
        var cfg = CONFIG[direction] || CONFIG.up;
        units.forEach(function (u) {
            u.style.transformOrigin = cfg.origin;
            u.style.transformStyle = 'preserve-3d';
            u.style.backfaceVisibility = 'hidden';
        });
        var props = {
            opacity: [0, 1],
            duration: opts.duration,
            ease: 'outExpo',
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
        };
        props[cfg.prop] = [cfg.from, 0];
        fx.animate(units, props);
    },
};

export default effect;
