import { TEMPLATES } from './templates.js';

/**
 * Options of the Morph Card module.
 *
 * Attributes: `data-aurora-morph-card-states='[{...}]'` plus
 * `data-aurora-morph-card-<option in kebab-case>`.
 *
 * Each state describes one look of the card:
 * `{template, durationMs, transitionDurationMs, photo, caption, ...}`.
 * Templates: post, profile, polaroid, custom. See the docs for the fields
 * every template reads.
 */
export var schema = {
    options: {
        states: {
            type: 'json',
            default: [],
            label: 'States',
            description: 'JSON array of card states. The card shows them in order, morphing from one to the next.',
            group: 'Content',
        },
        loop: { type: 'boolean', default: true, label: 'Loop', group: 'Sequence' },
        autoplay: {
            type: 'boolean',
            default: true,
            label: 'Autoplay',
            description: 'Off shows the first state and waits for the API (next / goTo).',
            group: 'Sequence',
        },
        initialDelay: { type: 'number', default: 0, min: 0, max: 30000, unit: 'ms', label: 'Initial delay', group: 'Sequence' },
        captionEffect: {
            type: 'enum',
            default: 'typewriter',
            values: ['typewriter', 'letters'],
            label: 'Polaroid caption effect',
            group: 'Sequence',
        },
        float: { type: 'boolean', default: true, label: 'Floating motion', group: 'Appearance' },
        labels: {
            type: 'json',
            default: {},
            label: 'Labels',
            description: 'Overrides for the texts inside templates: likes, viewComments, posts, followers, following, follow, message, email.',
            group: 'Content',
        },
    },
};

export var TEMPLATE_NAMES = TEMPLATES;
