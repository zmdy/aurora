/**
 * Cross-module communication through DOM CustomEvents.
 *
 * Modules never import each other. When one needs to tell another something
 * (for example the text module announcing that it split a heading into
 * characters, so the gradient module can repaint them) it dispatches
 * `aurora:<module>:<type>` on its element. The event bubbles.
 */

/**
 * @param {Element} el
 * @param {string} moduleName
 * @param {string} type
 * @param {*} [detail]
 * @returns {boolean} False when a listener called `preventDefault()`.
 */
export function emit(el, moduleName, type, detail) {
    var event = new CustomEvent('aurora:' + moduleName + ':' + type, {
        bubbles: true,
        cancelable: true,
        detail: detail,
    });
    return el.dispatchEvent(event);
}

/**
 * @param {EventTarget} target
 * @param {string} moduleName
 * @param {string} type
 * @param {(event: CustomEvent) => void} handler
 * @returns {() => void} Removes the listener.
 */
export function listen(target, moduleName, type, handler) {
    var name = 'aurora:' + moduleName + ':' + type;
    target.addEventListener(name, handler);
    return function () { target.removeEventListener(name, handler); };
}
