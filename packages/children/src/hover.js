/**
 * Hover and proximity-wave effect for a list of children.
 *
 * The hovered child gets the full effect; with `proximity`, neighbours get a
 * share of it that fades linearly with their distance from the hovered child.
 */

var EASING = 'cubic-bezier(0.25, 1, 0.5, 1)';

function presetParams(options) {
    var p = { x: 0, y: 0, scale: 1, rotate: 0, skew: 0, flipX: 0, flipY: 0 };
    switch (options.hoverPreset) {
        case 'lift': p.y = -10; break;
        case 'slide': p.x = 10; break;
        case 'scale': p.scale = 1.05; break;
        case 'tilt': p.rotate = -4; break;
        case 'flip-x': p.flipX = 180; break;
        case 'flip-y': p.flipY = 180; break;
        case 'custom':
            p.x = options.hoverX;
            p.y = options.hoverY;
            p.scale = options.hoverScale;
            p.rotate = options.hoverRotate;
            p.skew = options.hoverSkew;
            break;
    }
    return p;
}

function transformFor(p, factor) {
    var parts = [];
    if (p.flipX || p.flipY) parts.push('perspective(600px)');
    parts.push('translate3d(' + p.x * factor + 'px,' + p.y * factor + 'px,0)');
    parts.push('scale(' + (1 + (p.scale - 1) * factor) + ')');
    if (p.rotate) parts.push('rotate(' + p.rotate * factor + 'deg)');
    if (p.skew) parts.push('skewX(' + p.skew * factor + 'deg)');
    if (p.flipY) parts.push('rotateX(' + p.flipY * factor + 'deg)');
    if (p.flipX) parts.push('rotateY(' + p.flipX * factor + 'deg)');
    return parts.join(' ');
}

function center(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * @param {Element} root
 * @param {Element[]} children
 * @param {Object} options   Validated options of the children schema.
 * @param {Object} ctx       Module context (for `on`).
 * @param {boolean} instant  Skip the transition (reduced motion).
 */
export function mountHover(root, children, options, ctx, instant) {
    var params = presetParams(options);
    var duration = instant ? 0 : options.hoverDuration;

    children.forEach(function (child) {
        child.style.setProperty('transition', 'transform ' + duration + 'ms ' + EASING, 'important');
        child.style.willChange = 'transform';
    });

    function apply(hoveredIndex) {
        if (hoveredIndex === -1) {
            children.forEach(function (child) { child.style.transform = ''; });
            return;
        }

        var origin = center(children[hoveredIndex]);
        var centers = children.map(center);

        var radius = 0;
        if (options.proximity) {
            var nearest = Infinity;
            centers.forEach(function (c, i) {
                if (i === hoveredIndex) return;
                var d = Math.hypot(c.x - origin.x, c.y - origin.y);
                if (d > 0 && d < nearest) nearest = d;
            });
            radius = (nearest === Infinity ? 150 : nearest) * 2.2;
        }

        children.forEach(function (child, i) {
            var factor = 0;
            if (i === hoveredIndex) {
                factor = 1;
            } else if (options.proximity) {
                var d = Math.hypot(centers[i].x - origin.x, centers[i].y - origin.y);
                if (d < radius) factor = (1 - d / radius) * options.proximityIntensity;
            }
            child.style.transform = factor > 0.001 ? transformFor(params, factor) : '';
        });
    }

    children.forEach(function (child, index) {
        ctx.on(child, 'pointerenter', function () { apply(index); });
    });
    ctx.on(root, 'pointerleave', function () { apply(-1); });

    return function unmount() {
        children.forEach(function (child) {
            child.style.transition = '';
            child.style.willChange = '';
            child.style.transform = '';
        });
    };
}
