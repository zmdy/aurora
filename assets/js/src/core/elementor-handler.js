/**
 * Aurora Text Animation — Elementor Frontend Handler + bootstrap.
 *
 * Shared verbatim between the editor bundle and the frontend core bundle:
 * the only thing that differs between the two contexts is WHICH effects
 * are already sitting in the registry when this code runs (all of them,
 * in the editor; only the ones PHP decided to enqueue, on the real
 * frontend) — this file doesn't need to know or care which.
 */

/* global elementorFrontend, elementorModules, jQuery */

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
        var setting = this.getElementSettings('aurora_text_enable');
        if (setting === 'yes') return true;
        if (setting === 'no') return false;
        // Fallback: read from data-attributes (Elementor may not export the
        // value via getElementSettings on the published frontend for some
        // widget types or older Elementor versions).
        var wrapper = this.$element && this.$element[0];
        return wrapper &&
               wrapper.getAttribute &&
               wrapper.getAttribute('data-aurora-enable') === '1';
    };

    AuroraTextAnimationHandler.prototype.getOpts = function () {
        var wrapper = this.$element && this.$element[0];
        var ds = wrapper ? parseOptsFromDataset(wrapper) : {};

        var settingLib = this.getElementSettings('aurora_text_library');
        var library = (settingLib && settingLib !== '') ? settingLib : (ds.library || 'gsap');

        var settingAnim = library === 'gsap'
            ? this.getElementSettings('aurora_text_animation_gsap')
            : this.getElementSettings('aurora_text_animation_anime');
        var animation = (settingAnim && settingAnim !== '') ? settingAnim : (ds.animation || (library === 'gsap' ? 'gs-1' : 'ml-1'));

        var splitBy = this.getElementSettings('aurora_text_split_by');
        var duration = this.getElementSettings('aurora_text_duration');
        var delay = this.getElementSettings('aurora_text_delay');
        var stagger = this.getElementSettings('aurora_text_stagger');
        var trigger = this.getElementSettings('aurora_text_trigger');
        var threshold = this.getElementSettings('aurora_text_threshold');
        var replay = this.getElementSettings('aurora_text_replay');
        var hoverEnable = this.getElementSettings('aurora_text_hover_enable');
        var hoverIntensity = this.getElementSettings('aurora_text_hover_intensity');
        var hoverDuration = this.getElementSettings('aurora_text_hover_duration');

        return {
            library: library,
            animation: animation,
            splitBy: (splitBy && splitBy !== '') ? splitBy : (ds.splitBy || 'chars'),
            duration: sizeOf(duration, ds.duration || 800),
            delay: sizeOf(delay, ds.delay || 0),
            stagger: sizeOf(stagger, ds.stagger || 30),
            trigger: (trigger && trigger !== '') ? trigger : (ds.trigger || 'scroll'),
            threshold: (threshold !== undefined && threshold !== null && threshold !== '') ? (sizeOf(threshold, 20) / 100) : (ds.threshold || 0.2),
            replay: (replay !== undefined && replay !== null && replay !== '') ? (replay === 'yes') : ds.replay,
            hoverEnable: (hoverEnable !== undefined && hoverEnable !== null && hoverEnable !== '') ? (hoverEnable === 'yes') : ds.hoverEnable,
            hoverIntensity: sizeOf(hoverIntensity, ds.hoverIntensity || 24),
            hoverDuration: sizeOf(hoverDuration, ds.hoverDuration || 350),
        };
    };

    AuroraTextAnimationHandler.prototype.runAnimation = function () {
        var self = this;
        var wrapper = this.$element && this.$element[0];
        if (!wrapper) return;

        var enabled = this.isEnabled();
        if (!enabled) {
            teardownTextAnimation(wrapper);
            return;
        }
        var opts = this.getOpts();
        // Wait for the specific animation library (GSAP or Anime.js) to be
        // available on window before running the animation.
        waitForLibs(opts.library, function () {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    initTextAnimation(wrapper, opts);
                });
            });
        });
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
    }

    function onReady() {
        waitForLibs(function () {
            // Fallback: no Elementor JS available — scan the page using
            // the data-aurora-* attributes rendered by PHP on the real
            // frontend.
            if (typeof elementorFrontend === 'undefined') {
                document.querySelectorAll('[data-aurora-enable="1"]').forEach(function (el) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            initTextAnimation(el, parseOptsFromDataset(el));
                        });
                    });
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
