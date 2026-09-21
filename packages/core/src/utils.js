/**
 * Small, dependency-free helpers shared across the core and the modules.
 */

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Converts `camelCase` to `kebab-case` (`splitBy` -> `split-by`).
 *
 * @param {string} value
 * @returns {string}
 */
export function camelToKebab(value) {
    return String(value).replace(/[A-Z]/g, function (char) { return '-' + char.toLowerCase(); });
}

/**
 * Converts `kebab-case` to `camelCase` (`morph-card` -> `morphCard`).
 *
 * @param {string} value
 * @returns {string}
 */
export function kebabToCamel(value) {
    return String(value).replace(/-([a-z0-9])/g, function (_, char) { return char.toUpperCase(); });
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * @param {*} value
 * @returns {boolean} True for `{}`-style objects (not arrays, not null).
 */
export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Trailing-edge debounce.
 *
 * @param {Function} fn
 * @param {number} wait Milliseconds.
 * @returns {Function & { cancel: Function }}
 */
export function debounce(fn, wait) {
    var timer = null;
    function debounced() {
        var args = arguments;
        var self = this;
        clearTimeout(timer);
        timer = setTimeout(function () {
            timer = null;
            fn.apply(self, args);
        }, wait);
    }
    debounced.cancel = function () {
        clearTimeout(timer);
        timer = null;
    };
    return debounced;
}

/**
 * Resolves a selector, element, NodeList or array into a flat element array.
 *
 * @param {string|Element|Iterable<Element>|null|undefined} target
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export function resolveTargets(target, root) {
    if (!target) return [];
    if (typeof target === 'string') {
        var scope = root || (isBrowser ? document : null);
        return scope ? Array.prototype.slice.call(scope.querySelectorAll(target)) : [];
    }
    if (typeof target.nodeType === 'number') return target.nodeType === 1 ? [target] : [];
    if (typeof target.length === 'number') return Array.prototype.slice.call(target).filter(function (n) { return n && n.nodeType === 1; });
    return [];
}
