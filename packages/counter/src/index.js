import { defineModule } from '@aurora/core';
import { whenDefined } from '@aurora/engine';
import { COUNTERS } from '@vianetz/animated-headlines-vanilla/manifest';
import { schema, ATTRIBUTE_OPTIONS, COUNTER_FORMATS } from './schema.js';

export { schema };

var ENGINE = 'via-animated-counter';

var SPEC = {};
COUNTERS.forEach(function (counter) { SPEC[counter.id] = counter; });

/** The component reads a date or epoch milliseconds; anything else is a typo. */
function validDate(value) {
    if (!value) return false;
    if (/^\d+$/.test(String(value))) return true;
    return !isNaN(Date.parse(String(value)));
}

/**
 * Aurora Counter.
 *
 * Usage:
 *   <div data-aurora-counter="countdown"
 *        data-aurora-counter-options='{"target":"2026-12-31T23:59"}'></div>
 *   Aurora.counter(document.querySelector('.stat'), { kind: 'progress', to: 250 });
 *
 * A clock, a countdown, a timecode or a counting number. Like the headline
 * module this mounts the animated-headlines component, which rolls only the
 * characters that actually changed.
 */
export var counter = defineModule({
    name: 'counter',
    schema: schema,

    init: function (el, options, ctx) {
        // A builder hands the module its widget wrapper, not the node holding
        // the text, so without a selector the counter would replace the widget.
        var host = options.selector ? el.querySelector(options.selector) || el : el;
        var pristineHTML = host.innerHTML;

        function build(current) {
            var spec = SPEC[current.kind];
            if (!spec) {
                ctx.warn('Unknown counter "' + current.kind + '".');
                return;
            }

            // A countdown with no date to count to would mount and then say so
            // itself, once a second. Better to say it here, once, and leave the
            // author's text alone until a date is set.
            if (current.kind === 'countdown' && !validDate(current.target)) {
                ctx.warn('A countdown needs a date to count to; set the "target" option.');
                host.innerHTML = pristineHTML;
                return;
            }

            var node = document.createElement(ENGINE);
            node.setAttribute('animation', current.kind);

            ATTRIBUTE_OPTIONS.forEach(function (name) {
                if (spec.options.indexOf(name) < 0) return;

                var value = current[name];
                if (value === undefined || value === '' || value === false) return;

                // `format` is shown as the union of every counter's choices, so
                // a value meant for another one is dropped rather than passed
                // on and rejected.
                if (name === 'format') {
                    var allowed = COUNTER_FORMATS[current.kind] || [];
                    if (allowed.indexOf(value) < 0) return;
                }

                node.setAttribute(name, value === true ? '' : String(value));
            });

            host.innerHTML = '';
            host.appendChild(node);
        }

        // The engine is an ES module, so it is usually defined a moment after
        // this script runs; `current` keeps whatever was asked for until then.
        var current = options;
        var ready = whenDefined(ctx, ENGINE, function () { ready = true; build(current); });

        ctx.onDestroy(function () { host.innerHTML = pristineHTML; });

        return {
            update: function (next) { current = next; if (ready) build(next); },
            replay: function () { if (ready) build(current); },
        };
    },
});
