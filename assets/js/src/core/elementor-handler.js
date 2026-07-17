/**
 * Aurora Text Animation — Elementor Frontend Handler + bootstrap.
 *
 * Shared verbatim between the editor bundle and the frontend core bundle:
 * the only thing that differs between the two contexts is WHICH effects
 * are already sitting in the registry when this code runs (all of them,
 * in the editor; only the ones PHP decided to enqueue, on the real
 * frontend) — this file doesn't need to know or care which.
 */

/* global gsap, anime, elementorFrontend, elementorModules, jQuery */

import { initTextAnimation, teardownTextAnimation, parseOptsFromDataset, sizeOf, waitForLibs } from './engine.js';

/**
 * Registers the AuroraTextAnimationHandler with Elementor. Returns `false`
 * if the Frontend Handlers API isn't available (e.g. very old Elementor
 * versions).
 *
 * @returns {boolean}
 */
function registerHandler() {
    if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
        return false;
    }
    if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
        // elementorFrontend already exists, but .hooks hasn't been attached
        // yet (happens in the editor, where the init order differs from
        // the real frontend). Without this check, addAction() below would
        // throw an uncaught TypeError that would abort the rest of the
        // script — including the polling fallback and bootstrap().
        return false;
    }

    function AuroraTextAnimationHandler() {
        elementorModules.frontend.handlers.Base.apply(this, arguments);
    }

    AuroraTextAnimationHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
    AuroraTextAnimationHandler.prototype.constructor = AuroraTextAnimationHandler;

    AuroraTextAnimationHandler.prototype.isEnabled = function () {
        return this.getElementSettings('aurora_text_enable') === 'yes';
    };

    AuroraTextAnimationHandler.prototype.getOpts = function () {
        var library = this.getElementSettings('aurora_text_library') || 'gsap';
        return {
            library: library,
            animation: library === 'gsap'
                ? (this.getElementSettings('aurora_text_animation_gsap') || 'gs-1')
                : (this.getElementSettings('aurora_text_animation_anime') || 'ml-1'),
            splitBy: this.getElementSettings('aurora_text_split_by') || 'chars',
            duration: sizeOf(this.getElementSettings('aurora_text_duration'), 800),
            delay: sizeOf(this.getElementSettings('aurora_text_delay'), 0),
            stagger: sizeOf(this.getElementSettings('aurora_text_stagger'), 30),
            trigger: this.getElementSettings('aurora_text_trigger') || 'scroll',
            threshold: sizeOf(this.getElementSettings('aurora_text_threshold'), 20) / 100,
            replay: this.getElementSettings('aurora_text_replay') === 'yes',
            hoverEnable: this.getElementSettings('aurora_text_hover_enable') === 'yes',
            hoverIntensity: sizeOf(this.getElementSettings('aurora_text_hover_intensity'), 24),
            hoverDuration: sizeOf(this.getElementSettings('aurora_text_hover_duration'), 350),
        };
    };

    AuroraTextAnimationHandler.prototype.runAnimation = function () {
        var wrapper = this.$element[0];
        var enabled = this.isEnabled();
        if (!enabled) {
            teardownTextAnimation(wrapper);
            return;
        }
        var opts = this.getOpts();
        setTimeout(function () { initTextAnimation(wrapper, opts); }, 80);
    };

    AuroraTextAnimationHandler.prototype.onInit = function () {
        elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
        this.runAnimation();
    };

    AuroraTextAnimationHandler.prototype.onElementChange = function (propertyName) {
        if (propertyName.indexOf('aurora_text_') === 0) {
            this.runAnimation();
        }
    };

    elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
        elementorFrontend.elementsHandler.addHandler(AuroraTextAnimationHandler, { $element: $element });
    });

    return true;
}

/**
 * Sets everything in motion: registers the Elementor handler as early as
 * possible (synchronously, if the API is already there; otherwise on the
 * `elementor/frontend/init` event and a short poll as a fallback), and
 * falls back to scanning `data-aurora-*` attributes directly when no
 * Elementor JS is present at all.
 */
export function bootstrap() {
    var $ = typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); };

    // `elementorFrontend.hooks.addAction()` doesn't depend on gsap/anime
    // being loaded, nor on `isInit`/DOM ready — it only needs the
    // `elementorModules`/`elementorFrontend` object to already exist. On
    // the real frontend, Elementor can fire `frontend/element_ready` for
    // each widget very quickly after the page loads, and that event only
    // fires ONCE per element — so the hook must be registered as early as
    // possible, not gated behind waitForLibs().
    var auroraHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraHandlerRegistered) return true;
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) return false;
        auroraHandlerRegistered = registerHandler();
        return auroraHandlerRegistered;
    }

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

    function onReady() {
        waitForLibs(function () {
            // Fallback: no Elementor JS available — scan the page using
            // the data-aurora-* attributes rendered by PHP on the real
            // frontend.
            if (typeof elementorFrontend === 'undefined') {
                document.querySelectorAll('[data-aurora-enable="1"]').forEach(function (el) {
                    setTimeout(function () { initTextAnimation(el, parseOptsFromDataset(el)); }, 80);
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
}
