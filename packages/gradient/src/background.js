import { buildGradientCss, buildMeshLayers, positionString } from './css.js';
import { startFollow } from './follow.js';

/**
 * Paints the element background.
 *
 * - static: inline `background-image`.
 * - animated: a `::before` layer inside an isolated stacking context, so
 *   blur or hue rotation never leaks into the content.
 * - spotlight: see follow.js.
 */
export function paintBackground(el, options, stops, painter, animated) {
    if (options.followMouse) {
        startFollow(el, el, options, stops, painter);
        return;
    }

    var css = buildGradientCss(options.type, options.angle, stops);

    if (!animated) {
        painter.style(el, 'background-image', css);
        return;
    }

    painter.addClass(el, 'aurora-gradient-host');
    painter.style(el, '--aurora-gradient-speed', options.speed + 's');

    if (options.animation === 'hue') {
        painter.addClass(el, 'aurora-gradient-bg-hue');
        painter.style(el, '--aurora-gradient-image', css);
        return;
    }

    var mesh = buildMeshLayers(stops);
    painter.addClass(el, 'aurora-gradient-bg-flow');
    painter.style(el, '--aurora-gradient-image', mesh.image);
    painter.style(el, '--aurora-gradient-pos-a', positionString(mesh.positions, 0, 0));
    painter.style(el, '--aurora-gradient-pos-b', positionString(mesh.positions, 8, -10));
    painter.style(el, '--aurora-gradient-blur', Math.max(18, Math.round(70 / mesh.positions.length)) + 'px');
}
