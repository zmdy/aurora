/**
 * Aurora Text Animation — shared runtime engine.
 *
 * This is the ONLY module that knows about wrappers, triggers,
 * IntersectionObserver, and the Elementor data-aurora-* attribute
 * contract. It never references a specific effect by id — it always goes
 * through the registry (core/registry.js), so it's identical between the
 * editor bundle (every effect pre-registered) and the real frontend
 * (effects arrive as separate, PHP-selected script chunks).
 */

import { getTextTarget, splitText } from './dom.js';
import { getEffect } from './registry.js';
import { anime } from './anime-ref.js';
import { gsap } from './gsap-ref.js';

/**
 * Normalizes an Elementor slider value ({size, unit}, number, or string).
 *
 * @param {*}      val
 * @param {number} fallback
 * @returns {number}
 */
export function sizeOf(val, fallback) {
    if (val && typeof val === 'object' && typeof val.size !== 'undefined') {
        var fromObj = parseFloat(val.size);
        return isNaN(fromObj) ? fallback : fromObj;
    }
    var num = parseFloat(val);
    return isNaN(num) ? fallback : num;
}

/**
 * Reads the animation options from the data-aurora-* attributes (rendered
 * by PHP). Used only as a last resort, when the Elementor Frontend
 * Handlers system isn't available (e.g. very old versions).
 *
 * @param {HTMLElement} wrapper
 * @returns {Object}
 */
export function parseOptsFromDataset(wrapper) {
    var ds = wrapper.dataset;
    return {
        library: ds.auroraLibrary || 'gsap',
        animation: ds.auroraAnimation || 'gs-1',
        splitBy: ds.auroraSplitBy || 'chars',
        duration: parseInt(ds.auroraDuration, 10) || 800,
        delay: parseInt(ds.auroraDelay, 10) || 0,
        stagger: parseInt(ds.auroraStagger, 10) || 30,
        trigger: ds.auroraTrigger || 'scroll',
        threshold: parseFloat(ds.auroraThreshold) || 0.2,
        replay: ds.auroraReplay === '1',
        hoverEnable: ds.auroraHoverEnable === '1',
        hoverIntensity: parseInt(ds.auroraHoverIntensity, 10) || 24,
        hoverDuration: parseInt(ds.auroraHoverDuration, 10) || 350,
    };
}

/**
 * Visually resets the units to their initial state (before the animation).
 *
 * @param {HTMLElement[]} units
 * @param {Object}        opts
 */
export function resetUnits(units, opts) {
    if (typeof gsap !== 'undefined') {
        gsap.set(units, { clearProps: 'all', opacity: 0 });
    } else {
        units.forEach(function (u) { u.style.opacity = '0'; });
    }

    // Clear the blur reveal filters.
    if (opts.animation === 'ml-8') {
        units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
    }
}

/**
 * Whether the given effect id manages its own DOM/split (see
 * registry.js's `selfManaged` flag) instead of using the generic `units`
 * pre-split by splitText(). Looked up live from the registry, so this
 * works for effects registered ahead of time (editor) or just-in-time
 * (frontend chunk that only finished loading moments ago).
 *
 * @param {string} animation
 * @returns {boolean}
 */
export function isSelfManaged(animation) {
    var effect = getEffect(animation);
    return !!(effect && effect.selfManaged);
}

/**
 * Runs the animation according to the resolved effect id, looked up from
 * the shared registry (core/registry.js).
 *
 * @param {HTMLElement[]} units
 * @param {Object}        opts
 * @param {HTMLElement}   textEl
 */
export function playAnimation(units, opts, textEl) {
    var effect = getEffect(opts.animation);
    if (effect && typeof effect.run === 'function') {
        effect.run(units, opts, textEl);
    }
}

/**
 * Hover Scatter — independent of the entrance effect. On mouseenter, each
 * split unit jumps to a random offset/rotation; on mouseleave it settles
 * back to its natural position with an elastic ease. Recreates the "each
 * letter becomes randomly spaced" example from Motion.dev's splitText docs
 * (a Motion+-only feature) using the already-bundled, free Anime.js
 * instead.
 *
 * Reuses the SAME `units` array produced for the entrance effect rather
 * than re-splitting the text, so it only makes sense when the entrance
 * effect actually split the text (not for self-managed effects, which
 * don't populate `units`).
 *
 * @param {HTMLElement}   wrapper
 * @param {HTMLElement[]} units
 * @param {Object}        opts
 */
export function attachHoverScatter(wrapper, units, opts) {
    if (!opts.hoverEnable || !units || !units.length || typeof anime === 'undefined') {
        return;
    }

    var intensity = opts.hoverIntensity || 24;
    var duration = opts.hoverDuration || 350;

    function rand(min, max) {
        if (anime && anime.utils && typeof anime.utils.random === 'function') {
            return anime.utils.random(min, max);
        }
        return Math.random() * (max - min) + min;
    }

    function onEnter() {
        units.forEach(function (u) {
            anime.animate(u, {
                translateX: rand(-intensity, intensity),
                translateY: rand(-intensity, intensity),
                rotate: rand(-intensity, intensity) / 2,
                duration: duration,
                ease: 'outQuart',
            });
        });
    }

    function onLeave() {
        units.forEach(function (u) {
            anime.animate(u, {
                translateX: 0,
                translateY: 0,
                rotate: 0,
                duration: duration,
                ease: 'outElastic(1,.6)',
            });
        });
    }

    // Clean up any previous listeners before attaching new ones (safe to
    // call repeatedly across reinitializations from the editor).
    detachHoverScatter(wrapper);

    wrapper.addEventListener('mouseenter', onEnter);
    wrapper.addEventListener('mouseleave', onLeave);
    wrapper._auroraHoverHandlers = { enter: onEnter, leave: onLeave };
}

/**
 * Removes any Hover Scatter listeners previously attached to `wrapper`.
 *
 * @param {HTMLElement} wrapper
 */
export function detachHoverScatter(wrapper) {
    if (wrapper._auroraHoverHandlers) {
        wrapper.removeEventListener('mouseenter', wrapper._auroraHoverHandlers.enter);
        wrapper.removeEventListener('mouseleave', wrapper._auroraHoverHandlers.leave);
        wrapper._auroraHoverHandlers = null;
    }
}

/**
 * Initializes (or reinitializes) the text animation for a wrapper. Can be
 * called multiple times for the same wrapper — for instance, when the user
 * changes a control in the Elementor panel. Every call restores the
 * target's original HTML before splitting again (the split is
 * destructive) and replaces any observer from a previous run.
 *
 * @param {HTMLElement} wrapper
 * @param {Object}      opts
 */
export function initTextAnimation(wrapper, opts) {
    var textEl = getTextTarget(wrapper);
    if (textEl) {
        textEl._auroraLeaves = null;
    }

    // Store (only once) the target's original HTML, so it can be restored
    // before each reinitialization.
    if (textEl && typeof textEl._auroraPristineHTML === 'undefined') {
        textEl._auroraPristineHTML = textEl.innerHTML;
    } else if (textEl) {
        textEl.innerHTML = textEl._auroraPristineHTML;
    }

    // Cancel any observer from a previous initialization.
    if (wrapper._auroraObserver) {
        wrapper._auroraObserver.disconnect();
        wrapper._auroraObserver = null;
    }

    // Store the original text (needed for scramble). Use textContent (not
    // innerText) to avoid baking in CSS text-transform (uppercase, etc.).
    textEl._auroraOriginal = textEl.textContent;

    // Text splitting (doesn't apply to self-managed effects, which do
    // their own split/scramble).
    var units = [];
    if (!isSelfManaged(opts.animation)) {
        units = splitText(textEl, opts.splitBy);
    }

    // Only hide the text units if the effect is already registered — avoids
    // leaving text permanently invisible when the effect chunk is still in
    // flight on slow connections. If not ready yet, the trigger() will
    // poll until it arrives or fall back to revealing the text.
    var effectReady = !!getEffect(opts.animation);
    if (!isSelfManaged(opts.animation)) {
        if (effectReady) {
            units.forEach(function (u) { u.style.opacity = '0'; });
        }
    } else {
        if (effectReady) {
            textEl.style.opacity = '0';
        }
    }

    // Announce the DOM change so peer Aurora modules that painted the
    // element BEFORE the split (Gradient's background-clip:text, most
    // notably) can re-apply themselves to the freshly-created spans.
    // Coupling the two via a custom event keeps the modules independent —
    // this engine doesn't need to know Gradient exists.
    try {
        wrapper.dispatchEvent(new CustomEvent('aurora:text-split', {
            bubbles: true,
            detail: { textEl: textEl, units: units }
        }));
    } catch (e) {}

    // Hover Scatter is independent of the entrance effect/trigger above —
    // wire it up regardless of whether the entrance is scroll- or
    // load-triggered. No-ops internally if disabled or self-managed.
    attachHoverScatter(wrapper, units, opts);

    var played = false;

    function trigger() {
        if (played && !opts.replay) return;

        var effect = getEffect(opts.animation);

        // Effect chunk not yet loaded — poll briefly (up to 5s) and retry.
        // This handles the race condition where element_ready fires before
        // the async effect JS chunk has finished registering itself.
        if (!effect || typeof effect.run !== 'function') {
            var retries = 0;
            var maxRetries = 100; // 100 × 50ms = 5s
            var poll = setInterval(function () {
                retries++;
                effect = getEffect(opts.animation);
                if (effect && typeof effect.run === 'function') {
                    clearInterval(poll);
                    if (!isSelfManaged(opts.animation)) {
                        units.forEach(function (u) { u.style.opacity = '0'; });
                    } else {
                        textEl.style.opacity = '0';
                    }
                    played = true;
                    playAnimation(units, opts, textEl);
                } else if (retries >= maxRetries) {
                    clearInterval(poll);
                    // Give up — reveal the text so it's not permanently hidden.
                    if (!isSelfManaged(opts.animation)) {
                        units.forEach(function (u) { u.style.opacity = ''; });
                    } else {
                        textEl.style.opacity = '';
                    }
                }
            }, 50);
            return;
        }

        played = true;
        if (!isSelfManaged(opts.animation)) {
            units.forEach(function (u) { u.style.opacity = '0'; }); // Reset before re-animating.
        }

        playAnimation(units, opts, textEl);
    }

    function reset() {
        played = false;
        if (isSelfManaged(opts.animation)) {
            textEl.style.opacity = '0';
        } else {
            resetUnits(units, opts);
        }
    }

    if (opts.trigger === 'scroll') {
        // Clamp threshold to 0.05 to avoid the observer never firing for
        // elements that are partially in the viewport at page-load time
        // (e.g. hero headings). A threshold of 0 means "fire as soon as
        // 1px is visible", which is the safest possible value for hero.
        var safeThreshold = Math.min(opts.threshold || 0.2, 0.05);

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    trigger();
                    if (!opts.replay) observer.unobserve(entry.target);
                } else if (opts.replay) {
                    reset();
                }
            });
        }, { threshold: safeThreshold });

        observer.observe(wrapper);
        wrapper._auroraObserver = observer;

        // Safety net: if the element is already in the viewport when the
        // observer is set up (e.g. hero H1 above-the-fold), the browser
        // may not fire the callback synchronously. Check once after a
        // short delay and trigger manually if still not played.
        //
        // ALSO covers elements that are already scrolled PAST the
        // viewport (rect.bottom <= 0) at this same check. Reloading a
        // page (F5/Cmd+R) makes most browsers restore the previous
        // scroll position before this script ever runs — a fresh
        // IntersectionObserver created at that scroll position never
        // sees those already-passed elements "enter" the viewport (they
        // were already behind it the instant it started observing), so
        // without this branch they'd stay at opacity:0 forever unless the
        // user manually scrolls back up past them. This is what made
        // reloading the page look like "every heading above where you'd
        // scrolled to just disappears and never comes back" — not just
        // the hero, but any already-passed element anywhere on the page.
        setTimeout(function () {
            if (wrapper._auroraObserver) { // still active
                var rect = wrapper.getBoundingClientRect();
                var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                var inView = rect.bottom > 0 && rect.top < viewportHeight;
                var alreadyScrolledPast = rect.bottom <= 0;
                if (inView || alreadyScrolledPast) {
                    trigger();
                    if (!opts.replay) {
                        observer.unobserve(wrapper);
                    }
                }
            }
        }, 200);
    } else {
        // Fires immediately on load.
        trigger();
    }
}

/**
 * Reverts the text animation of a wrapper, restoring the original HTML
 * (used when the "Enable Text Animation" control is dynamically turned
 * off in the editor).
 *
 * @param {HTMLElement} wrapper
 */
export function teardownTextAnimation(wrapper) {
    if (wrapper._auroraObserver) {
        wrapper._auroraObserver.disconnect();
        wrapper._auroraObserver = null;
    }
    detachHoverScatter(wrapper);
    var textEl = getTextTarget(wrapper);
    if (textEl) {
        if (textEl._auroraScrambleTimeout) {
            clearTimeout(textEl._auroraScrambleTimeout);
            textEl._auroraScrambleTimeout = null;
        }
        if (textEl._auroraScrambleInterval) {
            clearInterval(textEl._auroraScrambleInterval);
            textEl._auroraScrambleInterval = null;
        }
        if (textEl._auroraTypeTimeouts) {
            textEl._auroraTypeTimeouts.forEach(clearTimeout);
            textEl._auroraTypeTimeouts = null;
        }
        if (textEl._auroraTypeHandles) {
            textEl._auroraTypeHandles.forEach(clearInterval);
            textEl._auroraTypeHandles = null;
        }
        if (textEl._auroraWaveAnim) {
            if (typeof textEl._auroraWaveAnim.pause === 'function') {
                textEl._auroraWaveAnim.pause();
            }
            textEl._auroraWaveAnim = null;
        }
        if (textEl._auroraLoopAnim) {
            if (typeof textEl._auroraLoopAnim.pause === 'function') {
                textEl._auroraLoopAnim.pause();
            }
            textEl._auroraLoopAnim = null;
        }
        // gs-29/ml-47 Scroll Highlight's window-level scroll/resize binding.
        if (textEl._auroraScrollHighlight) {
            window.removeEventListener('scroll', textEl._auroraScrollHighlight);
            window.removeEventListener('resize', textEl._auroraScrollHighlight);
            textEl._auroraScrollHighlight = null;
        }
        // gs-31/ml-49 Letter Roll's independent hover handler.
        if (textEl._auroraRollHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraRollHover);
            textEl._auroraRollHover = null;
        }
        // gs-28/ml-46 Stagger Flip 3D's independent hover handler + timeline.
        if (textEl._auroraFlipHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraFlipHover);
            textEl._auroraFlipHover = null;
        }
        if (textEl._auroraFlipTimeline) {
            if (typeof textEl._auroraFlipTimeline.kill === 'function') {
                textEl._auroraFlipTimeline.kill();
            }
            textEl._auroraFlipTimeline = null;
        }
        // gs-33/ml-51 Letter Swap's independent hover handlers.
        if (textEl._auroraSwapHover) {
            textEl.removeEventListener('mouseenter', textEl._auroraSwapHover.enter);
            textEl.removeEventListener('mouseleave', textEl._auroraSwapHover.leave);
            textEl._auroraSwapHover.pause();
            textEl._auroraSwapHover = null;
        }
        // gs-34/ml-52 Mesh Text Hover's WebGL context, RAF loop, resize/
        // pointer listeners and IntersectionObserver.
        if (textEl._auroraMeshText) {
            textEl._auroraMeshText.cleanup();
            textEl._auroraMeshText = null;
        }
        // gs-30/ml-48 Text Reveal Wall's per-line tweens, restart timeout,
        // resize listener and IntersectionObserver.
        if (textEl._auroraRevealWall) {
            textEl._auroraRevealWall.cleanup();
            textEl._auroraRevealWall = null;
        }
        // gs-35/ml-53 Appear Text's looping timeline + IntersectionObserver.
        if (textEl._auroraKineticGrid) {
            textEl._auroraKineticGrid.cleanup();
            textEl._auroraKineticGrid = null;
        }

        textEl._auroraLeaves = null;

        if (typeof textEl._auroraPristineHTML !== 'undefined') {
            textEl.innerHTML = textEl._auroraPristineHTML;
            textEl.style.opacity = '';
            textEl._auroraSplitInstance = null;
        }
    }
}

/**
 * Polls until the required animation library (GSAP or Anime.js) becomes
 * available on window (or a max wait elapses), then invokes the callback.
 *
 * @param {string|function} lib       'gsap' | 'animejs' | 'any' (or callback)
 * @param {function}        [callback]
 */
export function waitForLibs(lib, callback) {
    if (typeof lib === 'function') {
        callback = lib;
        lib = 'any';
    }
    if (typeof callback !== 'function') return;

    var waited = 0;
    var maxWait = 6000;
    var step = 30;
    var timer = setInterval(function () {
        waited += step;
        var gsapOk = typeof window !== 'undefined' && !!(window.AuroraGSAP || window.gsap);
        var animeOk = typeof window !== 'undefined' && !!(window.AuroraAnimeJS || window.anime);
        var ready = false;
        if (lib === 'gsap') {
            ready = gsapOk;
        } else if (lib === 'animejs') {
            ready = animeOk;
        } else {
            ready = gsapOk || animeOk;
        }
        if (ready || waited >= maxWait) {
            clearInterval(timer);
            callback();
        }
    }, step);
}
