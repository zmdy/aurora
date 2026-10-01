/* Original Aurora compositions; no Elementor code or assets are used here. */
import { createHighlighter } from './effects/text-highlighter.js';
import { LETTER_EFFECTS, ROTATION_CSS, rotateLetters } from './headline-rotation.js';
var nextId = 0;
var NS = 'http://www.w3.org/2000/svg';
var SHAPES = {
    underline: ['M8 85 C112 79 258 80 391 84'],
    'double-underline': ['M8 82 C118 77 267 79 392 82', 'M26 92 C135 88 260 88 376 90'],
    circle: ['M204 7 C89 2 5 19 6 49 C7 80 105 95 207 93 C322 91 395 76 394 47 C393 22 310 6 204 7'],
    'aurora-orbit': ['M26 73 C-8 52 24 19 153 10 C277 1 380 14 393 42 C403 68 313 91 187 93 C95 94 42 84 26 73', 'M61 89 C154 106 296 90 359 66'],
    'aurora-wave': ['M8 85 C38 79 62 79 88 85 S138 91 164 85 S214 79 240 85 S290 91 316 85 S365 79 392 85', 'M33 94 C131 90 263 91 368 93'],
    'aurora-spark': ['M8 86 C112 80 259 81 390 85', 'M397 7 Q398 16 407 17 Q398 18 397 27 Q396 18 387 17 Q396 16 397 7Z'],
    zigzag: ['M8 88 L38 70 L68 88 L98 70 L128 88 L158 70 L188 88 L218 70 L248 88 L278 70 L308 88 L338 70 L368 88 L392 78'],
    strike: ['M8 49 C140 46 260 46 392 49'],
    'aurora-frame': ['M6 26 L6 6 L26 6 M374 6 L394 6 L394 26 M394 74 L394 94 L374 94 M26 94 L6 94 L6 74'],
};
var ENTRANCES = {
    'prism-rise': [{ opacity: 0, transform: 'translateY(.55em) skewX(-12deg)', filter: 'blur(6px)' }, { opacity: 1, transform: 'translateY(0) skewX(0)', filter: 'blur(0)' }],
    'comet-slide': [{ opacity: 0, transform: 'translateX(-.6em) scaleX(1.2)', filter: 'blur(5px)' }, { opacity: 1, transform: 'translateX(0) scaleX(1)', filter: 'blur(0)' }],
    'split-flap': [{ opacity: 0, transform: 'perspective(500px) rotateX(-80deg)', transformOrigin: '50% 100%' }, { opacity: 1, transform: 'perspective(500px) rotateX(0deg)', transformOrigin: '50% 100%' }],
    'soft-focus': [{ opacity: 0, filter: 'blur(12px)', transform: 'scale(.94)' }, { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }],
    'curtain-wipe': [{ opacity: 1, clipPath: 'inset(0 0% 0 100%)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0%)' }],
    'drop-bounce': [
        { opacity: 0, transform: 'translateY(-1.1em) scale(.9)' },
        { opacity: 1, transform: 'translateY(.12em) scale(1.03)', offset: .65 },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
    ],
};
// Matched exits so the outgoing word animates out while the next one enters —
// the overlap (and the wrapper-width tween) is what makes Elementor Pro's
// rotator read as a single, deliberate motion instead of a hard cut. Letter
// effects (and anything without a bespoke exit) fall back to DEFAULT_EXIT.
var EXITS = {
    'prism-rise': [{ opacity: 1, transform: 'translateY(0) skewX(0)', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-.5em) skewX(10deg)', filter: 'blur(6px)' }],
    'comet-slide': [{ opacity: 1, transform: 'translateX(0) scaleX(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'translateX(.6em) scaleX(1.25)', filter: 'blur(5px)' }],
    'split-flap': [{ opacity: 1, transform: 'perspective(500px) rotateX(0deg)', transformOrigin: '50% 0%' }, { opacity: 0, transform: 'perspective(500px) rotateX(80deg)', transformOrigin: '50% 0%' }],
    'soft-focus': [{ opacity: 1, filter: 'blur(0)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(12px)', transform: 'scale(1.06)' }],
    'curtain-wipe': [{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }, { opacity: 1, clipPath: 'inset(0 100% 0 0)' }],
    'drop-bounce': [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(.8em) scale(.92)' }],
};
var DEFAULT_EXIT = [{ opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-.32em)', filter: 'blur(4px)' }];
var CSS = `
.aurora-headline{overflow-wrap:anywhere;white-space:normal}
.aurora-headline__visual{white-space:pre-wrap}
.aurora-headline__center{display:inline-grid;position:relative;max-width:100%;vertical-align:baseline;isolation:isolate;line-height:inherit}
.aurora-headline__word{grid-area:1/1;min-width:0;max-width:100%;overflow-wrap:anywhere;position:relative;z-index:1;line-height:inherit}
.aurora-headline__center--rotate{display:inline-block;max-width:none;overflow:visible;transition:width .42s cubic-bezier(.22,1,.36,1);will-change:width}
.aurora-headline__center--rotate .aurora-headline__word{position:absolute;left:0;top:0;width:max-content;max-width:none;overflow-wrap:normal;white-space:nowrap}
.aurora-headline__center--rotate .aurora-headline__word--active{position:relative}
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
    var paths = [], marker = null;
    ctx.style('text-headline', CSS + ROTATION_CSS);
    function span(cls, text) {
        var node = document.createElement('span'); node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    var root = span('aurora-headline');
    var visual = span('aurora-headline__visual'); visual.setAttribute('aria-hidden', 'true');
    var center = span('aurora-headline__center');
    if (options.animationStyle === 'rotating') center.classList.add('aurora-headline__center--rotate');
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
    if (options.animationStyle === 'highlighted' && options.animationShape === 'text-highlighter') {
        marker = createHighlighter(wordNodes[0], words[0], options.headlineColor);
        marker.className = 'aurora-headline__marker';
        marker.style.transform = 'scaleX(1) rotate(-1deg)';
        marker.style.background = 'linear-gradient(100deg, color-mix(in srgb, ' + options.headlineColor + ' 55%, transparent), color-mix(in srgb, ' + options.headlineColor2 + ' 55%, transparent))';
        center.appendChild(marker);
        wordNodes[0].textContent = words[0];
    } else if (options.animationStyle === 'highlighted') {
        var id = 'aurora-headline-gradient-' + (++nextId);
        var svg = svgNode('svg', { viewBox: '0 0 400 100', preserveAspectRatio: 'none', class: 'aurora-headline__shape', 'aria-hidden': 'true', focusable: 'false' });
        var defs = svgNode('defs', {}), gradient = svgNode('linearGradient', { id: id, x1: '0%', y1: '0%', x2: '100%', y2: '60%' });
        gradient.appendChild(svgNode('stop', { offset: '0%', 'stop-color': options.headlineColor }));
        gradient.appendChild(svgNode('stop', { offset: '100%', 'stop-color': options.headlineColor2 }));
        defs.appendChild(gradient); svg.appendChild(defs);
        SHAPES[options.animationShape].forEach(function (d, i) {
            var path = svgNode('path', { d: d, fill: 'none', stroke: 'url(#' + id + ')', 'stroke-width': options.strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', pathLength: '100' });
            if (i) { path.setAttribute('stroke-width', String(options.strokeWidth * .7)); path.setAttribute('opacity', '.65'); }
            paths.push(path); svg.appendChild(path);
        });
        center.appendChild(svg);
    }

    var widthArmed = false;
    // Pin the center to the live width of the active phrase so the CSS width
    // transition can tween between phrases of different lengths (this is what
    // keeps the before/after text and the shape hugging the current word,
    // exactly like Elementor Pro's dynamic wrapper). The first set is made
    // transition-less so the headline doesn't grow from zero on load.
    function setRotWidth(i) {
        if (options.animationStyle !== 'rotating') return;
        var node = wordNodes[i];
        if (!node || typeof node.getBoundingClientRect !== 'function') return;
        var width = node.getBoundingClientRect().width;
        if (!width) return;
        if (!widthArmed) {
            center.style.transition = 'none';
            center.style.width = width + 'px';
            void center.offsetWidth;
            center.style.transition = '';
            widthArmed = true;
        } else {
            center.style.width = width + 'px';
        }
    }
    function revealRotate(fromIndex) {
        if (fromIndex === undefined) fromIndex = index;
        wordNodes.forEach(function (node, i) {
            var active = i === index;
            node.classList.toggle('aurora-headline__word--active', active);
            if (active) { node.style.visibility = 'visible'; node.style.opacity = '1'; }
            else if (i === fromIndex) { node.style.visibility = 'visible'; }
            else { node.style.visibility = 'hidden'; node.style.opacity = '0'; }
        });
        root.dataset.headlineIndex = String(index);
        setRotWidth(index);
    }
    function show() {
        if (options.animationStyle === 'rotating') { revealRotate(index); return; }
        wordNodes.forEach(function (node, i) { node.style.visibility = i === index ? 'visible' : 'hidden'; node.style.opacity = i === index ? '1' : '0'; });
        root.dataset.headlineIndex = String(index);
    }
    function clearTimer() { clearTimeout(timer); timer = null; }
    function stopAnimations() {
        animations.forEach(function (a) { a.cancel(); }); animations.clear();
        wordNodes.forEach(function (node, i) { node.textContent = words[i]; });
        paths.forEach(function (path) { path.style.opacity = ''; });
        if (marker) marker.style.opacity = '';
    }
    function animate(node, frames, delay, settings, finish) {
        if (ctx.reducedMotion || typeof node.animate !== 'function') { if (finish) finish(); return; }
        var a = node.animate(frames, Object.assign({ duration: options.duration, delay: delay || 0, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }, settings));
        animations.add(a);
        a.onfinish = function () { if (finish) finish(); animations.delete(a); a.cancel(); };
    }
    function cycleDuration() {
        if (options.animationStyle === 'highlighted') return options.duration * (paths.length > 1 ? 1.35 : 1) + options.holdDuration + (options.headlineLoop ? 220 : 0);
        var extra = LETTER_EFFECTS.indexOf(options.rotationEffect) >= 0 ? options.duration * .8 : options.duration * .12;
        return options.duration + extra + options.holdDuration;
    }
    function motion(fromIndex) {
        if (fromIndex === undefined) fromIndex = index;
        stopAnimations();
        if (options.animationStyle === 'rotating') revealRotate(fromIndex); else show();
        if (ctx.reducedMotion) return;
        if (marker) {
            var duration = options.headlineLoop ? cycleDuration() : options.duration;
            var drawn = options.duration / duration;
            var frames = [
                { transform: 'scaleX(0) rotate(-1deg)', opacity: 1, offset: 0, easing: 'cubic-bezier(.455,.03,.515,.955)' },
                { transform: 'scaleX(1) rotate(-1deg)', opacity: 1, offset: drawn }
            ];
            if (options.headlineLoop) frames.push(
                { transform: 'scaleX(1) rotate(-1deg)', opacity: 1, offset: 1 - 220 / duration, filter: 'blur(0)' },
                { transform: 'scaleX(1) rotate(-1deg)', opacity: 0, offset: 1, filter: 'blur(4px)' }
            );
            animate(marker, frames, 0, { duration: duration, easing: 'linear' }, options.headlineLoop ? function () { marker.style.opacity = '0'; } : undefined);
        } else if (options.animationStyle === 'highlighted') {
            paths.forEach(function (path, i) {
                var delay = i * options.duration * .8;
                var drawDuration = options.duration * (i ? .55 : 1);
                var duration = options.headlineLoop ? cycleDuration() - delay : drawDuration;
                var drawn = options.headlineLoop ? drawDuration / duration : 1;
                var alpha = i ? .65 : 1;
                var frames = [
                    { strokeDasharray: '100 100', strokeDashoffset: '100', opacity: 0, offset: 0 },
                    { strokeDasharray: '100 100', strokeDashoffset: '98', opacity: alpha, offset: drawn * .08 },
                    { strokeDasharray: '100 100', strokeDashoffset: '0', opacity: alpha, offset: drawn }
                ];
                if (options.headlineLoop) frames.push(
                    { strokeDasharray: '100 100', strokeDashoffset: '0', opacity: alpha, offset: 1 - 220 / duration, filter: 'blur(0)' },
                    { strokeDasharray: '100 100', strokeDashoffset: '0', opacity: 0, offset: 1, filter: 'blur(3px)' }
                );
                animate(path, frames, delay, { duration: duration, easing: 'linear' }, options.headlineLoop ? function () { path.style.opacity = '0'; } : undefined);
            });
        } else {
            if (fromIndex !== index) {
                var outgoing = wordNodes[fromIndex];
                outgoing.style.visibility = 'visible';
                animate(outgoing, EXITS[options.rotationEffect] || DEFAULT_EXIT, 0, { fill: 'both', easing: 'cubic-bezier(.4,0,1,1)' }, (function (node) {
                    return function () { node.style.visibility = 'hidden'; node.style.opacity = '0'; node.style.filter = ''; node.style.clipPath = ''; };
                })(outgoing));
            }
            if (ENTRANCES[options.rotationEffect]) animate(wordNodes[index], ENTRANCES[options.rotationEffect]);
            else rotateLetters(wordNodes[index], words[index], options, animate);
        }
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
            var from = index;
            if (options.animationStyle === 'rotating') index = (index + 1) % words.length;
            motion(from); schedule();
        }, delay === undefined ? cycleDuration() : delay);
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
    // Keep the pinned wrapper width correct across viewport/font changes,
    // without animating the correction.
    ctx.on(window, 'resize', function () {
        if (destroyed || options.animationStyle !== 'rotating') return;
        var node = wordNodes[index];
        if (!node || typeof node.getBoundingClientRect !== 'function') return;
        var width = node.getBoundingClientRect().width;
        if (!width) return;
        center.style.transition = 'none';
        center.style.width = width + 'px';
        void center.offsetWidth;
        center.style.transition = '';
    });
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
            next: function () { if (destroyed || options.animationStyle !== 'rotating') return; var from = index; index = (index + 1) % words.length; completed = false; motion(from); schedule(); },
            get index() { return index; },
        },
    };
}
