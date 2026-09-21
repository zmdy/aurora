import { MESH_STYLES } from './shaders.js';

/**
 * Options of the Gradient module.
 *
 * Attributes: `data-aurora-gradient="<type>"` plus
 * `data-aurora-gradient-<option in kebab-case>`, e.g.
 * `data-aurora-gradient-stops="#ff0080;#7928ca 60;#2af598"`.
 */
export var schema = {
    primary: 'type',
    options: {
        type: {
            type: 'enum',
            default: 'linear',
            values: ['linear', 'radial', 'conic', 'mesh'],
            label: 'Type',
            description: '"mesh" renders an animated WebGL gradient and only applies to backgrounds.',
            group: 'Gradient',
        },
        target: {
            type: 'enum',
            default: 'background',
            values: ['background', 'text', 'icon'],
            label: 'Paint',
            description: 'Where the gradient is drawn: the element background, the text fill, or an icon (font or SVG).',
            group: 'Gradient',
        },
        selector: {
            type: 'selector',
            default: '',
            label: 'Target selector',
            description: 'For text and icon: the elements to paint, relative to this element. Empty paints the element itself (text) or its icons (icon).',
            group: 'Gradient',
        },
        stops: {
            type: 'string',
            default: '#7c6cff;#ff7a2f;#2af598',
            label: 'Color stops',
            description: 'Colors separated by ";", each with an optional position: "#ff0080;#7928ca 60;#2af598". A JSON array of {color, offset} is also accepted.',
            group: 'Gradient',
        },
        angle: {
            type: 'number',
            default: 135,
            min: 0,
            max: 360,
            unit: 'deg',
            label: 'Angle',
            group: 'Gradient',
        },

        animation: {
            type: 'enum',
            default: 'none',
            values: ['none', 'flow', 'hue'],
            label: 'Animation',
            description: '"flow" moves color blobs (backgrounds) or pans the gradient (text, icons); "hue" rotates the hue.',
            group: 'Animation',
        },
        speed: {
            type: 'number',
            default: 8,
            min: 1,
            max: 120,
            unit: 's',
            label: 'Cycle duration',
            group: 'Animation',
        },

        followMouse: {
            type: 'boolean',
            default: false,
            label: 'Cursor spotlight',
            description: 'A radial gradient that follows the pointer over the element.',
            group: 'Cursor',
        },
        spotlightRadius: {
            type: 'number',
            default: 600,
            min: 50,
            max: 2000,
            unit: 'px',
            label: 'Spotlight radius',
            group: 'Cursor',
        },

        textMode: {
            type: 'enum',
            default: 'phrase',
            values: ['phrase', 'letter'],
            label: 'Text gradient mode',
            description: 'For text split by the Text module: one gradient across the whole phrase, or a full gradient on every unit.',
            group: 'Text',
        },

        meshStyle: {
            type: 'enum',
            default: 'paper',
            values: MESH_STYLES,
            label: 'Mesh style',
            group: 'Mesh',
        },
        distortion: { type: 'number', default: 40, min: 0, max: 100, label: 'Distortion', group: 'Mesh' },
        swirl: { type: 'number', default: 25, min: 0, max: 100, label: 'Swirl', group: 'Mesh' },
        scale: { type: 'number', default: 1.25, min: 0.1, max: 5, step: 0.05, label: 'Scale', group: 'Mesh' },
        grain: { type: 'boolean', default: false, label: 'Film grain', group: 'Mesh' },
        grainIntensity: { type: 'number', default: 35, min: 0, max: 100, label: 'Grain intensity', group: 'Mesh' },
        liquidCursor: { type: 'boolean', default: false, label: 'Liquid cursor', group: 'Mesh' },
        cursorRadius: { type: 'number', default: 250, min: 20, max: 1000, unit: 'px', label: 'Cursor radius', group: 'Mesh' },
    },
};
