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
     * Returns (creating if needed) the <style> tag where each instance's
     * dynamic rules are accumulated.
     *
     * @returns {HTMLStyleElement}
     */
    function getStyleTag() {
        var tag = document.getElementById('aurora-gradient-dynamic-styles');
        if (!tag) {
            tag = document.createElement('style');
            tag.id = 'aurora-gradient-dynamic-styles';
            document.head.appendChild(tag);
        }
        return tag;
    }

    function injectCss(css) {
        getStyleTag().appendChild(document.createTextNode(css));
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
     * Builds the static gradient CSS string from the type, angle
     * (linear/conic), and color stops.
     *
     * @param {string} type   linear | radial | conic
     * @param {number} angle
     * @param {Array}  stops  [{color, offset}]
     * @returns {string}
     */
    function buildGradientCss(type, angle, stops) {
        var stopsCss = stops
            .map(function (s) {
                var offset = s.offset;
                return (offset === null || typeof offset === 'undefined' || offset === '')
                    ? s.color
                    : s.color + ' ' + offset + '%';
            })
            .join(', ');

        if (type === 'radial') {
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
    // EFFECT APPLICATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Applies the gradient as the element's background (containers).
     * Static: applied directly via inline style. Animated: via an
     * isolated ::before (z-index:-1 inside its own stacking context),
     * so that blur or hue-rotate never leaks into the container's content.
     *
     * @param {HTMLElement} el
     * @param {Object} data
     * @param {number} id
     */
    function applyBackground(el, data, id) {
        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        el.classList.remove('aurora-gradient-host');
        el.removeAttribute('data-aurora-gradient-instance');
        el.style.backgroundImage = '';

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

        injectCss(css);
    }

    /**
     * Applies the gradient as text-fill on the real text node (Heading
     * or Text Editor) — has to be the text element itself, since
     * background-clip:text has no effect on the Elementor wrapper.
     *
     * @param {HTMLElement} textEl Already-located node (.elementor-heading-title / .elementor-text-editor)
     * @param {Object} data
     * @param {number} id
     */
    function applyText(textEl, data, id) {
        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        textEl.classList.remove('aurora-gradient-text');
        textEl.removeAttribute('data-aurora-gradient-instance');
        textEl.style.backgroundSize = '';

        textEl.style.backgroundImage = gradientCss;
        textEl.style.webkitBackgroundClip = 'text';
        textEl.style.backgroundClip = 'text';
        textEl.style.color = 'transparent';
        textEl.style.webkitTextFillColor = 'transparent';

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

        injectCss(css);
    }

    /**
     * Single entry point: decides background vs. text based on the
     * presence of the real text node inside the wrapper — more reliable
     * than relying on the element type, and behaves the same in the
     * editor and on the frontend.
     *
     * @param {HTMLElement} wrapper
     * @param {Object} data
     */
    function applyGradient(wrapper, data) {
        if (!data.stops || data.stops.length < 2) return;

        var id = ++instanceCounter;
        var textEl = wrapper.querySelector('.elementor-heading-title, .elementor-text-editor');

        if (textEl) {
            applyText(textEl, data, id);
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
            type: el.getAttribute('data-aurora-gradient-type') || 'linear',
            angle: parseInt(el.getAttribute('data-aurora-gradient-angle'), 10) || 135,
            stops: parseStops(el.getAttribute('data-aurora-gradient-stops')),
            animate: el.getAttribute('data-aurora-gradient-animate') === '1',
            style: el.getAttribute('data-aurora-gradient-style') || 'mesh',
            speed: parseInt(el.getAttribute('data-aurora-gradient-speed'), 10) || 8
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

            return {
                type: this.getElementSettings('aurora_gradient_type') || 'linear',
                angle: sizeOf(this.getElementSettings('aurora_gradient_angle'), 135),
                stops: stops,
                animate: this.getElementSettings('aurora_gradient_animate') === 'yes',
                style: this.getElementSettings('aurora_gradient_animation_style') || 'mesh',
                speed: sizeOf(this.getElementSettings('aurora_gradient_speed'), 8)
            };
        };

        AuroraGradientHandler.prototype.run = function () {
            if (!this.isEnabled()) return;
            applyGradient(this.$element[0], this.getOpts());
        };

        AuroraGradientHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.run();
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
