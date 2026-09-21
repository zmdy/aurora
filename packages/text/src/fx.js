/**
 * The `fx` toolkit handed to every effect.
 *
 * It wraps Anime.js and the timer APIs so that everything an effect starts is
 * tracked. One call to `cleanup()` stops all animations, timers and listeners
 * of a run, which is what makes replay, update and destroy safe.
 */

import { animate, createTimeline, set, splitText, scrambleText, utils } from 'animejs';

function stop(handle) {
    if (!handle) return;
    if (typeof handle.cancel === 'function') handle.cancel();
    else if (typeof handle.pause === 'function') handle.pause();
}

/**
 * @param {HTMLElement} textEl   Element whose text is animated.
 * @param {string} original      Text content before any splitting.
 */
export function createFx(textEl, original) {
    var handles = [];
    var timeouts = [];
    var intervals = [];
    var cleanups = [];
    var splitter = null;

    function track(handle) {
        handles.push(handle);
        return handle;
    }

    var fx = {
        original: original,
        reducedMotion: false,

        animate: function (targets, params) { return track(animate(targets, params)); },
        createTimeline: function (params) { return track(createTimeline(params)); },
        set: set,
        splitText: splitText,
        scrambleText: scrambleText,
        utils: utils,

        /**
         * Splits the element with Anime.js, reverting the previous split first.
         */
        resplit: function (target, settings) {
            if (splitter && typeof splitter.revert === 'function') splitter.revert();
            splitter = splitText(target, settings);
            return splitter;
        },

        setTimeout: function (callback, delay) {
            var id = setTimeout(callback, delay);
            timeouts.push(id);
            return id;
        },
        setInterval: function (callback, delay) {
            var id = setInterval(callback, delay);
            intervals.push(id);
            return id;
        },
        clearInterval: function (id) { clearInterval(id); },

        /** Adds an event listener that is removed on cleanup. */
        on: function (target, type, handler, options) {
            target.addEventListener(type, handler, options);
            cleanups.push(function () { target.removeEventListener(type, handler, options); });
        },

        /** Registers a function to run on cleanup. */
        onCleanup: function (callback) { cleanups.push(callback); },

        /** Stops everything the effect started. Safe to call more than once. */
        cleanup: function () {
            handles.splice(0).forEach(stop);
            timeouts.splice(0).forEach(clearTimeout);
            intervals.splice(0).forEach(clearInterval);
            while (cleanups.length) {
                try { cleanups.pop()(); } catch (error) { console.error('[Aurora] Effect cleanup threw:', error); }
            }
            if (splitter && typeof splitter.revert === 'function') {
                try { splitter.revert(); } catch (error) { /* the DOM is restored by the module anyway */ }
            }
            splitter = null;
        },
    };

    return fx;
}
