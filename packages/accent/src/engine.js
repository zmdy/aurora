import { SHAPES } from './shapes.js';
import { css } from './styles.js';

var NS = 'http://www.w3.org/2000/svg';
var nextId = 0;
var EASINGS = { 'ease-out': 'cubic-bezier(.16,1,.3,1)', linear: 'linear', 'ease-in-out': 'cubic-bezier(.65,0,.35,1)' };

function svgNode(tag, attrs) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, String(attrs[key])); });
    return node;
}

/**
 * Non-destructive accent: appends an absolutely-positioned SVG over the
 * target without ever touching its existing children (no innerHTML/
 * textContent reset, unlike the headline module's shapes). The path is
 * generated for the target's real measured size — never a fixed viewBox
 * stretched with preserveAspectRatio:none — and a ResizeObserver rebuilds it
 * when that size changes (a responsive breakpoint, wrapped text, a web font
 * swapping in after the first paint).
 */
export function mountAccent(el, options, ctx) {
    var target = options.target ? el.querySelector(options.target) || el : el;
    var ownsPosition = false;
    var svg = null, path = null, drawn = false, destroyed = false, resizeTimer = null;

    function measure() {
        var rect = target.getBoundingClientRect();
        return { w: Math.max(1, Math.round(rect.width)), h: Math.max(1, Math.round(rect.height)) };
    }

    function build() {
        var size = measure();
        var id = 'aurora-accent-gradient-' + (++nextId);
        var next = svgNode('svg', { viewBox: '0 0 ' + size.w + ' ' + size.h, class: 'aurora-accent', 'aria-hidden': 'true', focusable: 'false' });
        var defs = svgNode('defs', {});
        var gradient = svgNode('linearGradient', { id: id, x1: '0%', y1: '0%', x2: '100%', y2: '60%' });
        gradient.appendChild(svgNode('stop', { offset: '0%', 'stop-color': options.color }));
        gradient.appendChild(svgNode('stop', { offset: '100%', 'stop-color': options.color2 }));
        defs.appendChild(gradient); next.appendChild(defs);
        var shapeFn = SHAPES[options.shape] || SHAPES.underline;
        path = svgNode('path', { d: shapeFn(size.w, size.h), stroke: 'url(#' + id + ')', 'stroke-width': options.strokeWidth, pathLength: '1' });
        next.appendChild(path);
        next.style.setProperty('--aurora-accent-duration', options.duration + 'ms');
        next.style.setProperty('--aurora-accent-delay', options.delay + 'ms');
        next.style.setProperty('--aurora-accent-easing', EASINGS[options.easing] || EASINGS['ease-out']);
        if (drawn) next.classList.add('is-drawn');
        if (svg && svg.parentNode) svg.parentNode.replaceChild(next, svg);
        else target.appendChild(next);
        svg = next;
    }

    function draw() {
        if (destroyed || drawn) return;
        drawn = true;
        if (ctx.reducedMotion) { svg.classList.add('is-drawn'); return; }
        // Flush layout so the browser registers the pre-animation state
        // (stroke-dashoffset:1) before the class flips, or a trigger that
        // fires synchronously (e.g. "load") can skip the animation outright.
        void svg.getBoundingClientRect();
        svg.classList.add('is-visible');
    }

    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { if (!destroyed) build(); }, 120);
    }

    ctx.style('accent', css);

    var computedPosition = 'static';
    try { computedPosition = window.getComputedStyle(target).position || 'static'; } catch (error) { /* not in a browser */ }
    if (computedPosition === 'static') {
        target.style.position = 'relative';
        ownsPosition = true;
    }

    build();

    if (typeof ResizeObserver !== 'undefined') {
        var observer = new ResizeObserver(onResize);
        observer.observe(target);
        ctx.onDestroy(function () { observer.disconnect(); clearTimeout(resizeTimer); });
    }
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(function () { if (!destroyed) build(); });
    }

    if (options.trigger === 'load') draw();
    else if (options.trigger === 'hover') ctx.on(el, 'pointerenter', draw);
    else ctx.observe(el, { threshold: Math.min(options.threshold, .05), once: true, onEnter: draw });

    ctx.onDestroy(function () {
        destroyed = true;
        if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
        if (ownsPosition) target.style.position = '';
    });

    return {
        update: function (next) { options = next; drawn = false; build(); if (options.trigger === 'load') draw(); },
    };
}
