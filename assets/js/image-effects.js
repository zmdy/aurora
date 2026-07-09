/**
 * Aurora for Elementor — Frontend: Image Effects (Entrance Animations)
 *
 * Plays a reveal/impact animation on the native Elementor Image widget,
 * triggered either on scroll (IntersectionObserver) or on page load.
 * Two selectable libraries, mirroring the Text Animation module:
 *   - GSAP (default): 13 effects — 9 simple transform/opacity effects
 *     animated directly on the <img>, plus 4 "reveal" effects (wipe-left,
 *     wipe-up, curtain, iris) that mask the image with an animated
 *     overlay instead.
 *   - Anime.js: 8 effects leaning into what it's best at — spring/elastic
 *     settles (Elastic Pop, Bounce Drop, Spring Rotate, Jelly Squash...).
 *     These are self-contained anime.animate() calls (both "from" and
 *     "to" values in one call), so unlike the GSAP effects they don't
 *     need a separate reset/play split.
 *
 * The Hover effects of this module (including the Shine sweep) are pure
 * CSS — see assets/css/image-effects.css — and need no JavaScript at all.
 *
 * @package Aurora
 * @version 1.1.0
 */

/* global gsap, anime, elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // OPTION PARSING
    // ─────────────────────────────────────────────────────────────────────────

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
     * Reads the entrance options from the data-aurora-img-entrance-*
     * attributes (rendered by PHP). Used only as a last resort, when the
     * Elementor Frontend Handlers system isn't available.
     *
     * @param {HTMLElement} wrapper
     * @returns {Object}
     */
    function parseOptsFromDataset(wrapper) {
        var ds = wrapper.dataset;
        return {
            library      : ds.auroraImgEntranceLibrary || 'gsap',
            effect       : ds.auroraImgEntrance || 'fade-up',
            overlayColor : ds.auroraImgEntranceOverlay || '#0afbc1',
            duration     : parseInt(ds.auroraImgEntranceDuration, 10) || 800,
            delay        : parseInt(ds.auroraImgEntranceDelay, 10) || 0,
            trigger      : ds.auroraImgEntranceTrigger || 'scroll',
            threshold    : (parseFloat(ds.auroraImgEntranceThreshold) || 15) / 100,
            replay       : ds.auroraImgEntranceReplay === '1',
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TARGET RESOLUTION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves the <img> to animate and the "box" element that overlay-based
     * reveal effects are appended to (the closest positioned container,
     * falling back to the image's direct parent).
     *
     * @param {HTMLElement} wrapper
     * @returns {{img: HTMLImageElement, box: HTMLElement}|null}
     */
    function getImgTarget(wrapper) {
        var img = wrapper.querySelector('img');
        if (!img) return null;
        var box = img.closest('.elementor-widget-container') || img.parentElement || wrapper;
        return { img: img, box: box };
    }

    /**
     * Makes sure the box has a positioning context, so absolutely-positioned
     * overlays line up with the image instead of an ancestor further up.
     *
     * @param {HTMLElement} box
     */
    function ensureRelative(box) {
        var pos = window.getComputedStyle(box).position;
        if (!pos || pos === 'static') {
            box.style.position = 'relative';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OVERLAY HELPERS (wipe / curtain reveal effects)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates (or reuses) the single overlay panel used by wipe-left/wipe-up.
     * Cached on the box element so re-initialization (e.g. a settings change
     * in the editor) doesn't stack duplicate overlays.
     *
     * @param {HTMLElement} box
     * @param {string}      color
     * @returns {HTMLElement}
     */
    function getOrCreateOverlay(box, color) {
        if (box._auroraImgOverlay) return box._auroraImgOverlay;
        var el = document.createElement('div');
        el.className = 'aurora-img-entrance-overlay';
        el.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;background:' + color + ';';
        ensureRelative(box);
        box.appendChild(el);
        box._auroraImgOverlay = el;
        return el;
    }

    /**
     * Creates (or reuses) the two half-panels used by the curtain effect.
     *
     * @param {HTMLElement} box
     * @param {string}      color
     * @returns {{left: HTMLElement, right: HTMLElement}}
     */
    function getOrCreateCurtainOverlays(box, color) {
        if (box._auroraImgCurtainOverlays) return box._auroraImgCurtainOverlays;

        var left = document.createElement('div');
        left.className = 'aurora-img-entrance-overlay aurora-img-entrance-overlay-left';
        left.style.cssText = 'position:absolute;top:0;left:0;width:50%;height:100%;pointer-events:none;z-index:2;background:' + color + ';';

        var right = document.createElement('div');
        right.className = 'aurora-img-entrance-overlay aurora-img-entrance-overlay-right';
        right.style.cssText = 'position:absolute;top:0;right:0;width:50%;height:100%;pointer-events:none;z-index:2;background:' + color + ';';

        ensureRelative(box);
        box.appendChild(left);
        box.appendChild(right);

        var pair = { left: left, right: right };
        box._auroraImgCurtainOverlays = pair;
        return pair;
    }

    /**
     * Hides any overlay left over from a previous initialization with a
     * different (non-overlay) effect, so switching effects in the editor
     * doesn't leave a stray panel covering the image.
     *
     * @param {HTMLElement} box
     */
    function hideOverlays(box) {
        if (typeof gsap === 'undefined') return;
        if (box._auroraImgOverlay) {
            gsap.set(box._auroraImgOverlay, { display: 'none' });
        }
        if (box._auroraImgCurtainOverlays) {
            gsap.set(box._auroraImgCurtainOverlays.left, { display: 'none' });
            gsap.set(box._auroraImgCurtainOverlays.right, { display: 'none' });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SIMPLE (non-overlay) EFFECTS — transform/opacity animated on the <img>
    // ─────────────────────────────────────────────────────────────────────────

    var SIMPLE_FROM = {
        'fade-up'    : { y: 50, opacity: 0 },
        'fade-in'    : { opacity: 0 },
        'slide-left' : { x: -80, opacity: 0 },
        'slide-right': { x: 80, opacity: 0 },
        'zoom-in'    : { scale: 0.7, opacity: 0 },
        'zoom-out'   : { scale: 1.3, opacity: 0 },
        'flip-3d'    : { rotationY: 80, opacity: 0, transformPerspective: 800 },
        'blur-reveal': { opacity: 0, filter: 'blur(20px)' },
        'skew-reveal': { skewX: 15, x: -40, opacity: 0 },
    };

    var SIMPLE_TO = {
        'fade-up'    : { y: 0, opacity: 1, ease: 'power3.out' },
        'fade-in'    : { opacity: 1, ease: 'power2.out' },
        'slide-left' : { x: 0, opacity: 1, ease: 'power3.out' },
        'slide-right': { x: 0, opacity: 1, ease: 'power3.out' },
        'zoom-in'    : { scale: 1, opacity: 1, ease: 'back.out(1.6)' },
        'zoom-out'   : { scale: 1, opacity: 1, ease: 'power3.out' },
        'flip-3d'    : { rotationY: 0, opacity: 1, ease: 'power3.out' },
        'blur-reveal': { opacity: 1, filter: 'blur(0px)', ease: 'power2.out' },
        'skew-reveal': { skewX: 0, x: 0, opacity: 1, ease: 'power3.out' },
    };

    function isSimpleEffect(effect) {
        return Object.prototype.hasOwnProperty.call(SIMPLE_FROM, effect);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIME.JS EFFECTS (am-1 … am-8) — spring/elastic-leaning entrances
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Each anime.animate() call declares BOTH the "from" and "to" values as
    // [from, to] array pairs — self-contained, unlike the GSAP effects
    // above. There's no clearProps-style gotcha here, so no separate
    // reset/play split is needed for the actual tween. A plain inline-style
    // pre-hide (ANIME_RESET_STYLE, applied by applyAnimeReset()) is still
    // used to avoid a flash of the fully-visible image before the scroll
    // trigger fires (or during the brief gap before an on-load trigger).

    var ANIME_RESET_STYLE = {
        'am-1': { opacity: 0, transform: 'scale(0.3)' },
        'am-2': { opacity: 0, transform: 'translateY(-120px)' },
        'am-3': { opacity: 0, transform: 'rotate(45deg) scale(0.6)' },
        'am-4': { opacity: 0, transform: 'scale(1.15)' },
        'am-5': { opacity: 0, transform: 'rotate(-18deg)' },
        'am-6': { opacity: 0, transform: 'rotateX(70deg)' },
        'am-7': { opacity: 0, transform: 'translateX(-120px)' },
        'am-8': { opacity: 0, transform: 'scale(1.35, 0.7)' },
    };

    function isAnimeEffect(effect) {
        return Object.prototype.hasOwnProperty.call(ANIME_RESET_STYLE, effect);
    }

    /**
     * Instantly hides the image in its "from" state via plain inline
     * styles (no GSAP/Anime.js instance involved yet). Also gives the box
     * a 3D perspective so am-6's rotateX has actual depth.
     *
     * @param {HTMLImageElement} img
     * @param {HTMLElement}      box
     * @param {string}           effect
     */
    function applyAnimeReset(img, box, effect) {
        var style = ANIME_RESET_STYLE[effect] || { opacity: 0, transform: '' };
        img.style.opacity = String(style.opacity);
        img.style.transform = style.transform || '';
        if (!box.style.perspective) {
            box.style.perspective = '800px';
        }
    }

    // Every entry below finishes with `onComplete: clearTransformAfterEntrance`
    // (defined further down, alongside the GSAP effects) — same reasoning:
    // Anime.js also leaves its final transform as an inline style, which
    // would otherwise permanently block any CSS `:hover` rule targeting
    // `transform` on the same <img> once Entrance finishes playing.

    var animeEntranceEffects = {

        // am-1 — Elastic Pop
        'am-1': function (target, opts) {
            anime.animate(target.img, {
                scale: [0.3, 1], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outElastic(1, .6)',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-2 — Bounce Drop
        'am-2': function (target, opts) {
            anime.animate(target.img, {
                translateY: [-120, 0], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outBounce',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-3 — Spring Rotate
        'am-3': function (target, opts) {
            anime.animate(target.img, {
                rotate: [45, 0], scale: [0.6, 1], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outElastic(1, .5)',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-4 — Soft Zoom
        'am-4': function (target, opts) {
            anime.animate(target.img, {
                scale: [1.15, 1], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outQuart',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-5 — Swing In
        'am-5': function (target, opts) {
            anime.animate(target.img, {
                rotate: [-18, 0], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outElastic(1, .4)',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-6 — Perspective Tilt (needs the box's `perspective`, set by applyAnimeReset())
        'am-6': function (target, opts) {
            anime.animate(target.img, {
                rotateX: [70, 0], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outExpo',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-7 — Elastic Slide
        'am-7': function (target, opts) {
            anime.animate(target.img, {
                translateX: [-120, 0], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outElastic(1, .6)',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },

        // am-8 — Jelly Squash
        'am-8': function (target, opts) {
            anime.animate(target.img, {
                scaleX: [1.35, 1], scaleY: [0.7, 1], opacity: [0, 1],
                duration: opts.duration, delay: opts.delay, ease: 'outElastic(1, .5)',
                onComplete: function () { clearTransformAfterEntrance(target.img); },
            });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RESET / PLAY — shared by every effect (overlay-based or simple)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Instantly applies the "before the animation plays" visual state —
     * called immediately on init (so there's no flash of the fully-visible
     * image before it animates in) and again before every replay.
     *
     * @param {{img: HTMLImageElement, box: HTMLElement}} target
     * @param {Object}                                    opts
     */
    function applyReset(target, opts) {
        var img = target.img, box = target.box;

        // IMPORTANT: `clearProps` must never be set in the SAME gsap.set()
        // call as the property values we actually want to keep. gsap.set()
        // is a zero-duration tween, and clearProps is applied at the end of
        // that same render — i.e. in the same tick — which would instantly
        // wipe out the very "from" values (opacity/transform/clip-path) we
        // just set, leaving the image already in its final visible state
        // before applyPlay() ever runs. That silently defeated every
        // entrance effect (nothing appeared to animate). Clearing leftover
        // inline styles (e.g. from a previously-selected effect) must happen
        // in its own call, BEFORE the new "from" state is applied.

        if (isAnimeEffect(opts.effect)) {
            applyAnimeReset(img, box, opts.effect);
            hideOverlays(box);
            return;
        }

        if (isSimpleEffect(opts.effect)) {
            gsap.set(img, { clearProps: 'transform,opacity,filter' });
            gsap.set(img, SIMPLE_FROM[opts.effect]);
            hideOverlays(box);
            return;
        }

        switch (opts.effect) {
            case 'wipe-left': {
                gsap.set(img, { clearProps: 'all' });
                gsap.set(img, { opacity: 1 });
                var overlayL = getOrCreateOverlay(box, opts.overlayColor);
                gsap.set(overlayL, { scaleX: 1, transformOrigin: 'right center', opacity: 1, display: 'block' });
                break;
            }
            case 'wipe-up': {
                gsap.set(img, { clearProps: 'all' });
                gsap.set(img, { opacity: 1 });
                var overlayU = getOrCreateOverlay(box, opts.overlayColor);
                gsap.set(overlayU, { scaleY: 1, transformOrigin: 'top center', opacity: 1, display: 'block' });
                break;
            }
            case 'curtain': {
                gsap.set(img, { clearProps: 'all' });
                gsap.set(img, { opacity: 1 });
                var pair = getOrCreateCurtainOverlays(box, opts.overlayColor);
                gsap.set(pair.left, { scaleX: 1, transformOrigin: 'left center', opacity: 1, display: 'block' });
                gsap.set(pair.right, { scaleX: 1, transformOrigin: 'right center', opacity: 1, display: 'block' });
                break;
            }
            case 'iris': {
                gsap.set(img, { clearProps: 'all' });
                gsap.set(img, { opacity: 1, clipPath: 'circle(0% at 50% 50%)' });
                hideOverlays(box);
                break;
            }
            default:
                // Unknown effect (shouldn't happen — PHP already validates it).
                gsap.set(img, { clearProps: 'all' });
                gsap.set(img, { opacity: 1 });
                hideOverlays(box);
        }
    }

    /**
     * Runs the actual tween for the configured effect.
     *
     * @param {{img: HTMLImageElement, box: HTMLElement}} target
     * @param {Object}                                    opts
     */
    /**
     * Clears the entrance-driven inline transform/filter/clip-path once the
     * tween finishes. Without this, GSAP/Anime.js leave their final values
     * as an INLINE style on the <img> — and an inline style always wins
     * over an external stylesheet rule for the same CSS property, no
     * matter its specificity. That permanently blocked any CSS `:hover`
     * rule targeting `transform` or `filter` (e.g. the "Zoom In" or
     * "Rotate + Zoom" hover effects) whenever Entrance was also enabled on
     * the same image. Runs strictly after the tween completes (a separate
     * call, not merged into the tween's own vars), so it doesn't retrigger
     * the same clearProps-vs-values conflict fixed earlier in applyReset().
     *
     * @param {HTMLImageElement} img
     */
    function clearTransformAfterEntrance(img) {
        if (typeof gsap === 'undefined') return;
        gsap.set(img, { clearProps: 'transform,filter,clipPath' });
    }

    function applyPlay(target, opts) {
        var img = target.img, box = target.box;

        if (isAnimeEffect(opts.effect)) {
            var animeFn = animeEntranceEffects[opts.effect];
            if (animeFn) animeFn(target, opts);
            return;
        }

        var duration = opts.duration / 1000;
        var delay    = opts.delay / 1000;

        if (isSimpleEffect(opts.effect)) {
            var to = Object.assign(
                { duration: duration, delay: delay },
                SIMPLE_TO[opts.effect],
                { onComplete: function () { clearTransformAfterEntrance(img); } }
            );
            gsap.to(img, to);
            return;
        }

        switch (opts.effect) {
            case 'wipe-left':
                gsap.to(getOrCreateOverlay(box, opts.overlayColor), {
                    duration: duration, delay: delay, scaleX: 0, ease: 'power3.inOut',
                });
                break;
            case 'wipe-up':
                gsap.to(getOrCreateOverlay(box, opts.overlayColor), {
                    duration: duration, delay: delay, scaleY: 0, ease: 'power3.inOut',
                });
                break;
            case 'curtain': {
                var pair = getOrCreateCurtainOverlays(box, opts.overlayColor);
                gsap.to([pair.left, pair.right], {
                    duration: duration, delay: delay, scaleX: 0, ease: 'power3.inOut',
                });
                break;
            }
            case 'iris':
                // Over-shoots past 100% so the circle fully clears every corner
                // of the image regardless of its aspect ratio.
                gsap.to(img, {
                    duration: duration, delay: delay, clipPath: 'circle(150% at 50% 50%)', ease: 'power2.out',
                    onComplete: function () { clearTransformAfterEntrance(img); },
                });
                break;
            default:
                gsap.to(img, {
                    duration: duration, delay: delay, opacity: 1,
                    onComplete: function () { clearTransformAfterEntrance(img); },
                });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initializes (or reinitializes) the entrance animation for a wrapper.
     * Safe to call multiple times for the same wrapper (e.g. when a control
     * changes in the Elementor editor).
     *
     * @param {HTMLElement} wrapper
     * @param {Object}      opts
     */
    function initImgEntrance(wrapper, opts) {
        console.log('[Aurora:image-fx] initImgEntrance()', { wrapper: wrapper, opts: opts });

        if (opts.library === 'animejs') {
            if (typeof anime === 'undefined') {
                console.log('[Aurora:image-fx] anime.js unavailable, aborting.');
                return;
            }
        } else if (typeof gsap === 'undefined') {
            console.log('[Aurora:image-fx] gsap unavailable, aborting.');
            return;
        }

        var target = getImgTarget(wrapper);
        if (!target) {
            console.log('[Aurora:image-fx] no <img> found inside wrapper, aborting.');
            return;
        }

        if (wrapper._auroraImgObserver) {
            wrapper._auroraImgObserver.disconnect();
            wrapper._auroraImgObserver = null;
        }

        applyReset(target, opts);

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;
            applyReset(target, opts);
            applyPlay(target, opts);
        }

        function reset() {
            played = false;
            applyReset(target, opts);
        }

        if (opts.trigger === 'scroll') {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        trigger();
                        if (!opts.replay) observer.unobserve(entry.target);
                    } else if (opts.replay) {
                        reset();
                    }
                });
            }, { threshold: opts.threshold });

            observer.observe(wrapper);
            wrapper._auroraImgObserver = observer;
        } else {
            trigger();
        }
    }

    /**
     * Reverts the entrance state of a wrapper (used when the "Enable
     * Entrance Animation" control is dynamically turned off in the editor).
     *
     * @param {HTMLElement} wrapper
     */
    function teardownImgEntrance(wrapper) {
        if (wrapper._auroraImgObserver) {
            wrapper._auroraImgObserver.disconnect();
            wrapper._auroraImgObserver = null;
        }
        var target = getImgTarget(wrapper);
        if (!target || typeof gsap === 'undefined') return;
        gsap.set(target.img, { clearProps: 'all' });
        hideOverlays(target.box);
    }

    /**
     * Waits for either animation library to become available (whichever
     * the element ends up needing is checked later, per-instance, in
     * initImgEntrance()) or gives up after maxWait.
     *
     * @param {Function} callback
     */
    function waitForEntranceLibs(callback) {
        var waited  = 0;
        var maxWait = 6000;
        var step    = 80;
        var timer   = setInterval(function () {
            waited += step;
            if (typeof gsap !== 'undefined' || typeof anime !== 'undefined' || waited >= maxWait) {
                clearInterval(timer);
                callback();
            }
        }, step);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ELEMENTOR INTEGRATION — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Same reasoning as children-animations.js/text-animations.js: uses the
    // official Frontend Handlers API (onInit/onElementChange) so changes to
    // `frontend_available` controls reflect instantly in the editor's live
    // preview, without needing to reload the iframe.
    // See: https://developers.elementor.com/docs/editor-controls/frontend-available/

    /**
     * Registers the AuroraImageEffectsHandler with Elementor. Returns
     * `false` if the Frontend Handlers API isn't available yet.
     *
     * @returns {boolean}
     */
    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            console.log('[Aurora:image-fx] elementorModules.frontend.handlers not yet available.');
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            console.log('[Aurora:image-fx] elementorFrontend.hooks not yet available.');
            return false;
        }

        function AuroraImageEffectsHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraImageEffectsHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraImageEffectsHandler.prototype.constructor = AuroraImageEffectsHandler;

        AuroraImageEffectsHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_img_entrance_enable') === 'yes';
        };

        AuroraImageEffectsHandler.prototype.getOpts = function () {
            var library = this.getElementSettings('aurora_img_entrance_library') || 'gsap';
            var effect  = 'animejs' === library
                ? ( this.getElementSettings('aurora_img_entrance_effect_anime') || 'am-1' )
                : ( this.getElementSettings('aurora_img_entrance_effect') || 'fade-up' );
            return {
                library      : library,
                effect       : effect,
                overlayColor : this.getElementSettings('aurora_img_entrance_overlay_color') || '#0afbc1',
                duration     : sizeOf(this.getElementSettings('aurora_img_entrance_duration'), 800),
                delay        : sizeOf(this.getElementSettings('aurora_img_entrance_delay'), 0),
                trigger      : this.getElementSettings('aurora_img_entrance_trigger') || 'scroll',
                threshold    : sizeOf(this.getElementSettings('aurora_img_entrance_threshold'), 15) / 100,
                replay       : this.getElementSettings('aurora_img_entrance_replay') === 'yes',
            };
        };

        AuroraImageEffectsHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var enabled = this.isEnabled();
            console.log('[Aurora:image-fx] runAnimation()', { wrapper: wrapper, enabled: enabled });
            if (!enabled) {
                teardownImgEntrance(wrapper);
                return;
            }
            var opts = this.getOpts();
            console.log('[Aurora:image-fx] opts ->', opts);
            setTimeout(function () { initImgEntrance(wrapper, opts); }, 120);
        };

        AuroraImageEffectsHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            console.log('[Aurora:image-fx] onInit()', this.$element[0]);
            this.runAnimation();
        };

        AuroraImageEffectsHandler.prototype.onElementChange = function (propertyName) {
            console.log('[Aurora:image-fx] onElementChange()', propertyName);
            if (propertyName.indexOf('aurora_img_entrance_') === 0) {
                this.runAnimation();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            console.log('[Aurora:image-fx] frontend/element_ready/global ->', $element);
            elementorFrontend.elementsHandler.addHandler(AuroraImageEffectsHandler, { $element: $element });
        });

        console.log('[Aurora:image-fx] Handler registered successfully.');
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HOOK REGISTRATION — as EARLY as possible, synchronously
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Same logic and reason as the other Aurora modules: `hooks.addAction()`
    // doesn't depend on GSAP being loaded. On the real frontend (outside the
    // editor) `frontend/element_ready` only fires ONCE per element, shortly
    // after the page loads — registration must happen synchronously, the
    // moment this file is evaluated, or that firing is missed forever.
    var auroraImgHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraImgHandlerRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined') {
            return false;
        }
        auroraImgHandlerRegistered = registerHandler();
        return auroraImgHandlerRegistered;
    }

    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        console.log('[Aurora:image-fx] Not registered yet — waiting for the elementor/frontend/init event and polling as a fallback...');
        $(window).on('elementor/frontend/init', function () {
            console.log('[Aurora:image-fx] elementor/frontend/init event fired.');
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
        console.log('[Aurora:image-fx] bootstrap() started.');
        waitForEntranceLibs(function () {
            console.log('[Aurora:image-fx] waitForEntranceLibs resolved. gsap?', typeof gsap !== 'undefined', 'anime?', typeof anime !== 'undefined');

            // Fallback: no Elementor JS available — scan the page using the
            // data-aurora-img-entrance-* attributes rendered by PHP on the
            // real frontend.
            if (typeof elementorFrontend === 'undefined') {
                console.log('[Aurora:image-fx] Elementor JS unavailable — using data-aurora-img-entrance-* fallback.');
                document.querySelectorAll('[data-aurora-img-entrance-enable="1"]').forEach(function (el) {
                    setTimeout(function () { initImgEntrance(el, parseOptsFromDataset(el)); }, 120);
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
