/**
 * Gradient string builders and the static stylesheet.
 *
 * All per-instance values (image, speed, positions) travel through CSS custom
 * properties set on the element, so a single static stylesheet serves every
 * instance and nothing accumulates when options change.
 */

var STOP_WITH_OFFSET = /^(.*?)\s+(-?\d+(?:\.\d+)?)%?$/;

/**
 * Parses the `stops` option.
 *
 * @param {string} raw "#a;#b 40;#c" or a JSON array of strings / {color, offset}.
 * @returns {Array<{color: string, offset: number|null}>}
 */
export function parseStops(raw) {
    var text = String(raw || '').trim();
    var stops = [];

    if (text.charAt(0) === '[') {
        try {
            var list = JSON.parse(text);
            if (Array.isArray(list)) {
                list.forEach(function (item) {
                    if (typeof item === 'string') stops.push(parseStopText(item));
                    else if (item && item.color) {
                        var offset = item.offset === undefined || item.offset === null || item.offset === '' ? null : parseFloat(item.offset);
                        stops.push({ color: String(item.color), offset: isNaN(offset) ? null : offset });
                    }
                });
            }
        } catch (error) {
            return [];
        }
    } else {
        text.split(';').forEach(function (part) {
            if (part.trim()) stops.push(parseStopText(part));
        });
    }

    return stops.filter(function (stop) { return stop.color; });
}

function parseStopText(text) {
    var trimmed = text.trim();
    var match = STOP_WITH_OFFSET.exec(trimmed);
    if (match && !/[(,]$/.test(match[1])) {
        return { color: match[1].trim(), offset: parseFloat(match[2]) };
    }
    return { color: trimmed, offset: null };
}

function stopsCss(stops) {
    return stops.map(function (stop) {
        return stop.offset === null ? stop.color : stop.color + ' ' + stop.offset + '%';
    }).join(', ');
}

/**
 * @param {'linear'|'radial'|'conic'} type
 * @param {number} angle
 * @param {Array} stops
 * @param {{radius: number, cx: number, cy: number}} [spot] Explicit spotlight for radial.
 */
export function buildGradientCss(type, angle, stops, spot) {
    var list = stopsCss(stops);
    if (type === 'radial') {
        if (spot) return 'radial-gradient(circle ' + spot.radius + 'px at ' + spot.cx + '% ' + spot.cy + '%, ' + list + ')';
        return 'radial-gradient(circle, ' + list + ')';
    }
    if (type === 'conic') return 'conic-gradient(from ' + angle + 'deg, ' + list + ')';
    return 'linear-gradient(' + angle + 'deg, ' + list + ')';
}

/**
 * One radial blob per stop, distributed around the center: the layers of the
 * "flow" background animation.
 */
export function buildMeshLayers(stops) {
    var count = stops.length;
    var positions = [];
    var layers = [];
    for (var i = 0; i < count; i++) {
        var rad = ((360 / count) * i * Math.PI) / 180;
        var x = 50 + 32 * Math.cos(rad);
        var y = 50 + 32 * Math.sin(rad);
        positions.push({ x: x, y: y });
        layers.push('radial-gradient(circle at ' + x.toFixed(1) + '% ' + y.toFixed(1) + '%, ' + stops[i].color + ' 0%, transparent 65%)');
    }
    return { image: layers.join(', '), positions: positions };
}

export function positionString(positions, dx, dy) {
    return positions.map(function (p) {
        return (p.x + dx).toFixed(1) + '% ' + (p.y + dy).toFixed(1) + '%';
    }).join(', ');
}

export var LEAF_SELECTOR = '.aurora-char, .aurora-word, .aurora-line';

var ANIMATED_TEXT = ['pan', 'hue'].map(function (kind) {
    var base = '.aurora-gradient-text-' + kind;
    var selector = [base, base + ' .aurora-char', base + ' .aurora-word', base + ' .aurora-line'].join(',');
    var timing = kind === 'pan' ? 'ease-in-out' : 'linear';
    return selector + '{animation:aurora-gradient-' + kind + ' var(--aurora-gradient-speed,8s) ' + timing + ' infinite}';
}).join('');

export var STYLESHEET =
    '.aurora-gradient-host{position:relative;overflow:hidden;isolation:isolate}' +
    '.aurora-gradient-bg-hue::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;' +
    'background-image:var(--aurora-gradient-image);background-size:200% 200%;' +
    'animation:aurora-gradient-hue var(--aurora-gradient-speed,8s) linear infinite}' +
    '.aurora-gradient-bg-flow::before{content:"";position:absolute;inset:-25%;z-index:-1;pointer-events:none;' +
    'background-image:var(--aurora-gradient-image);background-repeat:no-repeat;' +
    'filter:blur(var(--aurora-gradient-blur,40px));' +
    'animation:aurora-gradient-flow var(--aurora-gradient-speed,8s) ease-in-out infinite}' +
    '.aurora-gradient-text{background-repeat:no-repeat}' +
    // Makes the gradient (clipped to text on the host) show through the spans
    // that self-managed effects rebuild inside it — see paintText().
    '.aurora-gradient-text-fill *{-webkit-text-fill-color:transparent}' +
    '.aurora-gradient-icon{background-repeat:no-repeat;display:inline-block}' +
    ANIMATED_TEXT +
    '.aurora-gradient-icon-hue svg,.aurora-gradient-icon-hue i{animation:aurora-gradient-hue var(--aurora-gradient-speed,8s) linear infinite}' +
    '.aurora-gradient-icon-pan i{animation:aurora-gradient-pan var(--aurora-gradient-speed,8s) ease-in-out infinite}' +
    '.aurora-gradient-mesh-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}' +
    '@keyframes aurora-gradient-hue{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}' +
    '@keyframes aurora-gradient-flow{0%,100%{background-position:var(--aurora-gradient-pos-a)}50%{background-position:var(--aurora-gradient-pos-b)}}' +
    '@keyframes aurora-gradient-pan{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}' +
    '@media (prefers-reduced-motion:reduce){' +
    '.aurora-gradient-bg-hue::before,.aurora-gradient-bg-flow::before,' +
    '.aurora-gradient-text-pan,.aurora-gradient-text-pan *,.aurora-gradient-text-hue,.aurora-gradient-text-hue *,' +
    '.aurora-gradient-icon-hue svg,.aurora-gradient-icon-hue i,.aurora-gradient-icon-pan i{animation:none!important}}';
