/**
 * Idempotent stylesheet injection.
 *
 * Modules ship their base CSS inside their JavaScript so a single `<script>`
 * is enough on any page. The stylesheet is created once per id, even when
 * several copies of the core are loaded on the same page.
 */

import { isBrowser } from './utils.js';

/**
 * @param {string} id     Unique stylesheet id, e.g. `text`.
 * @param {string} css
 * @param {{nonce?: string}} [options] `nonce` for pages with a strict Content-Security-Policy.
 * @returns {HTMLStyleElement|null}
 */
export function injectStyle(id, css, options) {
    if (!isBrowser) return null;

    var selector = 'style[data-aurora-style="' + id + '"]';
    var existing = document.head.querySelector(selector);
    if (existing) return existing;

    var style = document.createElement('style');
    style.setAttribute('data-aurora-style', id);
    if (options && options.nonce) style.setAttribute('nonce', options.nonce);
    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

/**
 * @param {string} id
 */
export function removeStyle(id) {
    if (!isBrowser) return;
    var existing = document.head.querySelector('style[data-aurora-style="' + id + '"]');
    if (existing) existing.remove();
}
