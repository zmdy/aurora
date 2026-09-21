import { buildGradientCss } from './css.js';
import { startFollow } from './follow.js';
import { paintClip, guardGlyphBox } from './text.js';

var SVG_NS = 'http://www.w3.org/2000/svg';
var SHAPES = 'path, circle, rect, polygon, ellipse, line, polyline';
var counter = 0;

/**
 * Icons come in two shapes that need different techniques:
 *
 * - font icons (`<i>`): the glyph is text, so `background-clip: text` works.
 * - SVG icons: a gradient definition is added to the SVG and every shape's
 *   fill points at it. Backgrounds cannot clip SVG paths.
 *
 * SVG icons support only the "hue" animation and no cursor spotlight.
 */
export function paintIcon(glyph, trackEl, options, stops, painter, animated) {
    if (glyph.tagName.toLowerCase() === 'svg') {
        paintSvg(glyph, options, stops, painter, animated);
        return;
    }

    painter.addClass(glyph, 'aurora-gradient-icon');
    guardGlyphBox(glyph, painter, '0.12em');

    if (options.followMouse) {
        paintClip(glyph, 'none', painter);
        startFollow(trackEl, glyph, options, stops, painter);
        return;
    }

    paintClip(glyph, buildGradientCss(options.type, options.angle, stops), painter);
    if (!animated) return;

    painter.style(glyph, '--aurora-gradient-speed', options.speed + 's');
    painter.addClass(glyph, 'aurora-gradient-icon-' + (options.animation === 'hue' ? 'hue' : 'pan'));
    if (options.animation !== 'hue') painter.style(glyph, 'background-size', '300% 300%');
}

function paintSvg(svg, options, stops, painter, animated) {
    var defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
        painter.onRevert(function () { defs.remove(); });
    }

    var id = 'aurora-gradient-' + (++counter);
    var radial = options.type === 'radial';
    var gradient = document.createElementNS(SVG_NS, radial ? 'radialGradient' : 'linearGradient');
    gradient.setAttribute('id', id);

    if (radial) {
        gradient.setAttribute('cx', '50%');
        gradient.setAttribute('cy', '50%');
        gradient.setAttribute('r', '70%');
    } else {
        // Same angle-to-endpoints conversion CSS uses for linear-gradient().
        var rad = ((options.angle - 90) * Math.PI) / 180;
        var dx = Math.cos(rad) * 0.5;
        var dy = Math.sin(rad) * 0.5;
        gradient.setAttribute('x1', (50 - dx * 100) + '%');
        gradient.setAttribute('y1', (50 - dy * 100) + '%');
        gradient.setAttribute('x2', (50 + dx * 100) + '%');
        gradient.setAttribute('y2', (50 + dy * 100) + '%');
    }

    stops.forEach(function (stop, index) {
        var node = document.createElementNS(SVG_NS, 'stop');
        var offset = stop.offset === null ? (index / Math.max(1, stops.length - 1)) * 100 : stop.offset;
        node.setAttribute('offset', offset + '%');
        node.setAttribute('stop-color', stop.color);
        gradient.appendChild(node);
    });

    defs.appendChild(gradient);
    painter.onRevert(function () { gradient.remove(); });

    var fill = 'url(#' + id + ')';
    Array.prototype.forEach.call(svg.querySelectorAll(SHAPES), function (shape) {
        painter.style(shape, 'fill', fill);
    });
    painter.style(svg, 'fill', fill);

    if (animated) {
        painter.style(svg.parentElement || svg, '--aurora-gradient-speed', options.speed + 's');
        painter.addClass(svg.parentElement || svg, 'aurora-gradient-icon-hue');
    }
}
