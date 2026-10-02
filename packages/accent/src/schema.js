import { SHAPE_NAMES } from './shapes.js';

/**
 * Options of the Accent module.
 *
 * Attributes: `data-aurora-accent="<shape>"` plus
 * `data-aurora-accent-<option in kebab-case>`, e.g.
 * `data-aurora-accent-stroke-width="8"`.
 */
export var schema = {
    primary: 'shape',
    options: {
        shape: {
            type: 'enum',
            default: 'underline',
            values: SHAPE_NAMES,
            label: 'Shape',
            group: 'Appearance',
        },
        color: { type: 'color', default: '#ff7a2f', label: 'Color', group: 'Appearance' },
        color2: {
            type: 'color',
            default: '#ff7a2f',
            label: 'Second color',
            description: 'Blended into the first along the stroke. Equal to Color by default for a flat line.',
            group: 'Appearance',
        },
        strokeWidth: { type: 'number', default: 6, min: 1, max: 40, unit: 'px', label: 'Stroke width', group: 'Appearance' },
        duration: { type: 'number', default: 700, min: 50, max: 10000, unit: 'ms', label: 'Duration', group: 'Timing' },
        easing: {
            type: 'enum',
            default: 'ease-out',
            values: ['ease-out', 'linear', 'ease-in-out'],
            label: 'Easing',
            description: '"Ease out" reads like a pen decelerating at the end of the stroke.',
            group: 'Timing',
        },
        delay: { type: 'number', default: 0, min: 0, max: 10000, unit: 'ms', label: 'Delay', group: 'Timing' },
        trigger: {
            type: 'enum',
            default: 'scroll',
            values: ['scroll', 'load', 'hover'],
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
            description: 'Capped at 5% internally so accents above the fold still draw in.',
            group: 'Trigger',
            when: { trigger: 'scroll' },
        },
        target: {
            type: 'selector',
            default: '',
            label: 'Target element',
            description: 'CSS selector, relative to the element, of the node to decorate. Empty uses the element itself; its existing content is never touched.',
            group: 'Advanced',
        },
    },
};
