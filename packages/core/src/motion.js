/**
 * Media-query based accessibility and capability signals, shared by every
 * module so each one does not have to query and listen on its own.
 */

import { isBrowser } from './utils.js';

var queries = {};

function getQuery(text) {
    if (!isBrowser || typeof window.matchMedia !== 'function') return null;
    if (!queries[text]) queries[text] = window.matchMedia(text);
    return queries[text];
}

function subscribe(query, callback) {
    if (!query) return function () {};
    var handler = function () { callback(query.matches); };
    if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', handler);
        return function () { query.removeEventListener('change', handler); };
    }
    // Safari < 14
    query.addListener(handler);
    return function () { query.removeListener(handler); };
}

/**
 * @returns {boolean} True when the user asked the OS/browser for reduced motion.
 */
export function prefersReducedMotion() {
    var query = getQuery('(prefers-reduced-motion: reduce)');
    return query ? query.matches : false;
}

/**
 * @param {(reduced: boolean) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onReducedMotionChange(callback) {
    return subscribe(getQuery('(prefers-reduced-motion: reduce)'), callback);
}

/**
 * @returns {boolean} True when the primary input can hover (mouse, trackpad).
 *                    Assumes true when the query is not supported.
 */
export function hasHover() {
    var query = getQuery('(hover: hover)');
    return query ? query.matches : true;
}
