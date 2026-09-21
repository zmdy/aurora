import { EFFECT_IDS, labelFor } from './effects/index.js';

/**
 * Options of the Text module.
 *
 * Attributes: `data-aurora-text="<effect>"` plus
 * `data-aurora-text-<option in kebab-case>`, e.g. `data-aurora-text-split="words"`.
 */
export var schema = {
    primary: 'effect',
    options: {
        effect: {
            type: 'enum',
            default: 'float-up',
            values: EFFECT_IDS.map(function (id) { return { value: id, label: labelFor(id) }; }),
            label: 'Effect',
            group: 'Effect',
        },
        split: {
            type: 'enum',
            default: 'chars',
            values: ['chars', 'words', 'lines'],
            label: 'Split by',
            description: 'Unit the effect animates. Effects that build their own markup ignore it.',
            group: 'Effect',
        },
        duration: { type: 'number', default: 800, min: 50, max: 10000, unit: 'ms', label: 'Duration', group: 'Timing' },
        delay: { type: 'number', default: 0, min: 0, max: 10000, unit: 'ms', label: 'Delay', group: 'Timing' },
        stagger: { type: 'number', default: 30, min: 0, max: 1000, unit: 'ms', label: 'Stagger', group: 'Timing' },
        trigger: {
            type: 'enum',
            default: 'scroll',
            values: ['scroll', 'load'],
            label: 'Trigger',
            group: 'Trigger',
        },
        threshold: {
            type: 'number',
            default: 0.2,
            min: 0,
            max: 1,
            step: 0.05,
            label: 'Visible ratio',
            description: 'Capped at 5% internally so headings above the fold always start.',
            group: 'Trigger',
            when: { trigger: 'scroll' },
        },
        replay: { type: 'boolean', default: false, label: 'Replay on every scroll', group: 'Trigger', when: { trigger: 'scroll' } },
        target: {
            type: 'selector',
            default: '',
            label: 'Text element',
            description: 'CSS selector, relative to the element, of the node holding the text. Empty uses the element itself.',
            group: 'Advanced',
        },
        hoverScatter: {
            type: 'boolean',
            default: false,
            label: 'Hover scatter',
            description: 'Units jump to random offsets on hover and settle back with an elastic ease.',
            group: 'Hover',
        },
        hoverIntensity: { type: 'number', default: 24, min: 1, max: 200, unit: 'px', label: 'Scatter intensity', group: 'Hover', when: { hoverScatter: true } },
        hoverDuration: { type: 'number', default: 350, min: 50, max: 3000, unit: 'ms', label: 'Scatter duration', group: 'Hover', when: { hoverScatter: true } },
    },
};
