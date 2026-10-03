/**
 * Shape "recipes": (width, height) => an SVG path string sized to the real,
 * measured box, instead of a fixed viewBox stretched with
 * preserveAspectRatio:none. Every recipe stays close to the target's own
 * baseline area (bottom ~85% of the box) except `frame`, which brackets the
 * whole box.
 */
export var SHAPES = {
    underline: function (w, h) {
        var y = h * .86, dip = h * .07;
        return 'M' + (w * .02) + ' ' + y
            + ' C' + (w * .28) + ' ' + (y - dip) + ' ' + (w * .68) + ' ' + (y - dip) + ' ' + (w * .98) + ' ' + y;
    },
    circle: function (w, h) {
        var top = h * .06, bottom = h * .96, midL = w * -.03, midR = w * 1.03;
        return 'M' + (w * .06) + ' ' + (h * .5)
            + ' C' + (w * .04) + ' ' + top + ' ' + (w * .96) + ' ' + top + ' ' + (w * .97) + ' ' + (h * .5)
            + ' C' + (w * .98) + ' ' + bottom + ' ' + (w * .05) + ' ' + bottom + ' ' + (midL < 0 ? w * .03 : w * .03) + ' ' + (h * .5);
    },
    zigzag: function (w, h) {
        var top = h * .68, bottom = h * .88, steps = Math.max(4, Math.round(w / 32)), seg = w / steps;
        var d = 'M0 ' + bottom;
        for (var i = 1; i <= steps; i++) d += ' L' + (seg * i) + ' ' + (i % 2 ? top : bottom);
        return d;
    },
    strike: function (w, h) {
        var y = h * .5;
        return 'M' + (w * .02) + ' ' + y + ' C' + (w * .35) + ' ' + (y - h * .03) + ' ' + (w * .65) + ' ' + (y - h * .03) + ' ' + (w * .98) + ' ' + y;
    },
    frame: function (w, h) {
        var r = Math.min(w, h) * .18;
        return 'M' + r + ' 2 L2 2 L2 ' + r
            + ' M' + (w - r) + ' 2 L' + (w - 2) + ' 2 L' + (w - 2) + ' ' + r
            + ' M' + (w - 2) + ' ' + (h - r) + ' L' + (w - 2) + ' ' + (h - 2) + ' L' + (w - r) + ' ' + (h - 2)
            + ' M' + r + ' ' + (h - 2) + ' L2 ' + (h - 2) + ' L2 ' + (h - r);
    },
};

export var SHAPE_NAMES = Object.keys(SHAPES);
