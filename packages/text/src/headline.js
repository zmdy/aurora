/* Original Aurora compositions; no Elementor code or assets are used here. */
var nextId = 0;
var NS = 'http://www.w3.org/2000/svg';
var SHAPES = {
    underline: ['M3 42 Q48 36 97 42'],
    'double-underline': ['M3 39 Q48 34 97 39', 'M8 47 Q52 41 93 46'],
    circle: ['M50 3 C112 1 111 48 50 47 C-12 46 -10 2 50 3'],
    'aurora-orbit': ['M4 34 C-9 5 70 -8 96 13 C112 38 30 59 4 34', 'M9 43 C44 57 90 30 94 7'],
    'aurora-wave': ['M2 40 C14 25 25 55 38 40 S62 25 74 40 S90 51 98 38', 'M4 46 C18 35 26 57 40 46 S65 33 80 45 S92 51 98 44'],
    'aurora-spark': ['M3 43 Q50 34 95 41', 'M86 11 L90 1 L94 11 L99 15 L94 19 L90 29 L86 19 L81 15 Z'],
};
var ENTRANCES = {
    'prism-rise': [{ opacity: 0, transform: 'translateY(.55em) skewX(-12deg)', filter: 'blur(6px)' }, { opacity: 1, transform: 'translateY(0) skewX(0)', filter: 'blur(0)' }],
    'comet-slide': [{ opacity: 0, transform: 'translateX(-.6em) scaleX(1.2)', filter: 'blur(5px)' }, { opacity: 1, transform: 'translateX(0) scaleX(1)', filter: 'blur(0)' }],
    'split-flap': [{ opacity: 0, transform: 'perspective(500px) rotateX(-80deg)', transformOrigin: '50% 100%' }, { opacity: 1, transform: 'perspective(500px) rotateX(0deg)', transformOrigin: '50% 100%' }],
    'soft-focus': [{ opacity: 0, filter: 'blur(12px)', transform: 'scale(.94)' }, { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }],
};
var CSS = `
.aurora-headline{overflow-wrap:anywhere;white-space:normal}
.aurora-headline__visual{white-space:pre-wrap}
.aurora-headline__center{display:inline-grid;position:relative;max-width:100%;vertical-align:baseline;isolation:isolate;line-height:inherit}
.aurora-headline__word{grid-area:1/1;min-width:0;max-width:100%;overflow-wrap:anywhere;position:relative;z-index:1;line-height:inherit}
.aurora-headline__shape{position:absolute;inset:-.13em -.06em;width:calc(100% + .12em);height:calc(100% + .26em);overflow:visible;pointer-events:none;z-index:0}
.aurora-headline__sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
`;

export function headlineWords(options, fallback) {
    var first = options.highlightedText.trim() || fallback.trim() || 'Aurora';
    var values = options.animationStyle === 'rotating' ? [first].concat(options.rotatingText.split(/\r?\n/)) : [first];
    return values.map(function (s) { return s.trim(); }).filter(function (s, i, all) { return s && all.indexOf(s) === i; });
}

export function initHeadline(el, options, ctx) {
    var target = options.target ? el.querySelector(options.target) || el : el;
    var savedNodes = Array.from(target.childNodes);
    var words = headlineWords(options, target.textContent);
    var index = 0, timer = null, destroyed = false, completed = false;
    var paused = !options.headlineAutoplay, hovering = false, focused = false;
    var rect = el.getBoundingClientRect();
    var inView = options.trigger === 'load' && rect.bottom >= 0 && rect.top < (window.innerHeight || 800);
    var animations = new Set();
    var paths = [];
    ctx.style('text-headline', CSS);
    function span(cls, text) {
        var node = document.createElement('span'); node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    var root = span('aurora-headline');
    var visual = span('aurora-headline__visual'); visual.setAttribute('aria-hidden', 'true');
    var center = span('aurora-headline__center');
    visual.appendChild(span('aurora-headline__before', options.beforeText.trim() ? options.beforeText.trim() + ' ' : ''));
    visual.appendChild(center);
    visual.appendChild(span('aurora-headline__after', options.afterText.trim() ? ' ' + options.afterText.trim() : ''));
    var wordNodes = words.map(function (word) { var node = span('aurora-headline__word', word); center.appendChild(node); return node; });
    var accessible = [options.beforeText.trim(), words.join(', '), options.afterText.trim()].filter(Boolean).join(' ');
    root.appendChild(span('aurora-headline__sr', accessible)); root.appendChild(visual);
    while (target.firstChild) target.removeChild(target.firstChild);
    target.appendChild(root);

    function svgNode(tag, attributes) {
        var node = document.createElementNS(NS, tag);
        Object.keys(attributes).forEach(function (key) { node.setAttribute(key, String(attributes[key])); });
        return node;
    }
    if (options.animationStyle === 'highlighted') {
        var id = 'aurora-headline-gradient-' + (++nextId);
        var svg = svgNode('svg', { viewBox: '0 0 100 50', preserveAspectRatio: 'none', class: 'aurora-headline__shape', 'aria-hidden': 'true', focusable: 'false' });
        var defs = svgNode('defs', {}), gradient = svgNode('linearGradient', { id: id, x1: '0%', y1: '0%', x2: '100%', y2: '60%' });
        gradient.appendChild(svgNode('stop', { offset: '0%', 'stop-color': options.headlineColor }));
        gradient.appendChild(svgNode('stop', { offset: '100%', 'stop-color': options.headlineColor2 }));
        defs.appendChild(gradient); svg.appendChild(defs);
        SHAPES[options.animationShape].forEach(function (d) {
            var path = svgNode('path', { d: d, fill: 'none', stroke: 'url(#' + id + ')', 'stroke-width': options.strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', pathLength: '1' });
            paths.push(path); svg.appendChild(path);
        });
        center.appendChild(svg);
    }

    function show() {
        wordNodes.forEach(function (node, i) { node.style.visibility = i === index ? 'visible' : 'hidden'; node.style.opacity = i === index ? '1' : '0'; });
        root.dataset.headlineIndex = String(index);
    }
    function clearTimer() { clearTimeout(timer); timer = null; }
    function stopAnimations() { animations.forEach(function (a) { a.cancel(); }); animations.clear(); }
    function animate(node, frames, delay) {
        if (ctx.reducedMotion || typeof node.animate !== 'function') return;
        var a = node.animate(frames, { duration: options.duration, delay: delay || 0, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'none' });
        animations.add(a);
        a.onfinish = function () { animations.delete(a); a.cancel(); };
    }
    function motion() {
        stopAnimations(); show();
        if (options.animationStyle === 'highlighted') {
            paths.forEach(function (path, i) { animate(path, [{ strokeDasharray: '1', strokeDashoffset: '1', opacity: .2 }, { strokeDasharray: '1', strokeDashoffset: '0', opacity: 1 }], i * options.duration * .12); });
        } else animate(wordNodes[index], ENTRANCES[options.rotationEffect]);
        ctx.emit('headline-change', { index: index, text: words[index], style: options.animationStyle });
    }
    function canPlay() { return !destroyed && !paused && !hovering && !focused && !document.hidden && inView && !ctx.reducedMotion; }
    function schedule(delay) {
        clearTimer();
        if (!canPlay() || completed) return;
        if (!options.headlineLoop && (options.animationStyle === 'highlighted' || index === words.length - 1)) { completed = true; return; }
        if (options.animationStyle === 'rotating' && words.length < 2) return;
        timer = setTimeout(function () {
            timer = null;
            if (!canPlay()) return;
            if (options.animationStyle === 'rotating') index = (index + 1) % words.length;
            motion(); schedule();
        }, delay === undefined ? options.duration * 1.12 + options.holdDuration : delay);
    }
    function sync() {
        if (!canPlay()) { clearTimer(); animations.forEach(function (a) { a.pause(); }); }
        else { animations.forEach(function (a) { a.play(); }); schedule(); }
    }
    function start() {
        clearTimer();
        if (!canPlay() || completed) return;
        timer = setTimeout(function () { timer = null; if (canPlay()) { motion(); schedule(); } }, options.delay);
    }
    function replay() { if (destroyed) return; index = 0; completed = false; paused = false; stopAnimations(); show(); start(); }
    ctx.onDestroy(function () {
        destroyed = true; clearTimer(); stopAnimations();
        while (target.firstChild) target.removeChild(target.firstChild);
        savedNodes.forEach(function (node) { target.appendChild(node); });
    });
    ctx.on(document, 'visibilitychange', sync);
    if (options.pauseOnHover) {
        ctx.on(el, 'pointerenter', function () { hovering = true; sync(); });
        ctx.on(el, 'pointerleave', function () { hovering = false; sync(); });
        ctx.on(el, 'focusin', function () { focused = true; sync(); });
        ctx.on(el, 'focusout', function (e) { focused = !!(e.relatedTarget && el.contains(e.relatedTarget)); sync(); });
    }
    ctx.onReducedMotionChange(function () {
        clearTimer(); stopAnimations(); show();
        if (!ctx.reducedMotion) start();
    });
    ctx.observe(el, {
        threshold: Math.min(options.threshold, .05), once: false,
        onEnter: function () { var wasVisible = inView; inView = true; if (!wasVisible) { if (animations.size) sync(); else start(); } },
        onLeave: function () { inView = false; sync(); },
    });
    show(); start();
    return {
        replay: replay,
        api: {
            pause: function () { paused = true; sync(); },
            play: function () { paused = false; if (completed) replay(); else sync(); },
            next: function () { if (destroyed || options.animationStyle !== 'rotating') return; index = (index + 1) % words.length; completed = false; motion(); schedule(); },
            get index() { return index; },
        },
    };
}
