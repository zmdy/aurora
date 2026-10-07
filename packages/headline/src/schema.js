import { ANIMATIONS, OPTIONS } from '@vianetz/animated-headlines-vanilla/manifest';

/**
 * Options of the Animated Headline module.
 *
 * Nothing here is a hand-kept list: the animations, their labels, the options
 * each one understands and the ranges all come from the animated-headlines
 * manifest. An effect added to that library appears in this schema - and so in
 * the Elementor controls and the documentation tables - without a line
 * changing here.
 *
 * Attributes: `data-aurora-headline="<effect>"` plus
 * `data-aurora-headline-<option in kebab-case>`.
 */

/** Which animations use a given option, so controls can be shown only for those. */
function usedBy(option) {
    return ANIMATIONS.filter(function (animation) {
        return animation.options.indexOf(option) >= 0;
    }).map(function (animation) { return animation.id; });
}

/**
 * Defaults differ per animation (clip sweeps for 600ms where the letter
 * effects stagger by 50), so the schema carries the most common value and the
 * module applies the animation's own when it builds.
 */
function commonDefault(option) {
    var counts = {};
    var best = OPTIONS[option].default;
    var top = 0;

    ANIMATIONS.forEach(function (animation) {
        if (animation.options.indexOf(option) < 0) return;
        var value = (animation.defaults || {})[option];
        if (value === undefined) value = OPTIONS[option].default;
        counts[value] = (counts[value] || 0) + 1;
        if (counts[value] > top) { top = counts[value]; best = value; }
    });

    return best;
}

/** Manifest types Aurora's schema has no notion of, carried as the nearest one. */
var TYPES = { datetime: 'string' };

var GROUPS = {
    hold: 'Timing',
    delay: 'Timing',
    selection: 'Timing',
    erase: 'Timing',
    speed: 'Timing',
    tick: 'Timing',
    steps: 'Effect',
    charset: 'Effect',
    sparkles: 'Effect',
    shape: 'Effect',
};

var options = {
    effect: {
        type: 'enum',
        default: 'rotate-1',
        values: ANIMATIONS.map(function (animation) {
            return { value: animation.id, label: animation.label };
        }),
        label: 'Animation',
        group: 'Effect',
    },
    phrases: {
        type: 'string',
        default: '',
        ui: 'textarea',
        label: 'Phrases',
        description: 'One per line. The first is shown first; the rest rotate. '
            + 'Empty keeps the text already in the element, which then has nothing to rotate to.',
        group: 'Content',
    },
    beforeText: {
        type: 'string',
        default: '',
        label: 'Text before',
        description: 'Plain text shown right before the rotating phrase, like "This page is" '
            + 'in front of a rotating word. Empty shows none.',
        group: 'Content',
    },
    afterText: {
        type: 'string',
        default: '',
        label: 'Text after',
        description: 'Plain text shown right after the rotating phrase. Empty shows none.',
        group: 'Content',
    },
    target: {
        type: 'selector',
        default: '',
        label: 'Text element',
        description: 'CSS selector, relative to the element, of the node holding the text. '
            + 'Empty uses the element itself.',
        group: 'Advanced',
    },
};

// Every option any animation understands, shown only for the ones that do.
Object.keys(OPTIONS).forEach(function (name) {
    var used = usedBy(name);
    if (!used.length) return;

    var spec = OPTIONS[name];
    var entry = {
        type: TYPES[spec.type] || spec.type,
        default: commonDefault(name),
        label: spec.label,
        group: GROUPS[name] || 'Effect',
        when: { effect: used },
    };
    if (spec.description) entry.description = spec.description;
    if (spec.unit) entry.unit = spec.unit;
    if (spec.min !== undefined) entry.min = spec.min;
    if (spec.max !== undefined) entry.max = spec.max;
    if (spec.values && spec.values.length) entry.values = spec.values;
    if (spec.multiline) entry.ui = 'textarea';

    options[name] = entry;
});

export var schema = {
    primary: 'effect',
    options: options,
};

/** Option ids that are passed to the component as attributes. */
export var ATTRIBUTE_OPTIONS = Object.keys(OPTIONS).filter(function (name) {
    return usedBy(name).length > 0;
});
