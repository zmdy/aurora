import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAurora } from '@aurora/core';
import { text, schema } from '../src/index.js';

afterEach(() => {
    window.Aurora?.destroy();
    delete window.Aurora; delete window.AuroraElementor;
    delete window.elementorFrontend; delete window.elementorModules;
    vi.restoreAllMocks();
});

describe('Elementor headline live preview', () => {
    it('uses the generic Text runtime on init and on content/style control changes', () => {
        document.body.innerHTML = '<div id="widget"><h2 class="aurora-headline-heading">Fallback</h2></div>';
        const node = document.getElementById('widget');
        window.Aurora = createAurora(); window.Aurora.register(text);
        window.AuroraElementor = { schemas: { text: schema }, targets: {} };
        let settings = { beforeText: 'Make', highlightedText: 'waves', afterText: 'today', animationStyle: 'highlighted', animationShape: 'aurora-wave', headlineAutoplay: '' };
        let callback, handler;
        function Base(args) { this.$element = args.$element; }
        Base.prototype.onInit = function () {};
        Base.prototype.getElementSettings = function () { return settings; };
        window.elementorModules = { frontend: { handlers: { Base } } };
        window.elementorFrontend = {
            hooks: { addAction(name, cb) { callback = cb; } },
            elementsHandler: { addHandler(Handler, args) { handler = new Handler(args); handler.onInit(); } },
        };
        window.eval(readFileSync('adapters/elementor/assets/js/elementor-adapter.js', 'utf8'));
        const $element = { 0: node, data(key) { return key === 'widget_type' ? 'aurora-animated-headline.default' : 'widget'; } };
        callback($element);
        expect(node.querySelector('.aurora-headline__word').textContent).toBe('waves');
        expect(node.querySelectorAll('svg path')).toHaveLength(2);
        settings = { ...settings, highlightedText: 'ideas', rotatingText: 'moments\nmemories', animationStyle: 'rotating' };
        handler.onElementChange('animationStyle');
        expect(node.querySelectorAll('.aurora-headline')).toHaveLength(1);
        expect(node.querySelectorAll('.aurora-headline__word')).toHaveLength(3);
        expect(node.querySelector('svg')).toBeNull();
        settings = { ...settings, highlightedText: '<b>literal</b>' };
        handler.onElementChange('highlightedText');
        expect(node.querySelector('b')).toBeNull();
        expect(node.querySelector('.aurora-headline__word').textContent).toBe('<b>literal</b>');
    });
});
