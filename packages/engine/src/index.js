/**
 * Mounting an animated-headlines component.
 *
 * The engine is published as an ES module, so its <script> is deferred and
 * runs after the classic Aurora scripts on the same page. A module that
 * mounted its component right away would therefore find nothing registered
 * and give up, even though the library arrives a moment later - and that is
 * the ordinary case, not an edge one. So the build is run as soon as the
 * element is defined, which is immediately when the engine is already there.
 */

/** How long to wait before saying the library is missing rather than late. */
var GRACE_MS = 5000;

/**
 * @param {object}   ctx   Module context, for warn().
 * @param {string}   tag   Custom element the module mounts.
 * @param {function} build Called once the element is defined.
 * @returns {boolean} Whether it ran synchronously.
 */
export function whenDefined(ctx, tag, build) {
    if (typeof customElements === 'undefined') {
        ctx.warn('This browser has no custom elements, so "' + tag + '" cannot run.');
        return false;
    }

    if (customElements.get(tag)) {
        build();
        return true;
    }

    var cancelled = false;
    customElements.whenDefined(tag).then(function () {
        if (!cancelled) build();
    });
    // whenDefined() never rejects: without this the script simply being absent
    // would be silent, which is the one case worth reporting.
    setTimeout(function () {
        if (!cancelled && !customElements.get(tag)) {
            ctx.warn('The animated-headlines script is not on the page, so "' + tag + '" never runs.');
        }
    }, GRACE_MS);

    ctx.onDestroy(function () { cancelled = true; });
    return false;
}
