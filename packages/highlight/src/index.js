import { defineModule } from '@aurora/core';
import { schema, themeOptions } from './schema.js';

export { schema };

/**
 * Aurora Highlight Shapes.
 *
 * Usage:
 *   <h2 data-aurora-highlight="circle">Pick the <b>right one</b></h2>
 *   Aurora.highlight(document.querySelector('h2'), { shape: 'marker' });
 *
 * The drawing itself is the animated-headlines component; this module owns the
 * authoring surface - the attributes, the schema and therefore the builder
 * controls - so a highlight is written the same way here as every other Aurora
 * module, in plain HTML, in Webflow or through the Elementor widget.
 *
 * That component is deliberately NOT imported here. It ships as its own shared
 * script, so the modules built on it load one copy between them instead of one
 * each - and, just as importantly, this file stays free of DOM side effects so
 * the build can read the schema under Node.
 */

var ENGINE = 'via-animated-headline';

function lines(value) {
    return value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
}

/**
 * What gets drawn over, and what is left alone.
 *
 * A <b> marks the phrase to highlight, so the words around it stay put:
 * "Pick the <b>right one</b>" keeps "Pick the". Several <b> elements, or extra
 * lines in the `phrases` option, become phrases to rotate through. With no <b>
 * at all the whole element is the phrase, which is the simplest case and needs
 * no markup.
 */
function readTarget(el, options) {
    var marked = Array.prototype.slice.call(el.querySelectorAll('b'));
    var phrases = marked.map(function (node) { return node.textContent.trim(); })
        .concat(lines(options.phrases))
        .filter(Boolean);

    if (!marked.length) {
        // Without a <b> there is no way to tell which part of the text should
        // be drawn over, so the whole of it is the first phrase and any listed
        // ones follow. The text the author wrote is never silently dropped.
        var own = (el.textContent || '').trim();
        return { anchor: null, phrases: own ? [own].concat(phrases) : phrases };
    }

    return { anchor: marked, phrases: phrases };
}

export var highlight = defineModule({
    name: 'highlight',
    schema: schema,

    init: function (el, options, ctx) {
        if (typeof customElements === 'undefined' || !customElements.get(ENGINE)) {
            ctx.warn('The animated-headlines script is not on the page, so nothing will be drawn.');
            return {};
        }

        var pristineHTML = el.innerHTML;

        function build(current) {
            // Always start from the markup the author wrote: build() replaces
            // part of it, so reading the target from an already-built element
            // would compound.
            el.innerHTML = pristineHTML;

            var target = readTarget(el, current);
            if (!target.phrases.length) {
                ctx.warn('Nothing to highlight: no phrases and no text in the element.');
                return;
            }

            var host = document.createElement(ENGINE);
            host.setAttribute('animation', 'highlight');
            host.setAttribute('shape', current.shape);
            if (current.hold !== schema.options.hold.default) host.setAttribute('hold', String(current.hold));

            themeOptions.forEach(function (entry) {
                var value = current[entry.option];
                if (value) host.style.setProperty(entry.variable, value);
            });

            target.phrases.forEach(function (text, index) {
                var phrase = document.createElement('b');
                phrase.textContent = text;
                if (index) phrase.setAttribute('hidden', '');
                host.appendChild(phrase);
            });

            if (target.anchor) {
                target.anchor[0].replaceWith(host);
                target.anchor.slice(1).forEach(function (node) { node.remove(); });
            } else {
                el.innerHTML = '';
                el.appendChild(host);
            }
        }

        build(options);

        ctx.onDestroy(function () { el.innerHTML = pristineHTML; });

        return {
            // The component reads its options once, when it is connected, so a
            // changed option means a fresh element rather than an attribute
            // rewrite.
            update: function (next) { build(next); },
        };
    },
});
