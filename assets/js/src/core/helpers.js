/**
 * Aurora Text Animation — small portable helpers shared by a handful of
 * "self-managed" effects (ones that don't use the generic split `units`,
 * see registry.js's `selfManaged` flag). Kept separate from dom.js because
 * these are specific to a couple of effects rather than the general split
 * pipeline, and separate from any one effect file since more than one
 * effect reuses them (gs-3 uses scrambleTextEffect; ml-11/12/13 use
 * resplitNative).
 */

/* global anime */

export var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&';

/**
 * Animates an element's text with a scramble/hacker effect. Hand-rolled
 * (setInterval-based) rather than relying on a GSAP plugin, so it has zero
 * dependency on GSAP's paid TextPlugin/ScrambleTextPlugin.
 *
 * @param {HTMLElement} el
 * @param {string}      finalText
 * @param {number}      duration   ms
 * @param {number}      delay      ms
 */
export function scrambleTextEffect(el, finalText, duration, delay) {
    el.style.opacity = '1';
    el.style.fontVariantNumeric = 'tabular-nums';

    if (el._auroraScrambleTimeout) {
        clearTimeout(el._auroraScrambleTimeout);
        el._auroraScrambleTimeout = null;
    }
    if (el._auroraScrambleInterval) {
        clearInterval(el._auroraScrambleInterval);
        el._auroraScrambleInterval = null;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = finalText;
        return;
    }

    el._auroraScrambleTimeout = setTimeout(function () {
        var steps = Math.max(10, Math.floor(duration / 40));
        var step = 0;
        el._auroraScrambleInterval = setInterval(function () {
            var progress = step / steps;
            var output = '';
            for (var i = 0; i < finalText.length; i++) {
                if (finalText[i] === ' ') {
                    output += ' ';
                } else if (i / finalText.length < progress) {
                    output += finalText[i];
                } else {
                    output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                }
            }
            el.textContent = output;
            step++;
            if (step > steps) {
                clearInterval(el._auroraScrambleInterval);
                el._auroraScrambleInterval = null;
                el._auroraScrambleTimeout = null;
                el.textContent = finalText;
            }
        }, 40);
    }, delay);
}

/**
 * (Re)runs Anime.js v4's native split, reverting any previous split of the
 * same element before splitting again. Needed to support "Replay on
 * re-entering viewport" without splitting a DOM that's already been split
 * (which would duplicate/corrupt the content).
 *
 * @param {HTMLElement} textEl
 * @param {Object}      settings  anime.splitText() settings
 * @returns {Object} TextSplitter
 */
export function resplitNative(textEl, settings) {
    if (textEl._auroraSplitInstance && typeof textEl._auroraSplitInstance.revert === 'function') {
        textEl._auroraSplitInstance.revert();
        textEl._auroraSplitInstance = null;
    } else if (typeof textEl._auroraPristineHTML !== 'undefined') {
        textEl.innerHTML = textEl._auroraPristineHTML;
    }
    var split = anime.splitText(textEl, settings);
    textEl._auroraSplitInstance = split;
    return split;
}
