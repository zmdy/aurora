/**
 * Inline SVG icons (24x24, stroke based). They inherit `currentColor`, so a
 * card needs no icon font and no network request.
 */

var PATHS = {
    heart: '<path d="M12 20.5s-7.5-4.7-9.4-9.4A5.2 5.2 0 0 1 12 6.2a5.2 5.2 0 0 1 9.4 4.9c-1.9 4.7-9.4 9.4-9.4 9.4z"/>',
    comment: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.5A8.5 8.5 0 1 1 20.5 12z"/>',
    send: '<path d="M21.5 2.5 10.5 13.5"/><path d="M21.5 2.5 14.5 21.5l-4-8-8-4z"/>',
    bookmark: '<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>',
    ellipsis: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
    video: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m10 9.2 5 2.8-5 2.8z"/>',
};

/**
 * @param {string} name   One of the icon names above.
 * @param {string} [className]
 * @param {boolean} [filled]
 * @returns {string} SVG markup.
 */
export function icon(name, className, filled) {
    var body = PATHS[name] || '';
    return '<svg class="amc-icon' + (className ? ' ' + className : '') + '" viewBox="0 0 24 24" width="1em" height="1em" ' +
        'fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
}
