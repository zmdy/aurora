import { buildGradientCss } from './css.js';

/**
 * Cursor spotlight: recenters a radial gradient on the pointer.
 *
 * @param {HTMLElement} trackEl     Element whose box defines the 0-100% space.
 * @param {HTMLElement} paintEl     Element receiving `background-image`.
 * @param {Object} options
 * @param {Array} stops
 * @param {Object} painter
 */
export function startFollow(trackEl, paintEl, options, stops, painter) {
    var pos = { x: 50, y: 50 };
    var frame = null;

    function render() {
        paintEl.style.setProperty('background-image', buildGradientCss('radial', 0, stops, {
            radius: options.spotlightRadius,
            cx: pos.x,
            cy: pos.y,
        }));
    }

    // Registers the undo for background-image before the first render.
    painter.style(paintEl, 'background-image', '');

    function onMove(event) {
        if (frame !== null) return;
        var clientX = event.clientX;
        var clientY = event.clientY;
        frame = requestAnimationFrame(function () {
            frame = null;
            var rect = trackEl.getBoundingClientRect();
            pos.x = rect.width ? ((clientX - rect.left) / rect.width) * 100 : 50;
            pos.y = rect.height ? ((clientY - rect.top) / rect.height) * 100 : 50;
            render();
        });
    }

    painter.on(trackEl, 'pointermove', onMove, { passive: true });
    painter.onRevert(function () {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
    });
    render();
}
