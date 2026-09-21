/**
 * Reversible DOM writes.
 *
 * Every style, class, attribute, listener and callback the gradient applies
 * goes through a painter, so reverting restores exactly what was there before
 * (including styles the page or other Aurora modules set on the same element).
 */
export function createPainter() {
    var undo = [];

    return {
        style: function (el, property, value) {
            var previous = el.style.getPropertyValue(property);
            var priority = el.style.getPropertyPriority(property);
            el.style.setProperty(property, value);
            undo.push(function () {
                if (previous) el.style.setProperty(property, previous, priority);
                else el.style.removeProperty(property);
            });
        },

        addClass: function (el, name) {
            if (el.classList.contains(name)) return;
            el.classList.add(name);
            undo.push(function () { el.classList.remove(name); });
        },

        on: function (target, type, handler, options) {
            target.addEventListener(type, handler, options);
            undo.push(function () { target.removeEventListener(type, handler, options); });
        },

        /** Runs `fn` when reverted. */
        onRevert: function (fn) { undo.push(fn); },

        revert: function () {
            while (undo.length) {
                try { undo.pop()(); } catch (error) { console.error('[Aurora] Gradient revert threw:', error); }
            }
        },
    };
}
