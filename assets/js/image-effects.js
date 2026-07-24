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

/* global elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // Captured once, at this script's own load time, instead of reading the
    // live `window.gsap`/`window.anime` globals at every call site below —
    // see Asset_Manager::enqueue_frontend_assets() and core/gsap-ref.js /
    // core/anime-ref.js for why: other themes/plugins bundling their own
    // copy of either library can otherwise clobber these globals after this
    // script has already loaded.
    var gsap = window.AuroraGSAP || window.gsap;
    var anime = window.AuroraAnimeJS || window.anime;

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
        if (opts.library === 'animejs') {
            if (typeof anime === 'undefined') {
                return;
            }
        } else if (typeof gsap === 'undefined') {
            return;
        }

        var target = getImgTarget(wrapper);
        if (!target) {
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

    // ─────────────────────────────────────────────────────────────────────────
    // DYNAMIC INTERACTIONS (3D TILT, RGB SPLIT LAYERS, LIQUID WARP, APPEAR TRIGGER)
    // ─────────────────────────────────────────────────────────────────────────

    var activeImageInteractions = new WeakMap();

    function clearImageInteractions(wrapper) {
        var active = activeImageInteractions.get(wrapper);
        if (active) {
            if (active.observer) active.observer.disconnect();
            if (active.liquidObserver) active.liquidObserver.disconnect();
            if (active.mouseMoveHandler) wrapper.removeEventListener('mousemove', active.mouseMoveHandler);
            if (active.mouseLeaveHandler) wrapper.removeEventListener('mouseleave', active.mouseLeaveHandler);
            if (active.liquidEnterHandler) wrapper.removeEventListener('mouseenter', active.liquidEnterHandler);
            if (active.liquidLeaveHandler) wrapper.removeEventListener('mouseleave', active.liquidLeaveHandler);
            if (active.resizeHandler) window.removeEventListener('resize', active.resizeHandler);
            if (active.resizeTimeout) clearTimeout(active.resizeTimeout);
            if (active.rafId) cancelAnimationFrame(active.rafId);
            if (active.rgbContainer && active.rgbContainer.parentNode) {
                active.rgbContainer.parentNode.removeChild(active.rgbContainer);
            }
            if (active.canvas && active.canvas.parentNode) {
                active.canvas.parentNode.removeChild(active.canvas);
            }
            if (active.img) {
                active.img.style.transform = '';
                active.img.style.filter = '';
                active.img.style.opacity = '';
                active.img.classList.remove('aurora-img-tilt-active', 'aurora-img-tilt-reset');
            }
            activeImageInteractions.delete(wrapper);
        }
        wrapper.classList.remove('aurora-img-appeared');
    }

    function initImageInteractions(wrapper, opts) {
        clearImageInteractions(wrapper);

        var target = getImgTarget(wrapper);
        if (!target) return;

        var img = target.img;
        var box = target.box;

        var active = {
            img: img,
            observer: null,
            mouseMoveHandler: null,
            mouseLeaveHandler: null,
            rgbContainer: null,
            canvas: null
        };

        // 1. Appear trigger (scroll intersection observer)
        if (opts.trigger === 'appear' || opts.trigger === 'both') {
            var threshold = opts.threshold || 0.15;
            var obs = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        wrapper.classList.add('aurora-img-appeared');
                        if (opts.trigger === 'appear') {
                            obs.unobserve(entry.target);
                        }
                    } else if (opts.trigger === 'both') {
                        wrapper.classList.remove('aurora-img-appeared');
                    }
                });
            }, { threshold: threshold });
            obs.observe(wrapper);
            active.observer = obs;
        }

        // 2. 3D Tilt interaction
        if (opts.effect === '3d-tilt') {
            box.style.perspective = '1000px';
            img.style.transformStyle = 'preserve-3d';
            img.classList.add('aurora-img-tilt-active');

            var ticking = false;
            var mouseMoveHandler = function (e) {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(function() {
                    if (!active.img) {
                        ticking = false;
                        return;
                    }
                    if (img.classList.contains('aurora-img-tilt-reset')) {
                        img.classList.remove('aurora-img-tilt-reset');
                        img.classList.add('aurora-img-tilt-active');
                    }
                    var rect = box.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;
                    var px = (x / rect.width) * 2 - 1; // -1 to 1
                    var py = (y / rect.height) * 2 - 1; // -1 to 1

                    var maxTilt = 15; // degrees
                    var rx = -py * maxTilt;
                    var ry = px * maxTilt;

                    img.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale3d(1.05, 1.05, 1.05)';
                    img.style.boxShadow = (-ry * 2) + 'px ' + (rx * 2) + 'px 25px rgba(0,0,0,0.3)';
                    ticking = false;
                });
            };

            var mouseLeaveHandler = function () {
                ticking = false;
                img.classList.remove('aurora-img-tilt-active');
                img.classList.add('aurora-img-tilt-reset');
                img.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                img.style.boxShadow = '';
            };

            wrapper.addEventListener('mousemove', mouseMoveHandler, { passive: true });
            wrapper.addEventListener('mouseleave', mouseLeaveHandler);
            active.mouseMoveHandler = mouseMoveHandler;
            active.mouseLeaveHandler = mouseLeaveHandler;
        }

        // 3. RGB Chromatic Split (construct overlay layers)
        if (opts.effect === 'rgb-split') {
            ensureRelative(box);
            var src = img.getAttribute('src');

            var rgbContainer = document.createElement('div');
            rgbContainer.className = 'aurora-rgb-container';
            rgbContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;mix-blend-mode:screen;';

            var channels = ['r', 'g', 'b'];
            channels.forEach(function (ch) {
                var layer = document.createElement('div');
                layer.className = 'aurora-rgb-layer aurora-rgb-layer-' + ch;
                layer.style.cssText = 'position:absolute;inset:0;background-image:url(' + src + ');background-size:cover;background-position:center;mix-blend-mode:screen;opacity:0;';
                rgbContainer.appendChild(layer);
            });

            box.appendChild(rgbContainer);
            active.rgbContainer = rgbContainer;
        }

        // 4. Liquid Warp distortion canvas overlay
        if (opts.effect === 'liquid-warp') {
            ensureRelative(box);
            var canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';
            box.appendChild(canvas);
            active.canvas = canvas;

            var ctx = canvas.getContext('2d');
            var points = [];
            var isHovered = false;

            active.resizeTimeout = null;
            var resize = function (immediate) {
                clearTimeout(active.resizeTimeout);
                var doResize = function () {
                    if (active.canvas) {
                        canvas.width = box.offsetWidth || 300;
                        canvas.height = box.offsetHeight || 300;
                    }
                };
                if (immediate === true) {
                    doResize();
                } else {
                    active.resizeTimeout = setTimeout(doResize, 150);
                }
            };
            active.resizeHandler = resize;
            window.addEventListener('resize', resize);
            resize(true);

            var enterHandler = function () { isHovered = true; };
            var leaveHandler = function () { isHovered = false; };
            active.liquidEnterHandler = enterHandler;
            active.liquidLeaveHandler = leaveHandler;
            wrapper.addEventListener('mouseenter', enterHandler);
            wrapper.addEventListener('mouseleave', leaveHandler);

            var time = 0;
            var isVisible = true;
            active.rafId = null;

            var render = function () {
                if (!active.canvas || !isVisible) return;
                time += 0.05;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (isHovered || wrapper.classList.contains('aurora-img-appeared')) {
                    // Draw wavy/liquified displacement overlay
                    ctx.save();
                    ctx.globalAlpha = 0.25;
                    ctx.strokeStyle = 'rgba(10,251,193,0.3)';
                    ctx.lineWidth = 2;

                    ctx.beginPath();
                    for (var x = 0; x < canvas.width; x += 15) {
                        var y = (canvas.height * 0.5) + Math.sin(x * 0.03 + time) * 15;
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                    ctx.restore();
                }

                active.rafId = requestAnimationFrame(render);
            };

            if (typeof IntersectionObserver !== 'undefined') {
                active.liquidObserver = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        isVisible = entry.isIntersecting;
                        if (isVisible) {
                            render();
                        } else if (active.rafId) {
                            cancelAnimationFrame(active.rafId);
                            active.rafId = null;
                        }
                    });
                }, { threshold: 0.05 });
                active.liquidObserver.observe(wrapper);
            } else {
                render();
            }
        }

        activeImageInteractions.set(wrapper, active);
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
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            return false;
        }

        function AuroraImageEffectsHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraImageEffectsHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraImageEffectsHandler.prototype.constructor = AuroraImageEffectsHandler;

        AuroraImageEffectsHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_img_entrance_enable') === 'yes' ||
                   this.getElementSettings('aurora_img_hover_enable') === 'yes';
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

        AuroraImageEffectsHandler.prototype.getHoverOpts = function () {
            return {
                enable    : this.getElementSettings('aurora_img_hover_enable') === 'yes',
                effect    : this.getElementSettings('aurora_img_hover_effect') || 'shine',
                trigger   : this.getElementSettings('aurora_img_hover_trigger') || 'hover',
                slide     : this.getElementSettings('aurora_img_hover_slide_dir') || 'up',
                threshold : 0.15
            };
        };

        AuroraImageEffectsHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var entranceEnabled = this.getElementSettings('aurora_img_entrance_enable') === 'yes';
            var hoverEnabled = this.getElementSettings('aurora_img_hover_enable') === 'yes';

            if (!entranceEnabled) {
                teardownImgEntrance(wrapper);
            } else {
                var opts = this.getOpts();
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        initImgEntrance(wrapper, opts);
                    });
                });
            }

            if (!hoverEnabled) {
                clearImageInteractions(wrapper);
            } else {
                var hoverOpts = this.getHoverOpts();
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        initImageInteractions(wrapper, hoverOpts);
                    });
                });
            }
        };

        AuroraImageEffectsHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.runAnimation();
        };

        AuroraImageEffectsHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_img_entrance_') === 0 || propertyName.indexOf('aurora_img_hover_') === 0) {
                this.runAnimation();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            elementorFrontend.elementsHandler.addHandler(AuroraImageEffectsHandler, { $element: $element });
        });

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
        $(window).on('elementor/frontend/init', function () {
            tryRegisterHandlerNow();
        });
    }

    function parseHoverOptsFromDataset(wrapper) {
        var ds = wrapper.dataset;
        return {
            enable    : wrapper.classList.contains('aurora-img-hover-active'),
            effect    : ds.auroraImgHover || 'shine',
            trigger   : ds.auroraImgTrigger || 'hover',
            slide     : ds.auroraImgSlide || 'up',
            threshold : 0.15
        };
    }

    function bootstrap() {
        waitForEntranceLibs(function () {

            // Fallback: no Elementor JS available — scan the page using the
            // data-aurora-img-entrance-* attributes rendered by PHP on the
            // real frontend.
            if (typeof elementorFrontend === 'undefined') {
                document.querySelectorAll('[data-aurora-img-entrance-enable="1"]').forEach(function (el) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            initImgEntrance(el, parseOptsFromDataset(el));
                        });
                    });
                });
                document.querySelectorAll('.aurora-img-hover-active').forEach(function (el) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            initImageInteractions(el, parseHoverOptsFromDataset(el));
                        });
                    });
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
