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

/* global gsap, anime */

import { getTextTarget, splitText } from './dom.js';
import { getEffect } from './registry.js';

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

    // Store (only once) the target's original HTML, so it can be restored
    // before each reinitialization.
    if (typeof textEl._auroraPristineHTML === 'undefined') {
        textEl._auroraPristineHTML = textEl.innerHTML;
    } else {
        textEl.innerHTML = textEl._auroraPristineHTML;
    }

    // Cancel any observer from a previous initialization.
    if (wrapper._auroraObserver) {
        wrapper._auroraObserver.disconnect();
        wrapper._auroraObserver = null;
    }

    // Store the original text (needed for scramble).
    textEl._auroraOriginal = textEl.innerText || textEl.textContent;

    // Text splitting (doesn't apply to self-managed effects, which do
    // their own split/scramble).
    var units = [];
    if (!isSelfManaged(opts.animation)) {
        units = splitText(textEl, opts.splitBy);
        // Initial state: invisible.
        units.forEach(function (u) { u.style.opacity = '0'; });
    } else {
        // Self-managed: keeps the text but hides the element; the effect
        // itself reveals it when it runs.
        textEl.style.opacity = '0';
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
        wrapper._auroraObserver = observer;
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

        if (typeof textEl._auroraPristineHTML !== 'undefined') {
            textEl.innerHTML = textEl._auroraPristineHTML;
            textEl.style.opacity = '';
            textEl._auroraSplitInstance = null;
        }
    }
}

/**
 * Polls until GSAP or Anime.js becomes available (or a max wait elapses),
 * then invokes the callback.
 *
 * @param {function} callback
 */
export function waitForLibs(callback) {
    var waited = 0;
    var maxWait = 6000;
    var step = 80;
    var timer = setInterval(function () {
        waited += step;
        var gsapOk = typeof gsap !== 'undefined';
        var animeOk = typeof anime !== 'undefined';
        if (gsapOk || animeOk || waited >= maxWait) {
            clearInterval(timer);
            callback();
        }
    }, step);
}
