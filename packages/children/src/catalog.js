/**
 * Keyframe catalog for the entrance and emphasis animations.
 *
 * Every entry is a function `(direction, distance) => Keyframe[]`. The last
 * keyframe of an entrance is always the element's natural state, so the
 * animation can be removed once it finishes without a visual jump.
 *
 * `direction` is the direction of travel: `up` starts below and moves up.
 */

export var DIRECTIONS = ['up', 'down', 'left', 'right', 'none'];

/**
 * Offset (as a start position) for a direction of travel.
 */
function vec(direction, amount) {
    switch (direction) {
        case 'up': return [0, amount];
        case 'down': return [0, -amount];
        case 'left': return [amount, 0];
        case 'right': return [-amount, 0];
        default: return [0, 0];
    }
}

function move(x, y, unit) {
    var u = unit || 'px';
    return 'translate3d(' + x + u + ',' + y + u + ',0)';
}

function sign(direction) {
    return direction === 'down' || direction === 'right' ? 1 : -1;
}

var REST = 'translate3d(0,0,0)';

export var families = {
    fade: function (direction, distance) {
        var v = vec(direction, distance);
        return [
            { opacity: 0, transform: move(v[0], v[1]) },
            { opacity: 1, transform: REST },
        ];
    },

    slide: function (direction) {
        var v = vec(direction, 100);
        return [
            { transform: move(v[0], v[1], '%') },
            { transform: REST },
        ];
    },

    zoom: function (direction, distance) {
        var v = vec(direction, distance);
        return [
            { opacity: 0, transform: move(v[0], v[1]) + ' scale(0.3)' },
            { opacity: 1, transform: REST + ' scale(1)' },
        ];
    },

    bounce: function (direction, distance) {
        if (direction === 'none') {
            return [
                { offset: 0, opacity: 0, transform: 'scale(0.3)' },
                { offset: 0.2, transform: 'scale(1.1)' },
                { offset: 0.4, transform: 'scale(0.9)' },
                { offset: 0.6, opacity: 1, transform: 'scale(1.03)' },
                { offset: 0.8, transform: 'scale(0.97)' },
                { offset: 1, opacity: 1, transform: 'scale(1)' },
            ];
        }
        var base = distance * 4;
        var factors = [1, -0.08, 0.04, -0.02, 0];
        var offsets = [0, 0.6, 0.75, 0.9, 1];
        return factors.map(function (f, i) {
            var v = vec(direction, base * f);
            var frame = { offset: offsets[i], transform: move(v[0], v[1]) };
            frame.opacity = i === 0 ? 0 : 1;
            return frame;
        });
    },

    rotate: function (direction, distance) {
        var v = vec(direction, distance);
        var angle = direction === 'none' ? -180 : (direction === 'left' || direction === 'right' ? 90 : 45) * sign(direction);
        return [
            { opacity: 0, transform: move(v[0], v[1]) + ' rotate(' + angle + 'deg)' },
            { opacity: 1, transform: REST + ' rotate(0deg)' },
        ];
    },

    flip: function (direction) {
        var axis = direction === 'left' || direction === 'right' ? 'rotateY' : 'rotateX';
        var s = direction === 'none' ? 1 : -sign(direction);
        function frame(angle, extra) {
            return Object.assign({ transform: 'perspective(400px) ' + axis + '(' + angle + 'deg)' }, extra);
        }
        return [
            frame(90 * s, { offset: 0, opacity: 0 }),
            frame(-20 * s, { offset: 0.4 }),
            frame(10 * s, { offset: 0.6, opacity: 1 }),
            frame(-5 * s, { offset: 0.8 }),
            frame(0, { offset: 1, opacity: 1 }),
        ];
    },

    blur: function (direction, distance) {
        var v = vec(direction, distance);
        return [
            { opacity: 0, filter: 'blur(12px)', transform: move(v[0], v[1]) },
            { opacity: 1, filter: 'blur(0px)', transform: REST },
        ];
    },

    focus: function () {
        return [
            { opacity: 0, filter: 'blur(20px)', transform: 'scale(1.15)' },
            { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
        ];
    },

    // Emphasis animations: the element is already visible and returns to its
    // natural state. They ignore `direction` and never hide the children first.
    pulse: function () {
        return [
            { transform: 'scale(1)' },
            { offset: 0.5, transform: 'scale(1.08)' },
            { transform: 'scale(1)' },
        ];
    },

    shake: function (direction, distance) {
        var d = Math.max(4, distance / 3);
        return [
            { transform: 'translate3d(0,0,0)' },
            { offset: 0.1, transform: move(-d, 0) },
            { offset: 0.3, transform: move(d, 0) },
            { offset: 0.5, transform: move(-d, 0) },
            { offset: 0.7, transform: move(d, 0) },
            { offset: 0.9, transform: move(-d / 2, 0) },
            { transform: 'translate3d(0,0,0)' },
        ];
    },

    tada: function () {
        return [
            { transform: 'scale(1) rotate(0deg)' },
            { offset: 0.1, transform: 'scale(0.9) rotate(-3deg)' },
            { offset: 0.3, transform: 'scale(1.1) rotate(3deg)' },
            { offset: 0.5, transform: 'scale(1.1) rotate(-3deg)' },
            { offset: 0.7, transform: 'scale(1.1) rotate(3deg)' },
            { offset: 0.9, transform: 'scale(1.1) rotate(-3deg)' },
            { transform: 'scale(1) rotate(0deg)' },
        ];
    },

    'rubber-band': function () {
        return [
            { transform: 'scale(1,1)' },
            { offset: 0.3, transform: 'scale(1.25,0.75)' },
            { offset: 0.4, transform: 'scale(0.75,1.25)' },
            { offset: 0.5, transform: 'scale(1.15,0.85)' },
            { offset: 0.65, transform: 'scale(0.95,1.05)' },
            { offset: 0.75, transform: 'scale(1.05,0.95)' },
            { transform: 'scale(1,1)' },
        ];
    },

    wobble: function () {
        return [
            { transform: 'translate3d(0,0,0) rotate(0deg)' },
            { offset: 0.15, transform: 'translate3d(-25%,0,0) rotate(-5deg)' },
            { offset: 0.3, transform: 'translate3d(20%,0,0) rotate(3deg)' },
            { offset: 0.45, transform: 'translate3d(-15%,0,0) rotate(-3deg)' },
            { offset: 0.6, transform: 'translate3d(10%,0,0) rotate(2deg)' },
            { offset: 0.75, transform: 'translate3d(-5%,0,0) rotate(-1deg)' },
            { transform: 'translate3d(0,0,0) rotate(0deg)' },
        ];
    },
};

/** Families that reveal the element (children start hidden). */
export var ENTRANCE_FAMILIES = ['fade', 'slide', 'zoom', 'bounce', 'rotate', 'flip', 'blur', 'focus'];

/** Families that act on visible elements. */
export var EMPHASIS_FAMILIES = ['pulse', 'shake', 'tada', 'rubber-band', 'wobble'];

export function isEmphasis(name) {
    return EMPHASIS_FAMILIES.indexOf(name) !== -1;
}

/**
 * @param {string} family
 * @param {string} direction One of DIRECTIONS.
 * @param {number} distance  Travel distance in px.
 * @returns {Keyframe[]}
 */
export function buildKeyframes(family, direction, distance) {
    var make = families[family];
    if (!make) return [];
    return make(direction, distance);
}
