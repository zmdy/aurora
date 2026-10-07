import { defineModule } from '@aurora/core';
import { whenDefined } from '@aurora/engine';
import { ANIMATIONS } from '@vianetz/animated-headlines-vanilla/manifest';
import { schema, ATTRIBUTE_OPTIONS } from './schema.js';

export { schema };

var ENGINE = 'via-animated-headline';

var SPEC = {};
ANIMATIONS.forEach(function (animation) { SPEC[animation.id] = animation; });

function lines(value) {
    return value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
}

/**
 * Aurora Animated Headline.
 *
 * Usage:
 *   <h2 data-aurora-headline="rotate-1"
 *       data-aurora-headline-options='{"phrases":"pizza\nsushi\nsteak"}'>pizza</h2>
 *   Aurora.headline(document.querySelector('h2'), { effect: 'swap', phrases: 'a\nb' });
 *
 * Unlike the Highlight module, this one does mount the animated-headlines
 * component: rotating phrases needs the markup that component builds, and
 * there is no way to rotate text without owning it. The trade is that the
 * Text module cannot split the same phrase - both would be rewriting it.
 */
export var headline = defineModule({
    name: 'headline',
    schema: schema,

    init: function (el, options, ctx) {
        // A builder hands the module its widget wrapper, not the heading
        // inside it.
        var target = options.target ? el.querySelector(options.target) || el : el;
        var pristineHTML = target.innerHTML;

        function phrasesOf(current) {
            var listed = lines(current.phrases);
            if (listed.length) return listed;

            // Several <b> elements are the component's own convention; a plain
            // element simply has one phrase and nothing to rotate to.
            var marked = Array.prototype.slice.call(target.querySelectorAll('b'));
            if (marked.length) return marked.map(function (node) { return node.textContent.trim(); });

            var own = (target.textContent || '').trim();
            return own ? [own] : [];
        }

        function build(current) {
            // Start from the author's markup every time: build() replaces it,
            // so reading phrases back from a built element would compound.
            target.innerHTML = pristineHTML;

            var phrases = phrasesOf(current);
            if (!phrases.length) {
                ctx.warn('Nothing to animate: no phrases and no text in the element.');
                return;
            }

            var spec = SPEC[current.effect];
            if (!spec) {
                ctx.warn('Unknown animation "' + current.effect + '".');
                return;
            }

            var host = document.createElement(ENGINE);
            host.setAttribute('animation', current.effect);

            // Only the options this animation understands, and only when they
            // differ from what it would do anyway - the component reads its
            // own defaults, so a matching attribute is just noise in the DOM.
            ATTRIBUTE_OPTIONS.forEach(function (name) {
                if (spec.options.indexOf(name) < 0) return;

                var value = current[name];
                if (value === undefined || value === '') return;

                var fallback = (spec.defaults || {})[name];
                if (fallback === undefined) fallback = schema.options[name].default;
                if (String(value) === String(fallback)) return;

                host.setAttribute(name, String(value));
            });

            phrases.forEach(function (text, index) {
                var phrase = document.createElement('b');
                phrase.textContent = text;
                if (index) phrase.setAttribute('hidden', '');
                host.appendChild(phrase);
            });

            target.innerHTML = '';
            target.appendChild(host);
        }

        // The engine is an ES module, so it is usually defined a moment after
        // this script runs; `current` keeps whatever was asked for until then.
        var current = options;
        var ready = whenDefined(ctx, ENGINE, function () { ready = true; build(current); });

        ctx.onDestroy(function () { target.innerHTML = pristineHTML; });

        return {
            // The component reads its attributes when it connects, so a changed
            // option means a fresh element rather than an attribute rewrite.
            update: function (next) { current = next; if (ready) build(next); },
            replay: function () { if (ready) build(current); },
        };
    },
});
