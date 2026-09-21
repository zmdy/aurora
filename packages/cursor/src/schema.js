/**
 * Options of the Cursor Follow module.
 *
 * Attributes: `data-aurora-cursor` (presence activates the zone) plus
 * `data-aurora-cursor-<option in kebab-case>`, e.g. `data-aurora-cursor-ring-size`.
 */
export var schema = {
    options: {
        dotColor: {
            type: 'color',
            default: '#ff7a2f',
            label: 'Dot color',
            group: 'Appearance',
        },
        ringColor: {
            type: 'color',
            default: '#7c6cff',
            label: 'Ring color',
            group: 'Appearance',
        },
        dotSize: {
            type: 'number',
            default: 8,
            min: 2,
            max: 64,
            unit: 'px',
            label: 'Dot size',
            group: 'Appearance',
        },
        ringSize: {
            type: 'number',
            default: 24,
            min: 4,
            max: 200,
            unit: 'px',
            label: 'Ring size',
            group: 'Appearance',
        },
        trailDelay: {
            type: 'number',
            default: 150,
            min: 0,
            max: 1000,
            unit: 'ms',
            label: 'Ring trail delay',
            description: 'Approximate time the ring takes to catch up with the dot. 0 makes it follow instantly.',
            group: 'Motion',
        },
        interactiveSelector: {
            type: 'selector',
            default: 'a, button, .cursor-pointer',
            label: 'Interactive elements',
            description: 'CSS selector for elements that shrink the dot and scale the ring on hover.',
            group: 'Hover states',
        },
        interactiveScale: {
            type: 'number',
            default: 1.5,
            min: 0.5,
            max: 5,
            step: 0.01,
            label: 'Interactive ring scale',
            group: 'Hover states',
        },
        imageSelector: {
            type: 'selector',
            default: 'img, .zoom-target',
            label: 'Image elements',
            description: 'CSS selector for elements that grow the ring and tint it with the dot color on hover.',
            group: 'Hover states',
        },
        imageScale: {
            type: 'number',
            default: 2.33,
            min: 0.5,
            max: 5,
            step: 0.01,
            label: 'Image ring scale',
            group: 'Hover states',
        },
        hideNative: {
            type: 'boolean',
            default: false,
            label: 'Hide the native cursor',
            description: 'Hides the system cursor inside the zone (except over form fields). Off by default for accessibility.',
            group: 'Accessibility',
        },
    },
};
