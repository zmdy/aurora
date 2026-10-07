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
    beforeText: {
        type: 'string',
        default: '',
        label: 'Text before',
        description: 'Plain text shown right before the highlighted term. Empty shows none.',
        group: 'Content',
    },
    highlightedText: {
        type: 'string',
        default: '',
        label: 'Highlighted text',
        description: 'The term the shape is drawn over. Empty keeps the text already in the element.',
        group: 'Content',
    },
    afterText: {
        type: 'string',
        default: '',
        label: 'Text after',
        description: 'Plain text shown right after the highlighted term. Empty shows none.',
        group: 'Content',
    },
    trigger: {
        type: 'enum',
        default: 'scroll',
        values: ['scroll', 'load'],
        label: 'Draw when',
        description: '"scroll" waits until the phrase is in sight.',
        group: 'Timing',
    },
    threshold: {
        type: 'number',
        default: 0.2,
        min: 0,
        max: 1,
        step: 0.05,
        label: 'Visible ratio',
        description: 'Capped at 5% internally, so a tall heading still draws.',
        group: 'Timing',
        when: { trigger: 'scroll' },
    },
    target: {
        type: 'selector',
        default: '',
        label: 'Text element',
        description: 'CSS selector, relative to the element, of the node holding the text. '
            + 'Empty draws over the element itself.',
        group: 'Advanced',
    },
};

// The overlay draws once, so the library's loop and dissolve knobs (hold,
// easing, fade blur) have nothing to act on here.
var DRAWN_BY_OVERLAY = ['--ah-highlight-color', '--ah-highlight-width', '--ah-draw-duration',
    '--ah-highlight-bleed-x', '--ah-highlight-bleed-y'];

THEME.highlight.filter(function (spec) { return DRAWN_BY_OVERLAY.indexOf(spec.variable) >= 0; }).forEach(function (spec) {
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
export var themeOptions = THEME.highlight
    .filter(function (spec) { return DRAWN_BY_OVERLAY.indexOf(spec.variable) >= 0; })
    .map(function (spec) {
    return {
        option: spec.variable.replace(/^--ah-/, '').replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }),
        variable: spec.variable,
    };
});
