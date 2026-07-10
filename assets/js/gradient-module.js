/**
 * Aurora for Elementor — Frontend: Gradient Module
 *
 * Multi-stop gradients (3+ colors) on containers (background) and on
 * the Heading/Text Editor widgets (text), with an optional "mesh"
 * animation (blurred blobs, the same visual language as the brand
 * icons) or "loop" (hue rotation). The whole effect is resolved via
 * CSS — this file only reads the saved data (via the Elementor
 * Handler or data-attributes) and injects a dynamic stylesheet with
 * the gradient and, when animated, a per-instance @keyframes block
 * (each element can have different colors/speed).
 *
 * @package Aurora
 * @version 1.0.0
 */

/* global elementorFrontend, elementorModules, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    var instanceCounter = 0;

    /**
     * Returns (creating if needed) the dedicated <style> tag for a given
     * target element (the background host or the text node), reusing it
     * across re-runs instead of accumulating rules in a shared tag. Every
     * settings change (color, angle, animate toggle, etc.) re-applies the
     * gradient, and previously each re-run appended a brand new rule set
     * to a single global <style> tag without ever removing the previous
     * one — during an Elementor editor session (where onElementChange
     * fires on every slider drag) this silently accumulated hundreds of
     * orphaned @keyframes blocks. Using one tag per target element and
     * overwriting its textContent keeps things bounded.
     *
     * @param {HTMLElement} target
     * @returns {HTMLStyleElement}
     */
    function getStyleTag(target) {
        var tag = target._auroraGradientStyleTag;
        if (!tag || !tag.isConnected) {
            tag = document.createElement('style');
            target._auroraGradientStyleTag = tag;
            document.head.appendChild(tag);
        }
        return tag;
    }

    function injectCss(target, css) {
        getStyleTag(target).textContent = css;
    }

    /**
     * Reads an Elementor control value that may come as an object
     * `{size, unit}` (SLIDER) or already as a plain number/string.
     *
     * @param {*} value
     * @param {number} fallback
     * @returns {number}
     */
    function sizeOf(value, fallback) {
        if (value && typeof value === 'object' && 'size' in value) {
            var n = parseFloat(value.size);
            return isNaN(n) ? fallback : n;
        }
        var parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    /**
     * Builds the gradient CSS string from the type, angle (linear/conic),
     * and color stops. For "radial", an optional `spot` lets the caller
     * override the implicit centered circle with an explicit radius and
     * center position — used by the Follow Mouse spotlight effect to
     * recenter the gradient on the cursor on every mousemove.
     *
     * @param {string} type   linear | radial | conic
     * @param {number} angle
     * @param {Array}  stops  [{color, offset}]
     * @param {{radius:number, cx:number, cy:number}} [spot]
     * @returns {string}
     */
    function buildGradientCss(type, angle, stops, spot) {
        var stopsCss = stops
            .map(function (s) {
                var offset = s.offset;
                return (offset === null || typeof offset === 'undefined' || offset === '')
                    ? s.color
                    : s.color + ' ' + offset + '%';
            })
            .join(', ');

        if (type === 'radial') {
            if (spot) {
                return 'radial-gradient(circle ' + spot.radius + 'px at ' + spot.cx + '% ' + spot.cy + '%, ' + stopsCss + ')';
            }
            return 'radial-gradient(circle, ' + stopsCss + ')';
        }
        if (type === 'conic') {
            return 'conic-gradient(from ' + angle + 'deg, ' + stopsCss + ')';
        }
        return 'linear-gradient(' + angle + 'deg, ' + stopsCss + ')';
    }

    /**
     * Distributes one radial blob per color around a central circle —
     * the basis of the "mesh" effect used for container backgrounds.
     *
     * @param {Array} stops [{color}]
     * @returns {{image: string, positions: Array<{x:number,y:number}>}}
     */
    function buildMeshLayers(stops) {
        var n = stops.length;
        var positions = [];
        var layers = [];

        for (var i = 0; i < n; i++) {
            var angle = (360 / n) * i;
            var rad = (angle * Math.PI) / 180;
            var x = 50 + 32 * Math.cos(rad);
            var y = 50 + 32 * Math.sin(rad);
            positions.push({ x: x, y: y });
            layers.push(
                'radial-gradient(circle at ' + x.toFixed(1) + '% ' + y.toFixed(1) + '%, ' +
                stops[i].color + ' 0%, transparent 65%)'
            );
        }

        return { image: layers.join(', '), positions: positions };
    }

    function positionString(positions, dx, dy) {
        return positions
            .map(function (p) {
                return (p.x + dx).toFixed(1) + '% ' + (p.y + dy).toFixed(1) + '%';
            })
            .join(', ');
    }

    function parseStops(raw) {
        try {
            var stops = JSON.parse(raw || '[]');
            return Array.isArray(stops) ? stops.filter(function (s) { return s && s.color; }) : [];
        } catch (e) {
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FOLLOW MOUSE (SPOTLIGHT)
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Recenters a radial gradient on the cursor as it moves over `trackEl`,
    // writing the result directly onto `styleTarget.style.backgroundImage`
    // on every mousemove — the same approach as a React mousemove handler
    // recomputing a `radial-gradient(circle 600px at X% Y%, ...)` inline
    // style, just without a virtual DOM in between. `trackEl` and
    // `styleTarget` are the same element for backgrounds, but different for
    // text (the wrapper defines the tracked area, the heading/paragraph
    // node itself receives the background-clip:text gradient).

    var followMouseListeners = new WeakMap(); // trackEl -> mousemove handler

    /**
     * Detaches a previously-attached Follow Mouse listener, if any. Called
     * unconditionally at the top of applyBackground()/applyText() so
     * switching a zone away from Follow Mouse (or re-rendering it) never
     * leaves a stale mousemove listener running in the background.
     *
     * @param {HTMLElement} trackEl
     */
    function stopFollowMouse(trackEl) {
        var handler = followMouseListeners.get(trackEl);
        if (handler) {
            trackEl.removeEventListener('mousemove', handler);
            followMouseListeners.delete(trackEl);
        }
    }

    /**
     * @param {HTMLElement} trackEl     Element whose bounding box defines the 0-100% coordinate space.
     * @param {HTMLElement} styleTarget Element that receives the computed `background-image`.
     * @param {Object}      data
     */
    function startFollowMouse(trackEl, styleTarget, data) {
        var pos = { x: 50, y: 50 }; // centered until the first mousemove

        function render() {
            styleTarget.style.backgroundImage = buildGradientCss('radial', 0, data.stops, {
                radius: data.spotlightRadius,
                cx: pos.x,
                cy: pos.y,
            });
        }

        function handler(e) {
            var rect = trackEl.getBoundingClientRect();
            pos.x = rect.width ? ( ( e.clientX - rect.left ) / rect.width ) * 100 : 50;
            pos.y = rect.height ? ( ( e.clientY - rect.top ) / rect.height ) * 100 : 50;
            render();
        }

        trackEl.addEventListener('mousemove', handler);
        followMouseListeners.set(trackEl, handler);
        render();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EFFECT APPLICATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Applies the gradient as the element's background (containers).
     * Static: applied directly via inline style. Animated: via an
     * isolated ::before (z-index:-1 inside its own stacking context),
     * so that blur or hue-rotate never leaks into the container's content.
     * Follow Mouse: a live mousemove listener instead of either of those
     * — see startFollowMouse().
     *
     * @param {HTMLElement} el
     * @param {Object} data
     * @param {number} id
     */
    function applyBackground(el, data, id) {
        el.classList.remove('aurora-gradient-host');
        el.removeAttribute('data-aurora-gradient-instance');
        el.style.backgroundImage = '';
        injectCss(el, '');
        stopFollowMouse(el);

        if (data.followMouse) {
            startFollowMouse(el, el, data);
            return;
        }

        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        if (!data.animate) {
            el.style.backgroundImage = gradientCss;
            return;
        }

        el.classList.add('aurora-gradient-host');
        el.setAttribute('data-aurora-gradient-instance', id);

        var selector = '.aurora-gradient-host[data-aurora-gradient-instance="' + id + '"]';
        var css;

        if (data.style === 'loop') {
            css = selector + '::before{content:"";position:absolute;inset:0;' +
                'background-image:' + gradientCss + ';background-size:200% 200%;' +
                'z-index:-1;pointer-events:none;' +
                'animation:aurora-grad-loop-' + id + ' ' + data.speed + 's linear infinite;}' +
                '@keyframes aurora-grad-loop-' + id + '{' +
                '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        } else {
            var mesh = buildMeshLayers(data.stops);
            var posBase = positionString(mesh.positions, 0, 0);
            var posMid = positionString(mesh.positions, 8, -10);
            var blur = Math.max(18, Math.round(70 / mesh.positions.length));

            css = selector + '::before{content:"";position:absolute;inset:-25%;' +
                'background-image:' + mesh.image + ';background-repeat:no-repeat;' +
                'filter:blur(' + blur + 'px);z-index:-1;pointer-events:none;' +
                'animation:aurora-grad-mesh-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                '@keyframes aurora-grad-mesh-' + id + '{' +
                '0%{background-position:' + posBase + ';}' +
                '50%{background-position:' + posMid + ';}' +
                '100%{background-position:' + posBase + ';}}';
        }

        injectCss(el, css);
    }

    /**
     * Applies the gradient as text-fill on the real text node (Heading
     * or Text Editor) — has to be the text element itself, since
     * background-clip:text has no effect on the Elementor wrapper.
     *
     * @param {HTMLElement} textEl  Already-located node (.elementor-heading-title / .elementor-text-editor).
     * @param {HTMLElement} trackEl Element whose bounding box drives Follow Mouse (the outer wrapper).
     * @param {Object} data
     * @param {number} id
     */
    /**
     * Locates the leaf spans generated by the Text Animation module
     * (splitIntoChars/Words/Lines) so we can re-paint each with the
     * gradient CSS. Without this, splitting the text moves the actual
     * glyphs into child spans while background-clip:text stays on the
     * parent — the parent no longer has a direct text node to mask, and
     * the whole text visually disappears.
     */
    function findTextLeaves(textEl) {
        return textEl.querySelectorAll('.aurora-char, .aurora-word, .aurora-line-wrap .aurora-word, .letter, .word');
    }

    /**
     * Writes the shared background-clip:text incantation onto an element
     * — pulled out so both the parent text node AND the split-animation
     * leaf spans get the exact same paint. line-height + tiny vertical
     * padding stop tall accents (Ê, Õ, tildes) from being visually
     * clipped by the text-metric bounding box that background-clip uses.
     */
    function paintTextTarget(el, gradientCss) {
        el.style.webkitBackgroundClip = 'text';
        el.style.backgroundClip = 'text';
        el.style.color = 'transparent';
        el.style.webkitTextFillColor = 'transparent';
        el.style.backgroundImage = gradientCss;
    }

    function applyText(textEl, trackEl, data, id) {
        textEl.classList.remove('aurora-gradient-text');
        textEl.removeAttribute('data-aurora-gradient-instance');
        textEl.style.backgroundSize = '';
        injectCss(textEl, '');
        stopFollowMouse(trackEl);

        // Guard against accent/descender clipping when the browser
        // computes the text-bounds mask for background-clip:text —
        // tightly-set line-heights on Elementor headings cut off Ê/Õ/g
        // otherwise. Only writes inline if the user hasn't already set
        // their own values.
        if (!textEl.style.paddingTop)    textEl.style.paddingTop    = '0.1em';
        if (!textEl.style.paddingBottom) textEl.style.paddingBottom = '0.1em';
        var cs = getComputedStyle(textEl);
        if (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) < 1.2) {
            textEl.style.lineHeight = '1.25';
        }

        if (data.followMouse) {
            // Follow Mouse doesn't co-exist with the split-text path yet
            // — it drives the background off mousemove on the parent.
            textEl.style.webkitBackgroundClip = 'text';
            textEl.style.backgroundClip       = 'text';
            textEl.style.color                = 'transparent';
            textEl.style.webkitTextFillColor  = 'transparent';
            startFollowMouse(trackEl, textEl, data);
            return;
        }

        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        // If Text Animation has already split the element into per-char /
        // per-word spans, only the LEAF spans should carry the gradient.
        // Painting the parent AND the leaves would render two versions
        // stacked on top of each other: background-clip:text on the parent
        // paints through descendant text at the parent's (untransformed)
        // position, while each leaf paints again at its animated position
        // — producing the "letters bunched at the start + animated on top"
        // ghost the user reported.
        var leaves = findTextLeaves(textEl);

        if (leaves.length > 0) {
            // Split path: strip any gradient from the parent so it can't
            // ghost through, then paint each leaf individually.
            textEl.style.backgroundImage      = '';
            textEl.style.webkitBackgroundClip = '';
            textEl.style.backgroundClip       = '';
            // Keep color/text-fill transparent so any residual descendant
            // text that isn't a leaf (spaces between words, aria fallback)
            // doesn't render as solid theme color underneath.
            textEl.style.color                = 'transparent';
            textEl.style.webkitTextFillColor  = 'transparent';
            for (var li = 0; li < leaves.length; li++) {
                paintTextTarget(leaves[li], gradientCss);
            }
        } else {
            // No split yet — paint the parent normally. If Text Animation
            // splits later, the 'aurora:text-split' listener re-runs this
            // function and we take the branch above instead.
            paintTextTarget(textEl, gradientCss);
        }

        if (!data.animate) return;

        textEl.classList.add('aurora-gradient-text');
        textEl.setAttribute('data-aurora-gradient-instance', id);
        textEl.style.backgroundSize = '300% 300%';

        var selector = '.aurora-gradient-text[data-aurora-gradient-instance="' + id + '"]';
        var css;

        if (data.style === 'loop') {
            css = selector + '{animation:aurora-grad-text-hue-' + id + ' ' + data.speed + 's linear infinite;}' +
                '@keyframes aurora-grad-text-hue-' + id + '{' +
                '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        } else {
            css = selector + '{animation:aurora-grad-text-pan-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                '@keyframes aurora-grad-text-pan-' + id + '{' +
                '0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}';
        }

        injectCss(textEl, css);
    }

    /**
     * Single entry point: decides background vs. text using the
     * `data-aurora-gradient-target` attribute that PHP already computed
     * from the element's own type (class-gradient-controls.php,
     * TEXT_ELEMENTS = heading/text-editor, everything else = background).
     *
     * This used to be re-derived here via `wrapper.querySelector(
     * '.elementor-heading-title, .elementor-text-editor')`, which does a
     * *deep* search of the wrapper's whole subtree. That misfired badly
     * for the common case of a Section/Column/Container with a Heading
     * or Text Editor widget nested somewhere inside it: enabling the
     * background gradient on the container would instead find that
     * unrelated nested widget's text node and apply the gradient to it
     * as a text-fill, leaving the container itself without its
     * background and silently corrupting an inner heading's styling.
     * Trusting the PHP-computed attribute avoids the DOM search
     * entirely and always matches the element's actual type.
     *
     * @param {HTMLElement} wrapper
     * @param {Object} data
     */
    function applyGradient(wrapper, data) {
        if (!data.stops || data.stops.length < 2) return;

        var id = ++instanceCounter;

        // Target resolution — prefer an explicit `data.target` (set by the
        // Elementor Handler from the widget's own type), fall back to the
        // PHP-written attribute (needed in the pure-frontend fallback path,
        // where the JS handler never runs), and finally to background.
        //
        // The Handler override matters in the editor: when the user toggles
        // Enable Gradient on a Heading, the handler's run() fires BEFORE the
        // widget is re-rendered by PHP, so `data-aurora-gradient-target`
        // still holds a stale/missing value — trusting the attribute alone
        // silently applied the gradient as a background rectangle behind
        // the text instead of as a text-fill.
        var target = data.target || wrapper.getAttribute('data-aurora-gradient-target') || 'background';

        if (target === 'text') {
            var textEl = wrapper.querySelector('.elementor-heading-title, .elementor-text-editor') || wrapper;
            applyText(textEl, wrapper, data, id);
        } else {
            applyBackground(wrapper, data, id);
        }
    }

    /**
     * Reads the options from the data-attributes — used only in the
     * pure-frontend fallback (when Elementor's JS isn't available).
     *
     * @param {HTMLElement} el
     * @returns {Object}
     */
    function parseOptsFromDataset(el) {
        return {
            target: el.getAttribute('data-aurora-gradient-target') || 'background',
            type: el.getAttribute('data-aurora-gradient-type') || 'linear',
            angle: parseInt(el.getAttribute('data-aurora-gradient-angle'), 10) || 135,
            stops: parseStops(el.getAttribute('data-aurora-gradient-stops')),
            animate: el.getAttribute('data-aurora-gradient-animate') === '1',
            style: el.getAttribute('data-aurora-gradient-style') || 'mesh',
            speed: parseInt(el.getAttribute('data-aurora-gradient-speed'), 10) || 8,
            followMouse: el.getAttribute('data-aurora-gradient-follow-mouse') === '1',
            spotlightRadius: parseInt(el.getAttribute('data-aurora-gradient-spotlight-radius'), 10) || 600
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ELEMENTOR INTEGRATION — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Same pattern used in text-animations.js / children-animations.js:
    // onElementChange() reflects control changes instantly in the editor
    // preview; frontend/element_ready/global covers the first render both
    // in the editor and on the real site. Unlike the text module, this one
    // doesn't depend on any external library — so there's no
    // waitForLibs()/library polling here.

    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            return false;
        }

        function AuroraGradientHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraGradientHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraGradientHandler.prototype.constructor = AuroraGradientHandler;

        AuroraGradientHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_gradient_enable') === 'yes';
        };

        AuroraGradientHandler.prototype.getOpts = function () {
            var rawStops = this.getElementSettings('aurora_gradient_stops') || [];
            var stops = rawStops
                .map(function (stop) {
                    return {
                        color: stop.color || '#0afbc1',
                        offset: stop.offset ? sizeOf(stop.offset, null) : null
                    };
                })
                .filter(function (s) { return s.color; });

            var type = this.getElementSettings('aurora_gradient_type') || 'linear';

            // Same gating class-gradient-controls.php applies server-side:
            // Follow Mouse only makes sense for radial gradients, and
            // always wins over the time-based Animate option regardless of
            // what's still saved on it.
            var followMouse = 'radial' === type && this.getElementSettings('aurora_gradient_follow_mouse') === 'yes';

            return {
                type: type,
                angle: sizeOf(this.getElementSettings('aurora_gradient_angle'), 135),
                stops: stops,
                animate: !followMouse && this.getElementSettings('aurora_gradient_animate') === 'yes',
                style: this.getElementSettings('aurora_gradient_animation_style') || 'mesh',
                speed: sizeOf(this.getElementSettings('aurora_gradient_speed'), 8),
                followMouse: followMouse,
                spotlightRadius: sizeOf(this.getElementSettings('aurora_gradient_spotlight_radius'), 600)
            };
        };

        AuroraGradientHandler.prototype.run = function () {
            if (!this.isEnabled()) return;
            var el = this.$element[0];
            var opts = this.getOpts();
            // Derive target from the widget's own type class — matches the
            // TEXT_ELEMENTS list in class-gradient-controls.php. Beats
            // reading the PHP-written data-attribute in the editor, where
            // toggling Enable Gradient fires the handler before PHP has
            // re-rendered the wrapper's attributes.
            opts.target = el.matches('.elementor-widget-heading, .elementor-widget-text-editor') ? 'text' : 'background';
            applyGradient(el, opts);
        };

        AuroraGradientHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.run();

            // Re-run whenever Text Animation splits the wrapper's text
            // into per-char/word/line spans — its innerHTML rewrite blows
            // away any inline paint we may have set, and the new leaf
            // spans need the gradient CSS applied to them individually.
            var self = this;
            this.$element[0].addEventListener('aurora:text-split', function () {
                self.run();
            });
        };

        AuroraGradientHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_gradient_') === 0) {
                this.run();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            elementorFrontend.elementsHandler.addHandler(AuroraGradientHandler, { $element: $element });
        });

        return true;
    }

    var auroraGradientRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraGradientRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) {
            return false;
        }
        auroraGradientRegistered = registerHandler();
        return auroraGradientRegistered;
    }

    // Synchronous registration, the exact moment the script is evaluated —
    // same reason documented in text-animations.js: on the real frontend
    // Elementor can fire frontend/element_ready BEFORE any async callback,
    // and the event only fires once per element.
    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        $(window).on('elementor/frontend/init', function () {
            tryRegisterHandlerNow();
        });
        (function poll() {
            var tries = 0;
            var timer = setInterval(function () {
                tries++;
                if (tryRegisterHandlerNow() || tries > 50) {
                    clearInterval(timer);
                }
            }, 100);
        })();
    }

    function bootstrap() {
        // Fallback: no Elementor JS available — scan the page using the
        // data-aurora-gradient-* attributes rendered by PHP on the real frontend.
        if (typeof elementorFrontend === 'undefined') {
            document.querySelectorAll('[data-aurora-gradient-enable="1"]').forEach(function (el) {
                applyGradient(el, parseOptsFromDataset(el));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
