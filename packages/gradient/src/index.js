import { defineModule } from '@aurora/core';
import { schema } from './schema.js';
import { STYLESHEET, parseStops, buildGradientCss } from './css.js';
import { createPainter } from './painter.js';
import { paintBackground } from './background.js';
import { paintText } from './text.js';
import { paintIcon } from './icon.js';
import { mountMesh } from './mesh.js';

export { schema } from './schema.js';
export { parseStops, buildGradientCss } from './css.js';
export { MESH_STYLES } from './shaders.js';

/**
 * Gradient: multi-stop gradients for backgrounds, text and icons.
 */
export var gradient = defineModule({
    name: 'gradient',
    schema: schema,

    init: function (el, initial, ctx) {
        ctx.style('gradient', STYLESHEET);

        var options = initial;
        var painter = createPainter();
        var mesh = null;

        function destroyMesh() {
            if (mesh) mesh.destroy();
            mesh = null;
        }

        function targets() {
            if (options.selector) return Array.prototype.slice.call(el.querySelectorAll(options.selector));
            if (options.target === 'icon') return Array.prototype.slice.call(el.querySelectorAll('svg, i'));
            return [el];
        }

        function paint() {
            painter.revert();

            var stops = parseStops(options.stops);
            if (stops.length < 2) {
                destroyMesh();
                ctx.warn('At least two color stops are needed.');
                return;
            }

            var reduced = ctx.reducedMotion;
            var animated = options.animation !== 'none' && !reduced;
            var useMesh = options.type === 'mesh' && options.target === 'background';

            if (useMesh) {
                if (mesh && mesh.meshStyle === options.meshStyle && mesh.alive()) {
                    mesh.update(options, stops);
                    return;
                }
                destroyMesh();
                mesh = mountMesh(el, options, stops, !reduced);
                if (mesh) return;
                // No WebGL: fall back to a static CSS gradient.
                painter.style(el, 'background-image', buildGradientCss('linear', options.angle, stops));
                return;
            }
            destroyMesh();

            // Mesh only exists as a WebGL background; elsewhere it degrades to linear.
            var view = options.type === 'mesh' ? Object.assign({}, options, { type: 'linear' }) : options;
            var follow = view.followMouse && !reduced;
            view = follow === view.followMouse ? view : Object.assign({}, view, { followMouse: false });

            if (options.target === 'text') {
                targets().forEach(function (node) { paintText(node, el, view, stops, painter, animated); });
            } else if (options.target === 'icon') {
                targets().forEach(function (node) { paintIcon(node, el, view, stops, painter, animated); });
            } else {
                paintBackground(el, view, stops, painter, animated);
            }
        }

        paint();

        // The Text module rebuilds the markup when it splits or replays, which
        // discards the paint on the units. Repaint them.
        if (options.target === 'text') {
            ctx.listen('split', function () { requestAnimationFrame(paint); }, { module: 'text' });
        }

        ctx.onDestroy(function () {
            painter.revert();
            destroyMesh();
        });

        return {
            update: function (next) {
                options = next;
                paint();
            },
        };
    },
});
