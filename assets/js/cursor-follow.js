/**
 * Aurora for Elementor — Frontend: Cursor Follow
 *
 * A two-part custom cursor — an inner dot that tracks the mouse
 * instantly and an outer ring that trails behind it — active while the
 * pointer is inside any element that has this module enabled ("zones").
 * A single dot/ring pair is shared across the whole page: when the
 * mouse enters a zone, the pair adopts that zone's configured colors,
 * sizes, and hover selectors; when it leaves the last active zone, the
 * pair hides and the native cursor takes back over (zones don't force
 * `cursor:none` via JS — see cursor-follow.css, which scopes it to
 * `[data-aurora-cursor-enable="1"]`).
 *
 * Zones can be nested (e.g. a widget-level zone inside a section-level
 * one); the most recently entered zone wins, and leaving it reveals
 * whichever zone is still active underneath, tracked with a small stack.
 *
 * @package Aurora
 * @version 1.0.0
 */

/* global elementorFrontend, elementorModules, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // ZONE REGISTRY
    // ─────────────────────────────────────────────────────────────────────────

    var zoneConfigs = new Map();  // wrapper -> opts
    var zoneStack   = [];         // wrappers currently under the mouse, most recent last

    /**
     * Normalizes an Elementor slider value ({size, unit}, number, or string).
     *
     * @param {*}      val
     * @param {number} fallback
     * @returns {number}
     */
    function sizeOf(val, fallback) {
        if (val && typeof val === 'object' && typeof val.size !== 'undefined') {
            var fromObj = parseFloat(val.size);
            return isNaN(fromObj) ? fallback : fromObj;
        }
        var num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    }

    /**
     * Sanitizes a CSS selector (same whitelist used elsewhere in Aurora),
     * since values read from the Elementor settings model come straight
     * from the model, without the sanitization before_render applies on
     * the frontend.
     *
     * @param {string} raw
     * @param {string} fallback
     * @returns {string}
     */
    function sanitizeSelector(raw, fallback) {
        var selector = (raw || '').replace(/[^a-zA-Z0-9_\-.\s,:#>+~[\]=^$*|()]/g, '');
        return selector || fallback;
    }

    function hexToRgb(hex) {
        hex = (hex || '').replace('#', '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        var n = parseInt(hex, 16);
        if (hex.length !== 6 || isNaN(n)) {
            return { r: 124, g: 108, b: 255 };
        }
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    /**
     * Attaches the mouseenter/mouseleave listeners that push/pop a
     * wrapper on the shared zone stack. Bound only once per wrapper —
     * safe to call on every settings change, since re-registering the
     * same wrapper just updates its stored config (see registerZone()).
     *
     * @param {HTMLElement} wrapper
     */
    function bindZoneEvents(wrapper) {
        if (wrapper._auroraCursorZoneBound) return;
        wrapper._auroraCursorZoneBound = true;

        wrapper.addEventListener('mouseenter', function () {
            if (!zoneConfigs.has(wrapper)) return; // disabled since binding
            var idx = zoneStack.indexOf(wrapper);
            if (idx !== -1) zoneStack.splice(idx, 1);
            zoneStack.push(wrapper);
            updateAppearance();
        });

        wrapper.addEventListener('mouseleave', function () {
            var idx = zoneStack.indexOf(wrapper);
            if (idx !== -1) zoneStack.splice(idx, 1);
            updateAppearance();
        });
    }

    /**
     * Registers (or updates) a zone's configuration and makes sure its
     * enter/leave listeners are attached.
     *
     * @param {HTMLElement} wrapper
     * @param {Object}      opts
     */
    function registerZone(wrapper, opts) {
        zoneConfigs.set(wrapper, opts);
        bindZoneEvents(wrapper);
    }

    /**
     * Disables a zone without detaching its listeners (they simply become
     * no-ops via the zoneConfigs.has() guard in the mouseenter handler).
     *
     * @param {HTMLElement} wrapper
     */
    function teardownZone(wrapper) {
        zoneConfigs.delete(wrapper);
        var idx = zoneStack.indexOf(wrapper);
        if (idx !== -1) zoneStack.splice(idx, 1);
        updateAppearance();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CURSOR DOM + APPEARANCE
    // ─────────────────────────────────────────────────────────────────────────

    var dotEl  = null;
    var ringEl = null;

    function ensureCursorEls() {
        if (dotEl && ringEl) return;

        dotEl = document.createElement('div');
        dotEl.className = 'aurora-cursor-dot';
        dotEl.setAttribute('aria-hidden', 'true');

        ringEl = document.createElement('div');
        ringEl.className = 'aurora-cursor-ring';
        ringEl.setAttribute('aria-hidden', 'true');

        document.body.appendChild(dotEl);
        document.body.appendChild(ringEl);
    }

    // Current pointer position and hover-derived scale/color state, applied
    // to the DOM by render() below. Kept as plain module-level state instead
    // of stashing values on the elements themselves, so position updates
    // (every mousemove) and hover-state updates (only when the target
    // changes) can both call the same single render() without stepping on
    // each other.
    var pointerX = -100;
    var pointerY = -100;
    var dotScale = 1;
    var ringScale = 1;

    /**
     * Applies the current position + scale to both elements in one place,
     * so onMouseMove() and updateHoverState() never disagree about what
     * the other last wrote to `transform`. `translate(-50%,-50%)` keeps
     * both elements centered on the pointer regardless of their
     * configured size, so sizing never has to be paired with a matching
     * negative margin in CSS.
     */
    function render() {
        if (!dotEl || !ringEl) return;
        var pos = 'translate3d(' + pointerX + 'px,' + pointerY + 'px,0) translate(-50%,-50%) ';
        dotEl.style.transform  = pos + 'scale(' + dotScale + ')';
        ringEl.style.transform = pos + 'scale(' + ringScale + ')';
    }

    /**
     * Restyles the dot/ring for whichever zone is currently on top of the
     * stack, and shows/hides the pair depending on whether any zone is
     * active at all. Does not touch position/scale — those are driven by
     * render(), independently of which zone is active.
     */
    function updateAppearance() {
        ensureCursorEls();

        var zone = zoneStack.length ? zoneConfigs.get(zoneStack[zoneStack.length - 1]) : null;

        if (!zone) {
            dotEl.style.opacity = '0';
            ringEl.style.opacity = '0';
            return;
        }

        dotEl.style.opacity = '1';
        dotEl.style.width  = zone.dotSize + 'px';
        dotEl.style.height = zone.dotSize + 'px';
        dotEl.style.background = zone.dotColor;

        ringEl.style.opacity = '1';
        ringEl.style.width  = zone.ringSize + 'px';
        ringEl.style.height = zone.ringSize + 'px';
        // Only the trailing movement uses this duration; color/border/opacity
        // transitions have their own fixed, fast duration in the CSS.
        ringEl.style.setProperty('--aurora-cursor-trail', zone.trailDelay + 'ms');

        var hoverTarget = ( typeof document.elementFromPoint === 'function' )
            ? document.elementFromPoint(pointerX, pointerY)
            : null;
        updateHoverState(hoverTarget);
    }

    /**
     * Figures out the current hover state (none / interactive / image)
     * for the active zone, based on its configured selectors, and
     * applies the corresponding ring scale + accent color swap.
     *
     * @param {EventTarget} target
     */
    function updateHoverState(target) {
        if (!zoneStack.length || !dotEl || !ringEl) return;

        var zone = zoneConfigs.get(zoneStack[zoneStack.length - 1]);
        if (!zone) return;

        var isImage = target instanceof Element && !!target.closest(zone.imageSelector);
        var isInteractive = !isImage && target instanceof Element && !!target.closest(zone.interactiveSelector);

        ringScale = isImage ? zone.imageScale : (isInteractive ? zone.interactiveScale : 1);
        dotScale  = (isImage || isInteractive) ? 0.6 : 1;

        var swatch = isImage ? hexToRgb(zone.dotColor) : hexToRgb(zone.ringColor);
        var alpha  = isImage ? 0.15 : 0.12;
        ringEl.style.borderColor = isImage ? zone.dotColor : zone.ringColor;
        ringEl.style.backgroundColor = 'rgba(' + swatch.r + ',' + swatch.g + ',' + swatch.b + ',' + alpha + ')';

        render();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GLOBAL MOUSE TRACKING
    // ─────────────────────────────────────────────────────────────────────────

    var cursorTicking = false;
    function onMouseMove(e) {
        pointerX = e.clientX;
        pointerY = e.clientY;

        if (!zoneStack.length || cursorTicking) return;
        cursorTicking = true;
        requestAnimationFrame(function() {
            ensureCursorEls();
            updateHoverState(e.target);
            render();
            cursorTicking = false;
        });
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true });

    // ─────────────────────────────────────────────────────────────────────────
    // ELEMENTOR INTEGRATION — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Same pattern used across every Aurora module: onElementChange()
    // reflects control changes instantly in the editor preview;
    // frontend/element_ready/global covers the first render both in the
    // editor and on the real site.

    function readOptsFromHandler(handler) {
        return {
            dotColor:            handler.getElementSettings('aurora_cursor_dot_color') || '#ff7a2f',
            ringColor:           handler.getElementSettings('aurora_cursor_ring_color') || '#7c6cff',
            dotSize:             sizeOf(handler.getElementSettings('aurora_cursor_dot_size'), 8),
            ringSize:            sizeOf(handler.getElementSettings('aurora_cursor_ring_size'), 24),
            trailDelay:          sizeOf(handler.getElementSettings('aurora_cursor_trail_delay'), 150),
            interactiveSelector: sanitizeSelector(handler.getElementSettings('aurora_cursor_interactive_selector'), 'a, button, .cursor-pointer'),
            interactiveScale:    sizeOf(handler.getElementSettings('aurora_cursor_interactive_scale'), 1.5),
            imageSelector:       sanitizeSelector(handler.getElementSettings('aurora_cursor_image_selector'), 'img, .zoom-target'),
            imageScale:          sizeOf(handler.getElementSettings('aurora_cursor_image_scale'), 2.33),
        };
    }

    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            return false;
        }

        function AuroraCursorFollowHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraCursorFollowHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraCursorFollowHandler.prototype.constructor = AuroraCursorFollowHandler;

        AuroraCursorFollowHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_cursor_enable') === 'yes';
        };

        AuroraCursorFollowHandler.prototype.run = function () {
            var wrapper = this.$element[0];
            if (!this.isEnabled()) {
                teardownZone(wrapper);
                return;
            }
            registerZone(wrapper, readOptsFromHandler(this));
        };

        AuroraCursorFollowHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.run();
        };

        AuroraCursorFollowHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_cursor_') === 0) {
                this.run();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            elementorFrontend.elementsHandler.addHandler(AuroraCursorFollowHandler, { $element: $element });
        });

        return true;
    }

    var auroraCursorHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraCursorHandlerRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) {
            return false;
        }
        auroraCursorHandlerRegistered = registerHandler();
        return auroraCursorHandlerRegistered;
    }

    // Synchronous registration, the exact moment the script is evaluated —
    // same reason documented across every other Aurora module: on the
    // real frontend Elementor can fire frontend/element_ready BEFORE any
    // async callback, and the event only fires once per element.
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

    // ─────────────────────────────────────────────────────────────────────────
    // RAW-FRONTEND FALLBACK (no Elementor JS available)
    // ─────────────────────────────────────────────────────────────────────────

    function parseOptsFromDataset(el) {
        var ds = el.dataset;
        return {
            dotColor:            ds.auroraCursorDotColor || '#ff7a2f',
            ringColor:           ds.auroraCursorRingColor || '#7c6cff',
            dotSize:             parseFloat(ds.auroraCursorDotSize) || 8,
            ringSize:            parseFloat(ds.auroraCursorRingSize) || 24,
            trailDelay:          parseFloat(ds.auroraCursorTrailDelay) || 150,
            interactiveSelector: ds.auroraCursorInteractiveSelector || 'a, button, .cursor-pointer',
            interactiveScale:    parseFloat(ds.auroraCursorInteractiveScale) || 1.5,
            imageSelector:       ds.auroraCursorImageSelector || 'img, .zoom-target',
            imageScale:          parseFloat(ds.auroraCursorImageScale) || 2.33,
        };
    }

    function bootstrap() {
        if (typeof elementorFrontend === 'undefined') {
            document.querySelectorAll('[data-aurora-cursor-enable="1"]').forEach(function (el) {
                registerZone(el, parseOptsFromDataset(el));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
