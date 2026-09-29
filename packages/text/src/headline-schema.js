/** Shared by plain HTML, the docs playground and the Elementor adapter. */
export var headlineOptions = {
    mode: { type: 'enum', default: 'effects', values: ['effects', 'headline'], label: 'Text mode', group: 'Mode' },
    beforeText: { type: 'string', default: '', label: 'Before text', group: 'Headline', when: { mode: 'headline' } },
    highlightedText: { type: 'string', default: '', label: 'Highlighted text', description: 'Empty uses the original element text.', group: 'Headline', when: { mode: 'headline' } },
    afterText: { type: 'string', default: '', label: 'After text', group: 'Headline', when: { mode: 'headline' } },
    animationStyle: { type: 'enum', default: 'highlighted', values: ['highlighted', 'rotating'], label: 'Animation style', group: 'Headline', when: { mode: 'headline' } },
    animationShape: { type: 'enum', default: 'aurora-orbit', values: ['underline', 'double-underline', 'circle', 'aurora-orbit', 'aurora-wave', 'aurora-spark'], label: 'Animation shape', group: 'Headline', when: { mode: 'headline', animationStyle: 'highlighted' } },
    rotatingText: { type: 'string', default: '', ui: 'textarea', label: 'Rotating text', description: 'One phrase per line. The highlighted text is the first phrase.', group: 'Headline', when: { mode: 'headline', animationStyle: 'rotating' } },
    rotationEffect: { type: 'enum', default: 'prism-rise', values: ['prism-rise', 'comet-slide', 'split-flap', 'soft-focus'], label: 'Rotation effect', group: 'Headline', when: { mode: 'headline', animationStyle: 'rotating' } },
    headlineColor: { type: 'color', default: '#05b172', label: 'Shape color', group: 'Headline', when: { mode: 'headline', animationStyle: 'highlighted' } },
    headlineColor2: { type: 'color', default: '#7c5cff', label: 'Shape accent', group: 'Headline', when: { mode: 'headline', animationStyle: 'highlighted' } },
    strokeWidth: { type: 'number', default: 3, min: 1, max: 12, unit: 'px', label: 'Stroke width', group: 'Headline', when: { mode: 'headline', animationStyle: 'highlighted' } },
    holdDuration: { type: 'number', default: 1800, min: 300, max: 30000, unit: 'ms', label: 'Hold duration', group: 'Headline playback', when: { mode: 'headline' } },
    headlineLoop: { type: 'boolean', default: true, label: 'Loop headline', group: 'Headline playback', when: { mode: 'headline' } },
    headlineAutoplay: { type: 'boolean', default: true, label: 'Autoplay headline', group: 'Headline playback', when: { mode: 'headline' } },
    pauseOnHover: { type: 'boolean', default: true, label: 'Pause on hover / focus', group: 'Headline playback', when: { mode: 'headline' } },
};
