/**
 * Resolves the elements to animate, independent of any page builder.
 *
 * - With a `selector`, the outermost descendants matching it are used.
 * - Without one, the children of the root are used; `depth` > 1 also includes
 *   deeper levels (level by level, in document order per level).
 *
 * Builder adapters supply their own selector (for example the Elementor
 * adapter targets its container and widget classes).
 */

function safeMatches(el, selector) {
    try {
        return el.matches(selector);
    } catch (error) {
        return false;
    }
}

/**
 * @param {Element} root
 * @param {{selector?: string, depth?: number}} options
 * @returns {Element[]}
 */
export function resolveChildren(root, options) {
    var selector = options.selector || '';
    var depth = Math.max(1, Math.floor(options.depth || 1));

    if (selector) {
        var found;
        try {
            found = Array.prototype.slice.call(root.querySelectorAll(selector));
        } catch (error) {
            return [];
        }
        return found.filter(function (el) {
            if (el === root) return false;
            var parent = el.parentElement;
            while (parent && parent !== root) {
                if (safeMatches(parent, selector)) return false;
                parent = parent.parentElement;
            }
            return true;
        });
    }

    var result = [];
    var level = Array.prototype.slice.call(root.children);
    for (var d = 1; d <= depth && level.length; d++) {
        result = result.concat(level);
        if (d === depth) break;
        var next = [];
        level.forEach(function (el) {
            Array.prototype.push.apply(next, Array.prototype.slice.call(el.children));
        });
        level = next;
    }
    return result;
}
