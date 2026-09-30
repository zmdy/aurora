
export var LETTER_EFFECTS = ['airport-flip', 'scramble', 'sparkles-text', 'text-reveal-wall', 'letter-swap', 'echo-clone'];
export var ROTATION_CSS = `
.aurora-headline__char{display:inline-grid;position:relative;vertical-align:baseline;white-space:pre;line-height:inherit}
.aurora-headline__glyph{grid-area:1/1;display:block;line-height:inherit}
.aurora-headline__slot{overflow:hidden}
.aurora-headline__tape{position:absolute;inset:0 0 auto;line-height:inherit;pointer-events:none}
.aurora-headline__tape>span{display:block;line-height:inherit}
.aurora-headline__echo{position:absolute;inset:0;pointer-events:none}
.aurora-headline__spark{position:absolute;width:.28em;height:.28em;right:-.1em;top:0;pointer-events:none;opacity:0}
`;

function span(className, value) {
    var node = document.createElement('span'); node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
}
export function graphemes(value) {
    return typeof Intl !== 'undefined' && Intl.Segmenter
        ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), function (s) { return s.segment; })
        : Array.from(value);
}

/** Compact, single-line adaptations: only the current phrase owns decorations. */
export function rotateLetters(node, value, options, animate) {
    var effect = options.rotationEffect;
    var chars = graphemes(value);
    // Cap the stagger budget so long headlines remain responsive.
    var stagger = Math.min(options.letterStagger, options.duration * .65 / Math.max(1, chars.length - 1));
    node.textContent = '';
    chars.forEach(function (char, i) {
        if (/\s/.test(char)) { node.appendChild(document.createTextNode(char)); return; }
        var slot = span('aurora-headline__char');
        var glyph = span('aurora-headline__glyph', char);
        slot.appendChild(glyph); node.appendChild(slot);
        var delay = i * stagger;
        if (effect === 'airport-flip') {
            glyph.style.transformOrigin = '50% 50%';
            animate(glyph, [
                { transform: 'perspective(350px) rotateX(-90deg)', opacity: 0 },
                { transform: 'perspective(350px) rotateX(14deg)', opacity: 1, offset: .7 },
                { transform: 'perspective(350px) rotateX(0)', opacity: 1 }
            ], delay);
        } else if (effect === 'scramble' || effect === 'letter-swap') {
            slot.classList.add('aurora-headline__slot');
            var tape = span('aurora-headline__tape');
            var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            var count = effect === 'scramble' ? 8 : 3;
            for (var j = 0; j < count; j++) {
                tape.appendChild(span('', j === count - 1 || effect === 'letter-swap' ? char : alphabet[Math.floor(Math.random() * alphabet.length)]));
            }
            glyph.style.visibility = 'hidden'; slot.appendChild(tape);
            animate(tape, [{ transform: 'translateY(0)' }, { transform: 'translateY(-' + (100 * (count - 1) / count) + '%)' }], delay,
                { easing: effect === 'scramble' ? 'steps(' + (count - 1) + ', end)' : 'cubic-bezier(.22,1,.36,1)' },
                function () { tape.remove(); glyph.style.visibility = ''; });
        } else if (effect === 'echo-clone') {
            [2, 1].forEach(function (layer) {
                var echo = span('aurora-headline__echo', char); echo.style.color = layer === 1 ? options.rotationColor : options.rotationColor2; slot.appendChild(echo);
                animate(echo, [{ transform: 'translateY(' + (-layer * .38) + 'em)', opacity: .35 / layer }, { transform: 'translateY(0)', opacity: 0 }], delay + layer * 35, {}, function () { echo.remove(); });
            });
            animate(glyph, [{ transform: 'translateY(-.7em)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], delay);
        } else if (effect === 'text-reveal-wall') {
            // Three small rows resolve into the central letter without resizing the heading.
            [-1, 1].forEach(function (row) {
                var echo = span('aurora-headline__echo', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[(i * 7 + (row + 1) * 3) % 26]);
                echo.style.color = options.rotationColor; slot.appendChild(echo);
                animate(echo, [{ opacity: 0, transform: 'translateY(' + row * .7 + 'em) scale(.65)' }, { opacity: .45, offset: .25 }, { opacity: 0, transform: 'translateY(0) scale(.65)' }], (chars.length - 1 - i) * stagger, {}, function () { echo.remove(); });
            });
            animate(glyph, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)' }], (chars.length - 1 - i) * stagger);
        } else if (effect === 'sparkles-text') {
            animate(glyph, [{ opacity: 0, transform: 'translateY(.16em)' }, { opacity: 1, transform: 'translateY(0)' }], delay);
            var star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            star.setAttribute('class', 'aurora-headline__spark'); star.setAttribute('viewBox', '0 0 20 20'); star.setAttribute('aria-hidden', 'true');
            var path = document.createElementNS(star.namespaceURI, 'path');
            path.setAttribute('d', 'M10 0Q11 9 20 10Q11 11 10 20Q9 11 0 10Q9 9 10 0Z'); path.setAttribute('fill', i % 2 ? options.rotationColor : options.rotationColor2);
            star.appendChild(path); slot.appendChild(star);
            animate(star, [{ opacity: 0, transform: 'scale(0) rotate(-30deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)', offset: .45 }, { opacity: 0, transform: 'scale(.2) rotate(35deg)' }], delay + options.duration * .15, {}, function () { star.remove(); });
        }
    });
}
