import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { accent, schema } from '../src/index.js';
import { SHAPE_NAMES } from '../src/shapes.js';

var aurora, el;

beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<h2 id="h"><em>Hand</em>-authored <svg id="manual"></svg> markup</h2>';
    el = document.getElementById('h');
    aurora = createAurora();
    aurora.register(accent);
});

afterEach(() => {
    aurora.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

function mount(options) {
    return aurora.accent(el, Object.assign({ trigger: 'load' }, options));
}

describe('accent: non-destructive mounting', () => {
    it('never touches the target\'s existing children', () => {
        var originals = Array.from(el.childNodes);
        mount();
        var kept = Array.from(el.childNodes).filter(function (n) { return originals.indexOf(n) !== -1; });
        expect(kept).toEqual(originals);
        expect(el.querySelector('em').textContent).toBe('Hand');
        expect(el.querySelector('#manual')).not.toBeNull();
        expect(el.childNodes.length).toBe(originals.length + 1);
    });

    it('appends exactly one aurora-accent svg and sets position:relative only when needed', () => {
        mount();
        expect(el.querySelectorAll('svg.aurora-accent')).toHaveLength(1);
        expect(el.style.position).toBe('relative');
    });

    it('does not override an element that already has its own position', () => {
        el.style.position = 'absolute';
        mount();
        expect(el.style.position).toBe('absolute');
    });

    it('restores the position style and removes its svg on destroy', () => {
        var instance = mount();
        expect(el.style.position).toBe('relative');
        instance.destroy();
        expect(el.querySelector('svg.aurora-accent')).toBeNull();
        expect(el.style.position).toBe('');
        expect(el.querySelector('em')).not.toBeNull();
    });
});

describe('accent: shapes', () => {
    it.each(SHAPE_NAMES)('renders %s as a single original SVG path', (shape) => {
        mount({ shape: shape });
        var paths = el.querySelectorAll('svg.aurora-accent path');
        expect(paths.length).toBeGreaterThan(0);
        expect(paths[0].getAttribute('d')).toMatch(/^M/);
    });

    it('lists every shape in the schema enum', () => {
        expect(schema.options.shape.values).toEqual(SHAPE_NAMES);
    });
});

describe('accent: triggers', () => {
    it('draws immediately on the load trigger', () => {
        mount({ trigger: 'load' });
        expect(el.querySelector('svg.aurora-accent').classList.contains('is-visible')).toBe(true);
    });

    it('waits for the scroll trigger (jsdom has no IntersectionObserver, so the pool fires on a timer)', () => {
        mount({ trigger: 'scroll' });
        expect(el.querySelector('svg.aurora-accent').classList.contains('is-visible')).toBe(false);
        vi.advanceTimersByTime(0);
        expect(el.querySelector('svg.aurora-accent').classList.contains('is-visible')).toBe(true);
    });

    it('draws on hover for the hover trigger', () => {
        mount({ trigger: 'hover' });
        expect(el.querySelector('svg.aurora-accent').classList.contains('is-visible')).toBe(false);
        el.dispatchEvent(new Event('pointerenter'));
        expect(el.querySelector('svg.aurora-accent').classList.contains('is-visible')).toBe(true);
    });

    it('only draws once even if the trigger fires again', () => {
        var instance = mount({ trigger: 'hover' });
        el.dispatchEvent(new Event('pointerenter'));
        el.dispatchEvent(new Event('pointerenter'));
        expect(el.querySelectorAll('svg.aurora-accent.is-visible')).toHaveLength(1);
        instance.destroy();
    });
});

describe('accent: options', () => {
    it('exposes duration/delay/easing as CSS custom properties instead of animating from JS', () => {
        mount({ duration: 450, delay: 90, easing: 'linear' });
        var svg = el.querySelector('svg.aurora-accent');
        expect(svg.style.getPropertyValue('--aurora-accent-duration')).toBe('450ms');
        expect(svg.style.getPropertyValue('--aurora-accent-delay')).toBe('90ms');
        expect(svg.style.getPropertyValue('--aurora-accent-easing')).toBe('linear');
    });

    it('update() rebuilds the shape with the new options', () => {
        var instance = mount({ shape: 'underline' });
        var before = el.querySelector('svg.aurora-accent path').getAttribute('d');
        instance.update(Object.assign({}, schema.options, { shape: 'zigzag', trigger: 'load', color: '#000', color2: '#000', strokeWidth: 6, duration: 700, delay: 0, easing: 'ease-out', threshold: .2, target: '' }));
        var after = el.querySelector('svg.aurora-accent path').getAttribute('d');
        expect(after).not.toBe(before);
    });

    it('respects a target selector without touching the rest of the element', () => {
        document.body.innerHTML = '<div id="wrap"><span id="inner">accent me</span><span id="other">leave me</span></div>';
        el = document.getElementById('wrap');
        mount({ target: '#inner' });
        expect(document.getElementById('inner').querySelector('svg.aurora-accent')).not.toBeNull();
        expect(document.getElementById('other').querySelector('svg.aurora-accent')).toBeNull();
    });
});

describe('accent: reduced motion', () => {
    it('renders the shape already drawn instead of animating it', () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} });
        mount({ trigger: 'load' });
        var svg = el.querySelector('svg.aurora-accent');
        expect(svg.classList.contains('is-drawn')).toBe(true);
        expect(svg.classList.contains('is-visible')).toBe(false);
    });
});
