/**
 * Aurora Text Animation — DOM / text-splitting utilities.
 *
 * Framework-free: only touches the DOM directly, no GSAP/Anime.js/Elementor
 * dependency, so this module doubles as portable reference code for the
 * future standalone (non-WordPress) showcase hub.
 */

/**
 * Returns the first meaningful text element inside the wrapper
 * (respects Elementor's native selectors).
 *
 * @param {HTMLElement} wrapper
 * @returns {HTMLElement}
 */
export function getTextTarget(wrapper) {
    var selectors = [
        '.elementor-heading-title',
        '.elementor-text-editor > *:first-child',
        '.elementor-button-text',
        '.elementor-counter-number',
        '.elementor-price-table__heading',
        '.elementor-widget-container > h1',
        '.elementor-widget-container > h2',
        '.elementor-widget-container > h3',
        '.elementor-widget-container > h4',
        '.elementor-widget-container > h5',
        '.elementor-widget-container > h6',
        '.elementor-widget-container > p',
    ];

    for (var i = 0; i < selectors.length; i++) {
        var el = wrapper.querySelector(selectors[i]);
        var text = (el ? (el.innerText || el.textContent) : '') || '';
        if (el && text.trim()) return el;
    }
    return wrapper;
}

/**
 * Splits the element into spans by character.
 *
 * @param {HTMLElement} el
 * @returns {HTMLElement[]}
 */
export function splitIntoChars(el) {
    // Use textContent (not innerText) so CSS text-transform on the parent
    // (uppercase, capitalize, etc.) is NOT baked into the split text.
    // The CSS property is still inherited by the child spans, so the visual
    // result is identical — but the underlying text stays as authored.
    var text = el.textContent;
    el.setAttribute('aria-label', text);

    var words = text.split(' ');
    var chars = [];
    el.innerHTML = '';

    words.forEach(function (word, wi) {
        var wordWrap = document.createElement('span');
        wordWrap.style.cssText = 'display:inline-block;white-space:nowrap;';
        wordWrap.setAttribute('aria-hidden', 'true');

        Array.from(word).forEach(function (char) {
            var span = document.createElement('span');
            span.className = 'aurora-char';
            span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
            span.textContent = char;
            wordWrap.appendChild(span);
            chars.push(span);
        });

        el.appendChild(wordWrap);

        if (wi < words.length - 1) {
            // non-breaking space between words to preserve spacing
            var space = document.createElement('span');
            space.style.display = 'inline-block';
            space.innerHTML = '&nbsp;';
            el.appendChild(space);
        }
    });

    return chars;
}

/**
 * Splits the element into spans by word.
 *
 * @param {HTMLElement} el
 * @returns {HTMLElement[]}
 */
export function splitIntoWords(el) {
    // Use textContent (not innerText) to preserve original case when
    // the parent has CSS text-transform applied.
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = '';

    // Trailing separator is U+00A0 (non-breaking space), not an ASCII
    // space. Regular whitespace at the trailing edge of an inline-block
    // span is treated as collapsible by the browser: once an effect
    // touches the span (transform, letter-spacing, opacity …) the browser
    // can decide to drop the trailing whitespace altogether, producing
    // the "all words glued together" regression the user reported. NBSP
    // never collapses.
    return text.split(/\s+/).filter(Boolean).map(function (word, i, arr) {
        var span = document.createElement('span');
        span.className = 'aurora-word';
        span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = word + (i < arr.length - 1 ? '\u00A0' : '');
        el.appendChild(span);
        return span;
    });
}

/**
 * Splits the element into spans by line (measures offsetTop to group them).
 *
 * @param {HTMLElement} el
 * @returns {HTMLElement[]}
 */
export function splitIntoLines(el) {
    // Use textContent (not innerText) to preserve original case when
    // the parent has CSS text-transform applied.
    var text = el.textContent;
    el.setAttribute('aria-label', text);

    // Step 1: create temporary word spans to measure line breaks.
    var words = text.split(/\s+/).filter(Boolean);
    el.innerHTML = '';

    var wordSpans = words.map(function (word, i, arr) {
        var span = document.createElement('span');
        span.style.cssText = 'display:inline-block;';
        span.textContent = word + (i < arr.length - 1 ? '\u00A0' : '');
        el.appendChild(span);
        return span;
    });

    // Step 2: group by offsetTop.
    var lineMap = {};
    wordSpans.forEach(function (span) {
        var top = span.offsetTop;
        if (!lineMap[top]) lineMap[top] = [];
        lineMap[top].push(span);
    });

    // Step 3: rebuild with line wrappers.
    el.innerHTML = '';
    var lines = [];

    Object.keys(lineMap).sort(function (a, b) { return a - b; }).forEach(function (top) {
        var lineWrap = document.createElement('div');
        lineWrap.style.cssText = 'overflow:hidden;display:block;';
        lineWrap.className = 'aurora-line-wrap';

        var lineInner = document.createElement('div');
        lineInner.style.cssText = 'display:inline-block;will-change:transform,opacity;';
        lineInner.className = 'aurora-line';
        lineInner.setAttribute('aria-hidden', 'true');

        lineMap[top].forEach(function (s) { lineInner.appendChild(s); });
        lineWrap.appendChild(lineInner);
        el.appendChild(lineWrap);
        lines.push(lineInner);
    });

    return lines;
}

/**
 * Dispatches the correct split according to `by`.
 *
 * @param {HTMLElement} el
 * @param {string} by  'chars' | 'words' | 'lines'
 * @returns {HTMLElement[]}
 */
export function splitText(el, by) {
    switch (by) {
        case 'words': return splitIntoWords(el);
        case 'lines': return splitIntoLines(el);
        default: return splitIntoChars(el);
    }
}
