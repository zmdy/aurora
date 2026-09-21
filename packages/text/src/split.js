/**
 * Text splitting: wraps characters, words or lines in spans so effects can
 * animate them individually. The original markup is restored by the module,
 * so nothing here needs to be reversible.
 */

var CHAR_STYLE = 'display:inline-block;will-change:transform,opacity;text-transform:none;';

function applyTransform(text, transform) {
    if (transform === 'capitalize') return text.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    return text;
}

/**
 * Splits into characters, grouped by word so lines never break mid-word.
 *
 * CSS `text-transform` is applied to the text up front and disabled on the
 * spans: with `capitalize`, every single-character span would otherwise count
 * as a word start and be upper-cased.
 */
export function splitIntoChars(el) {
    var raw = el.textContent;
    el.setAttribute('aria-label', raw);

    var transform = 'none';
    try {
        transform = window.getComputedStyle(el).textTransform || 'none';
    } catch (error) { /* not in a browser */ }

    var words = applyTransform(raw, transform).split(' ');
    var chars = [];
    el.textContent = '';

    words.forEach(function (word, index) {
        var wrap = document.createElement('span');
        wrap.style.cssText = 'display:inline-block;white-space:nowrap;text-transform:none;';
        wrap.setAttribute('aria-hidden', 'true');

        Array.from(word).forEach(function (char) {
            var span = document.createElement('span');
            span.className = 'aurora-char';
            span.style.cssText = CHAR_STYLE;
            span.textContent = char;
            wrap.appendChild(span);
            chars.push(span);
        });
        el.appendChild(wrap);

        if (index < words.length - 1) {
            var space = document.createElement('span');
            space.style.cssText = 'display:inline-block;text-transform:none;';
            space.textContent = ' ';
            el.appendChild(space);
        }
    });

    return chars;
}

/**
 * Splits into words. The separator is a non-breaking space so the browser
 * cannot collapse it once a transform is applied to the span.
 */
export function splitIntoWords(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';

    return text.split(/\s+/).filter(Boolean).map(function (word, i, all) {
        var span = document.createElement('span');
        span.className = 'aurora-word';
        span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = word + (i < all.length - 1 ? ' ' : '');
        el.appendChild(span);
        return span;
    });
}

/**
 * Splits into lines by measuring where the words wrap.
 */
export function splitIntoLines(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';

    var spans = text.split(/\s+/).filter(Boolean).map(function (word, i, all) {
        var span = document.createElement('span');
        span.style.cssText = 'display:inline-block;';
        span.textContent = word + (i < all.length - 1 ? ' ' : '');
        el.appendChild(span);
        return span;
    });

    var order = [];
    var rows = {};
    spans.forEach(function (span) {
        var top = span.offsetTop;
        if (!rows[top]) {
            rows[top] = [];
            order.push(top);
        }
        rows[top].push(span);
    });
    order.sort(function (a, b) { return a - b; });

    el.textContent = '';
    return order.map(function (top) {
        var wrap = document.createElement('div');
        wrap.className = 'aurora-line-wrap';
        wrap.style.cssText = 'overflow:hidden;display:block;';

        var line = document.createElement('div');
        line.className = 'aurora-line';
        line.style.cssText = 'display:inline-block;will-change:transform,opacity;';
        line.setAttribute('aria-hidden', 'true');

        rows[top].forEach(function (span) { line.appendChild(span); });
        wrap.appendChild(line);
        el.appendChild(wrap);
        return line;
    });
}

/**
 * @param {HTMLElement} el
 * @param {'chars'|'words'|'lines'} by
 * @returns {HTMLElement[]}
 */
export function splitText(el, by) {
    if (by === 'words') return splitIntoWords(el);
    if (by === 'lines') return splitIntoLines(el);
    return splitIntoChars(el);
}
