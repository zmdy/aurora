import { COUNTERS, COUNTER_FORMATS, OPTIONS } from '@vianetz/animated-headlines-vanilla/manifest';

/**
 * Options of the Counter module.
 *
 * As with the other modules built on animated-headlines, the kinds of counter,
 * the options each one takes and their ranges are read from the library
 * manifest rather than kept by hand here.
 *
 * Attributes: `data-aurora-counter="<kind>"` plus
 * `data-aurora-counter-<option in kebab-case>`.
 */

/**
 * The manifest describes a few types Aurora's schema has no notion of
 * (`datetime`), so they are carried as the nearest one it does know and the
 * component parses the value as before.
 */
var TYPES = { datetime: 'string' };

function auroraType(type) {
    return TYPES[type] || type;
}

function usedBy(option) {
    return COUNTERS.filter(function (counter) {
        return counter.options.indexOf(option) >= 0;
    }).map(function (counter) { return counter.id; });
}

var GROUPS = {
    target: 'Content',
    start: 'Content',
    from: 'Content',
    to: 'Content',
    prefix: 'Content',
    suffix: 'Content',
    format: 'Display',
    timezone: 'Display',
    locale: 'Display',
    decimals: 'Display',
    bar: 'Display',
    fps: 'Timing',
    duration: 'Timing',
    paused: 'Timing',
    trigger: 'Timing',
};

var options = {
    kind: {
        type: 'enum',
        default: 'progress',
        values: COUNTERS.map(function (counter) {
            return { value: counter.id, label: counter.label };
        }),
        label: 'Counter',
        group: 'Counter',
    },
    // The manifest's `target` is the countdown's date, so the node the counter
    // is mounted into is named the way the rest of Aurora names selectors.
    selector: {
        type: 'selector',
        default: '',
        label: 'Text element',
        description: 'CSS selector, relative to the element, of the node the counter replaces. '
            + 'Empty uses the element itself.',
        group: 'Advanced',
    },
};

Object.keys(OPTIONS).forEach(function (name) {
    var used = usedBy(name);
    if (!used.length) return;

    var spec = OPTIONS[name];
    var entry = {
        type: auroraType(spec.type),
        default: spec.default === undefined ? '' : spec.default,
        label: spec.label,
        group: GROUPS[name] || 'Counter',
        when: { kind: used },
    };
    if (spec.description) entry.description = spec.description;
    if (spec.unit) entry.unit = spec.unit;
    if (spec.min !== undefined) entry.min = spec.min;
    if (spec.max !== undefined) entry.max = spec.max;
    if (spec.values && spec.values.length) entry.values = spec.values;

    options[name] = entry;
});

// `format` means something different for each counter, so it is offered as the
// union and the module only passes it on when the chosen counter knows it.
// Empty is one of the choices, not the absence of one: it leaves the counter
// to its own default, and the schema would otherwise reject the value it ships
// with.
options.format.values = Object.keys(COUNTER_FORMATS).reduce(function (all, counter) {
    COUNTER_FORMATS[counter].forEach(function (value) {
        if (all.every(function (entry) { return entry.value !== value; })) {
            all.push({ value: value, label: value });
        }
    });
    return all;
}, [{ value: '', label: 'Default' }]);
options.format.default = '';
// Spelled out from the manifest rather than by hand, so it cannot describe
// choices a counter has stopped understanding.
options.format.description = Object.keys(COUNTER_FORMATS).map(function (counter) {
    return counter + ' takes ' + COUNTER_FORMATS[counter].join(', ');
}).join('; ') + '. Empty leaves each one its own.';

// An empty enum value is a real choice, not a blank line in the select: it
// hands the decision back to the counter.
options.direction.values = options.direction.values.map(function (value) {
    return { value: value, label: value || 'Follow the value' };
});

export var schema = {
    primary: 'kind',
    options: options,
};

export { COUNTER_FORMATS };

/** Option ids passed through to the component as attributes. */
export var ATTRIBUTE_OPTIONS = Object.keys(OPTIONS).filter(function (name) {
    return usedBy(name).length > 0;
});
