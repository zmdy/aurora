import { buildGradientCss, LEAF_SELECTOR } from './css.js';
import { startFollow } from './follow.js';

/**
 * `background-clip: text` needs the gradient on the element that directly
 * holds the glyphs, so split-text units get painted individually.
 */
export function paintClip(el, gradient, painter) {
    painter.style(el, '-webkit-background-clip', 'text');
    painter.style(el, 'background-clip', 'text');
    painter.style(el, 'color', 'transparent');
    painter.style(el, '-webkit-text-fill-color', 'transparent');
    painter.style(el, 'background-image', gradient);
}

/**
 * Tall accents (Ê, Õ) and descenders are clipped by the text-metric box that
 * background-clip uses when line-height is tight, so a little room is added.
 */
export function guardGlyphBox(el, painter, padding) {
    if (!el.style.paddingTop) painter.style(el, 'padding-top', padding);
    if (!el.style.paddingBottom) painter.style(el, 'padding-bottom', padding);
    var computed = getComputedStyle(el);
    if (parseFloat(computed.lineHeight) / parseFloat(computed.fontSize) < 1.2) {
        painter.style(el, 'line-height', '1.25');
    }
}

/**
 * Paints the gradient as text fill.
 *
 * @param {HTMLElement} textEl  Node holding the text (or the split units).
 * @param {HTMLElement} trackEl Element tracking the pointer for the spotlight.
 */
export function paintText(textEl, trackEl, options, stops, painter, animated) {
    guardGlyphBox(textEl, painter, '0.1em');
    var leaves = Array.prototype.slice.call(textEl.querySelectorAll(LEAF_SELECTOR));

    if (options.followMouse) {
        painter.style(textEl, '-webkit-background-clip', 'text');
        painter.style(textEl, 'background-clip', 'text');
        painter.style(textEl, 'color', 'transparent');
        painter.style(textEl, '-webkit-text-fill-color', 'transparent');
        startFollow(trackEl, textEl, options, stops, painter);
        return;
    }

    var gradient = buildGradientCss(options.type, options.angle, stops);

    // Phrase slicing gives every unit its own fixed background offset; a
    // shared keyframe rule would override those offsets, so animated text
    // paints a full gradient per unit instead.
    var slice = options.textMode === 'phrase' && !animated;

    if (!leaves.length) {
        paintClip(textEl, gradient, painter);
    } else if (!slice) {
        painter.style(textEl, 'color', 'transparent');
        painter.style(textEl, '-webkit-text-fill-color', 'transparent');
        leaves.forEach(function (leaf) { paintClip(leaf, gradient, painter); });
    } else {
        var parent = textEl.getBoundingClientRect();
        var width = parent.width || textEl.offsetWidth || 0;
        var height = parent.height || textEl.offsetHeight || 0;

        painter.style(textEl, 'color', 'transparent');
        painter.style(textEl, '-webkit-text-fill-color', 'transparent');

        leaves.forEach(function (leaf) {
            var rect = leaf.getBoundingClientRect();
            paintClip(leaf, gradient, painter);
            if (width > 0 && height > 0 && rect.width > 0) {
                painter.style(leaf, 'background-size', width + 'px ' + height + 'px');
                painter.style(leaf, 'background-position', (parent.left - rect.left) + 'px ' + (parent.top - rect.top) + 'px');
                painter.style(leaf, 'background-repeat', 'no-repeat');
            } else {
                painter.style(leaf, 'background-size', '100% 100%');
                painter.style(leaf, 'background-position', '0% 0%');
            }
        });
    }

    if (!animated) return;

    painter.addClass(textEl, 'aurora-gradient-text');
    painter.addClass(textEl, 'aurora-gradient-text-' + (options.animation === 'hue' ? 'hue' : 'pan'));
    painter.style(textEl, '--aurora-gradient-speed', options.speed + 's');
    if (options.animation !== 'hue') {
        painter.style(textEl, 'background-size', '300% 300%');
        leaves.forEach(function (leaf) { painter.style(leaf, 'background-size', '300% 300%'); });
    }
}
