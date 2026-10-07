import { defineModule } from '@aurora/core';
import { HIGHLIGHT_SHAPES } from '@vianetz/animated-headlines-vanilla/manifest';
import { schema, themeOptions } from './schema.js';
import { css } from './styles.js';

export { schema };

var NS = 'http://www.w3.org/2000/svg';

/** The box the shapes are authored in; stretched to the phrase on mount. */
var VIEW_BOX = '0 0 500 150';

function svgNode(tag, attributes) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attributes).forEach(function (key) { node.setAttribute(key, String(attributes[key])); });
    return node;
}

/**
 * Aurora Highlight Shapes.
 *
 * Usage:
 *   <h2 data-aurora-highlight="circle">Pick the right one</h2>
 *   Aurora.highlight(document.querySelector('h2'), { shape: 'marker' });
 *
 * The marker is drawn over text the author already wrote and never rewrites
 * it: the SVG is an absolutely-positioned overlay, so the children are left
 * alone. It is also mounted beside the text node rather than inside it -
 * the Text module restores that node's innerHTML whenever it splits or
 * replays, which would carry an overlay nested within it away.
 *
 * Rotating phrases belong to the headline module, which does mount that
 * component, because rotation needs the markup it builds.
 */
export var highlight = defineModule({
    name: 'highlight',
    schema: schema,

    init: function (el, options, ctx) {
        ctx.style('highlight', css);

        // A builder hands the module its widget wrapper, not the heading
        // inside it, so the drawing would otherwise be sized to the wrapper.
        var target = options.target ? el.querySelector(options.target) || el : el;
        if (!HIGHLIGHT_SHAPES[options.shape]) {
            ctx.warn('Unknown shape "' + options.shape + '".');
            return {};
        }

        // Only claim positioning if the element has none of its own, and put
        // it back on destroy.
        // The overlay hangs off the outer element, never off the text node,
        // and is positioned over whatever box that node occupies.
        var anchor = el;
        var pristinePosition = anchor.style.position;
        if (getComputedStyle(anchor).position === 'static') anchor.style.position = 'relative';

        function place(node) {
            if (target === anchor) {
                node.style.left = '50%';
                node.style.top = '50%';
                node.style.width = '';
                node.style.height = '';
                return;
            }

            var box = target.getBoundingClientRect();
            var base = anchor.getBoundingClientRect();
            node.style.left = (box.left - base.left + box.width / 2) + 'px';
            node.style.top = (box.top - base.top + box.height / 2) + 'px';
            node.style.width = 'calc(' + box.width + 'px + var(--ah-highlight-bleed-x, .35em) * 2)';
            node.style.height = 'calc(' + box.height + 'px + var(--ah-highlight-bleed-y, .3em) * 2)';
        }

        var svg = null;
        var drawn = false;

        function build(current) {
            var shape = HIGHLIGHT_SHAPES[current.shape] || HIGHLIGHT_SHAPES[schema.options.shape.default];
            var next = svgNode('svg', {
                viewBox: VIEW_BOX,
                preserveAspectRatio: 'none',
                class: 'aurora-highlight',
                'data-shape': current.shape,
                'aria-hidden': 'true',
                focusable: 'false',
            });

            shape.forEach(function (definition) {
                next.appendChild(svgNode('path', { d: definition, pathLength: '100' }));
            });

            themeOptions.forEach(function (entry) {
                if (current[entry.option]) next.style.setProperty(entry.variable, current[entry.option]);
            });
            if (drawn) next.classList.add('is-drawn');

            if (svg && svg.parentNode) svg.parentNode.replaceChild(next, svg);
            else anchor.appendChild(next);
            svg = next;
            place(svg);
        }

        function draw() {
            if (drawn || !svg) return;
            drawn = true;
            if (ctx.reducedMotion) { svg.classList.add('is-drawn'); return; }
            svg.classList.add('is-visible');
        }

        build(options);

        // Text reflows (a breakpoint, a web font arriving, the Text module
        // splitting the phrase) move the box the marker is drawn over.
        var observer = null;
        if (typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(function () { if (svg) place(svg); });
            observer.observe(target);
            if (target !== anchor) observer.observe(anchor);
        }

        if (options.trigger === 'load') draw();
        else ctx.observe(el, { threshold: Math.min(options.threshold, 0.05), once: true, onEnter: draw });

        ctx.onDestroy(function () {
            if (observer) observer.disconnect();
            if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
            svg = null;
            if (pristinePosition) anchor.style.position = pristinePosition;
            else anchor.style.removeProperty('position');
        });

        return {
            update: function (next) { build(next); },
            replay: function () {
                drawn = false;
                if (svg) svg.classList.remove('is-visible', 'is-drawn');
                draw();
            },
        };
    },
});
