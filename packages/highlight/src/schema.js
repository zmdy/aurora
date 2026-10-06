import { SHAPES, OPTIONS, THEME } from '@vianetz/animated-headlines-vanilla/manifest';

/**
 * Options of the Highlight Shapes module.
 *
 * Nothing here is written by hand: the shapes, their labels, the ranges and
 * the themable colours all come from the animated-headlines manifest. A shape
 * added to that library therefore shows up in this schema - and so in the
 * Elementor controls and the documentation tables - without a line changing
 * here.
 *
 * Attributes: `data-aurora-highlight="<shape>"` plus
 * `data-aurora-highlight-<option in kebab-case>`.
 */

/** Turns a manifest option into an Aurora schema entry. */
function fromManifest(name, overrides) {
    var spec = OPTIONS[name];
    var entry = {
        type: spec.type === 'string' ? 'string' : spec.type,
        default: spec.default,
        label: spec.label,
        group: 'Drawing',
    };
    if (spec.description) entry.description = spec.description;
    if (spec.unit) entry.unit = spec.unit;
    if (spec.min !== undefined) entry.min = spec.min;
    if (spec.max !== undefined) entry.max = spec.max;
    if (spec.values) entry.values = spec.values;
    return Object.assign(entry, overrides);
}

/**
 * The library themes itself with CSS custom properties rather than attributes,
 * so each one becomes an option here and is written back onto the element as
 * an inline custom property. The empty default means "leave the stylesheet
 * alone", which keeps the markup clean when nothing was customised.
 */
function fromTheme(spec) {
    return {
        type: spec.type === 'color' ? 'color' : 'string',
        default: '',
        label: spec.label,
        description: spec.description
            ? spec.description + ' Empty keeps ' + spec.default + '.'
            : 'Empty keeps ' + spec.default + '.',
        group: 'Appearance',
    };
}

var options = {
    shape: fromManifest('shape', {
        values: SHAPES,
        group: 'Drawing',
        description: 'Which marker is drawn over the phrase.',
    }),
    phrases: {
        type: 'string',
        default: '',
        ui: 'textarea',
        label: 'Phrases',
        description: 'One per line. More than one rotates them; a single one loops the drawing. '
            + 'Empty keeps the text already in the element.',
        group: 'Content',
    },
    hold: fromManifest('hold', { group: 'Timing' }),
};

THEME.highlight.forEach(function (spec) {
    // --ah-highlight-color -> highlightColor
    var name = spec.variable.replace(/^--ah-/, '').replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    options[name] = fromTheme(spec);
    options[name].variable = spec.variable;
});

export var schema = {
    primary: 'shape',
    options: options,
};

/** The subset of options that map onto CSS custom properties. */
export var themeOptions = THEME.highlight.map(function (spec) {
    return {
        option: spec.variable.replace(/^--ah-/, '').replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }),
        variable: spec.variable,
    };
});
